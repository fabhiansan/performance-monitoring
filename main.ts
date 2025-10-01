import { app, BrowserWindow, dialog, shell } from 'electron';
import type { MessageBoxOptions, MessageBoxReturnValue, MessageBoxSyncOptions } from 'electron';
import { fork, spawn } from 'child_process';
import type { ChildProcess, ForkOptions, SpawnOptions } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from './services/logger';

// Constants for repeated string literals
const SERVER_READY_TYPE = 'server-ready';
const DATABASE_ERROR_TYPE = 'database-error';
const SERVER_STARTUP_ERROR_TYPE = 'server-startup-error';
const ELECTRON_RUN_AS_NODE = 'ELECTRON_RUN_AS_NODE';
const PERFORMANCE_ANALYZER_SERVER_RUNNING = 'Performance Analyzer API server running';
const UNPACKED_PATH = '.unpacked';
const SERVER_FILES_ERROR_MESSAGE = 'Cannot locate server files required to start the application.\n\nThis is typically caused by:\n• Incorrect packaging configuration\n• Missing asar.unpacked settings\n• Corrupted installation\n\nTechnical details:\n';
const TROUBLESHOOTING_URL = 'https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/troubleshooting.md';
const OPEN_DOCUMENTATION = 'Open Documentation';

interface ServerPathConfig {
  serverPath: string;
  cwd: string;
  description: string;
}

type KnownServerTypes = typeof SERVER_READY_TYPE | typeof DATABASE_ERROR_TYPE | typeof SERVER_STARTUP_ERROR_TYPE;

interface DatabaseErrorDetails {
  type: string;
  description: string;
  solution: string;
}

interface DatabaseErrorMessage {
  type: typeof DATABASE_ERROR_TYPE;
  details: DatabaseErrorDetails;
}

interface ServerStartupErrorMessage {
  type: typeof SERVER_STARTUP_ERROR_TYPE;
  message: string;
}

interface ServerReadyMessage {
  type: typeof SERVER_READY_TYPE;
  port?: number;
}

interface GenericServerMessage {
  type: Exclude<string, KnownServerTypes>;
  message?: string;
  [key: string]: unknown;
}

type ServerMessage = ServerReadyMessage | DatabaseErrorMessage | ServerStartupErrorMessage | GenericServerMessage;

const isServerReadyMessage = (message: ServerMessage): message is ServerReadyMessage =>
  message.type === SERVER_READY_TYPE;

const isDatabaseErrorMessage = (message: ServerMessage): message is DatabaseErrorMessage =>
  message.type === DATABASE_ERROR_TYPE;

const isServerStartupErrorMessage = (message: ServerMessage): message is ServerStartupErrorMessage =>
  message.type === SERVER_STARTUP_ERROR_TYPE;

const isGenericServerMessage = (message: ServerMessage): message is GenericServerMessage =>
  message.type !== SERVER_READY_TYPE &&
  message.type !== DATABASE_ERROR_TYPE &&
  message.type !== SERVER_STARTUP_ERROR_TYPE;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ElectronApp {
  private mainWindow: BrowserWindow | null;
  private serverProcess: ChildProcess | null;
  private serverReady: boolean;
  private serverPort: number;

  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.serverReady = false;
    this.serverPort = 3002; // Updated to match server.js default port
  }

  private showMessageBoxSync(options: MessageBoxSyncOptions): number {
    return this.mainWindow
      ? dialog.showMessageBoxSync(this.mainWindow, options)
      : dialog.showMessageBoxSync(options);
  }

  private showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
    return this.mainWindow
      ? dialog.showMessageBox(this.mainWindow, options)
      : dialog.showMessageBox(options);
  }

  createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173'); // Vite dev server
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile('dist/index.html');
    }
  }

  /**
   * Generate potential server paths based on app configuration
   * @returns {Array} Array of path configuration objects
   */
  generateServerPaths(): ServerPathConfig[] {
    const appPath = app.getAppPath();
    const unpackedAppPath = appPath + UNPACKED_PATH;
    
    return [
      // Primary: Modern TypeScript server entry point (universal)
      {
        serverPath: path.join(unpackedAppPath, 'server-entry.cjs'),
        cwd: unpackedAppPath,
        description: 'Universal server entry (TypeScript-aware)'
      },
      // Secondary: Built TypeScript Fastify server
      {
        serverPath: path.join(unpackedAppPath, 'build', 'node', 'server', 'fastify.js'),
        cwd: path.join(unpackedAppPath, 'build', 'node', 'server'),
        description: 'Built TypeScript Fastify server'
      },
      // Tertiary: Resources path with universal entry
      {
        serverPath: path.join(process.resourcesPath, 'app.asar.unpacked', 'server-entry.cjs'),
        cwd: path.join(process.resourcesPath, 'app.asar.unpacked'),
        description: 'Resources path with universal entry'
      },
      // Quaternary: Legacy Express server fallback
      {
        serverPath: path.join(unpackedAppPath, 'server', 'server.js'),
        cwd: path.join(unpackedAppPath, 'server'),
        description: 'Legacy Express server fallback'
      },
      // Development: Universal entry
      {
        serverPath: path.join(__dirname, 'server-entry.cjs'),
        cwd: __dirname,
        description: 'Development universal entry'
      },
      // Development: TypeScript direct
      {
        serverPath: path.join(__dirname, 'server', 'fastify.ts'),
        cwd: path.join(__dirname, 'server'),
        description: 'Development TypeScript direct'
      }
    ];
  }

  /**
   * Resolve database path based on app packaging status
   * @returns {string} Resolved database path
   */
  resolveDatabasePath(): string {
    const isPackaged = app.isPackaged;
    
    logger.debug('Resolving database path', { isPackaged });
    
    let databasePath;
    
    if (isPackaged) {
      // For packaged apps, use userData directory for writable location
      const userDataPath = app.getPath('userData');
      const databaseDir = path.join(userDataPath, 'database');
      databasePath = path.join(databaseDir, 'performance_analyzer.db');
      
      logger.debug('Using userData directory for database', { 
        userDataPath, 
        databaseDir 
      });
      
      // Ensure database directory exists
      try {
        if (!fs.existsSync(databaseDir)) {
          fs.mkdirSync(databaseDir, { recursive: true });
          logger.info('Created database directory', { databaseDir });
        }
        
        // Validate directory is writable
        fs.accessSync(databaseDir, fs.constants.W_OK);
        logger.debug('Database directory is writable', { databaseDir });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const pathError = new Error(`Failed to create or access database directory: ${databaseDir}. ${errorMessage}`);
        logger.error('Database path error', { 
          error: pathError.message,
          databaseDir 
        });
        throw pathError;
      }
    } else {
      // For development, use the current working directory
      databasePath = path.join(process.cwd(), 'server', 'performance_analyzer.db');
      logger.info('Development mode - using current directory', { databasePath });
    }
    
    logger.info('Final database path resolved', { databasePath });
    return databasePath;
  }

  /**
   * Validate a server path configuration
   * @param {Object} pathConfig - Path configuration object
   * @returns {boolean} True if path is valid, false otherwise
   */
  validateServerPath(pathConfig: ServerPathConfig): boolean {
    logger.debug('Checking server path', { description: pathConfig.description, serverPath: pathConfig.serverPath });
    
    try {
      if (fs.existsSync(pathConfig.serverPath)) {
        const stats = fs.statSync(pathConfig.serverPath);
        if (stats.isFile()) {
          logger.info('Found valid server file', { serverPath: pathConfig.serverPath, workingDirectory: pathConfig.cwd });
          return true;
        } else {
          logger.warn('Path exists but is not a file', { serverPath: pathConfig.serverPath });
        }
      } else {
        logger.warn('Path does not exist', { serverPath: pathConfig.serverPath });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error accessing server path', { serverPath: pathConfig.serverPath, error: errorMessage });
    }
    
    return false;
  }

  resolveServerPath(): ServerPathConfig {
    const isPackaged = app.isPackaged;
    const appPath = app.getAppPath();
    
    logger.info('Resolving server path', { isPackaged });
    logger.debug('App paths', { 
      appPath, 
      resourcesPath: process.resourcesPath, 
      dirname: __dirname 
    });
    
    // Generate potential server paths
    const serverPaths = this.generateServerPaths();
    
    // Try each path in order
    for (const pathConfig of serverPaths) {
      if (this.validateServerPath(pathConfig)) {
        return pathConfig;
      }
    }
    
    // If we get here, no valid path was found
    const errorDetails = {
      appPath,
      resourcesPath: process.resourcesPath,
      dirname: __dirname,
      isPackaged,
      attemptedPaths: serverPaths.map(p => p.serverPath)
    };
    
    throw new Error(`No valid server path found. Attempted paths: ${JSON.stringify(errorDetails, null, 2)}`);
  }

  async startServer(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      logger.info('Starting backend server');
      
      try {
        const pathConfig = this.resolveServerPath();
        const { serverPath, cwd } = pathConfig;
        const isPackaged = app.isPackaged;
        
        logger.info('Starting server with resolved configuration', { 
          serverPath, 
          workingDirectory: cwd 
        });
        
        // Resolve database path and add to environment
        const databasePath = this.resolveDatabasePath();
        
        const baseEnv: Record<string, string> = {
          ...process.env,
          PORT: String(this.serverPort),
          DB_PATH: databasePath
        };

        const forkOptions: ForkOptions = {
          cwd,
          env: baseEnv,
          silent: true
        };

        if (isPackaged) {
          forkOptions.execPath = process.execPath;
          forkOptions.env = {
            ...baseEnv,
            [ELECTRON_RUN_AS_NODE]: '1'
          };
        }

        // Final validation before fork
        if (!fs.existsSync(serverPath)) {
          const error = new Error(`Server file not found at resolved path: ${serverPath}`);
          logger.error('Final validation failed', { error: error instanceof Error ? error.message : String(error) });
          reject(error);
          return;
        }

        // Start the server.js file
        if (isPackaged && process.platform === 'win32') {
          // For Windows packaged apps, use spawn with Node.js to run ES modules
          const nodeExePath = process.execPath;
          logger.debug('Windows spawn configuration', { nodeExePath, serverPath });
          
          const spawnOptions: SpawnOptions = {
            cwd: forkOptions.cwd,
            env: {
              ...(forkOptions.env ?? baseEnv),
              [ELECTRON_RUN_AS_NODE]: '1'
            },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'], // Add IPC for better communication
            shell: false
          };

          this.serverProcess = spawn(nodeExePath, [serverPath], spawnOptions);
          
          // Listen for IPC messages on Windows spawn
          this.serverProcess.on('message', (message: ServerMessage) => {
            logger.debug('Received IPC message', { message });
            if (isServerReadyMessage(message)) {
              this.serverReady = true;
              this.serverPort = message.port ?? this.serverPort;
              logger.info('Backend server is ready via IPC', { port: this.serverPort });
              resolve();
            }
          });
        } else {
          // For development and other platforms, use fork for better integration
          this.serverProcess = fork(serverPath, [], forkOptions);
          
          // Listen for IPC messages from fork
          this.serverProcess.on('message', (message: ServerMessage) => {
            logger.debug('Received fork message', { message });
            if (isServerReadyMessage(message)) {
              this.serverReady = true;
              this.serverPort = message.port ?? this.serverPort;
              logger.info('Backend server is ready via fork IPC', { port: this.serverPort });
              resolve();
            }
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to initialize server', { error: err instanceof Error ? err.message : String(err) });
        
        // Check if this is a database path error
        if (err.message.includes('database directory')) {
          this.showDatabasePathError(err);
        } else {
          this.showServerPathError(err);
        }
        reject(err);
        return;
      }

      const serverProcess = this.serverProcess;
      if (!serverProcess) {
        reject(new Error('Server process failed to start.'));
        return;
      }

      let errorBuffer = '';

      const stdout = serverProcess.stdout as Readable | null;
      const stderr = serverProcess.stderr as Readable | null;

      stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        
        try {
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{')) {
              const message = JSON.parse(line);
              if (message.type === SERVER_READY_TYPE) {
                this.serverReady = true;
                this.serverPort = message.port || this.serverPort;
                logger.info('Backend server is ready', { port: this.serverPort });
                resolve();
              }
            }
          }
        } catch {
          // Not JSON, regular log output
          logger.debug('Server output', { output });
          
          // Also check for the regular server startup message
          if (output.includes(PERFORMANCE_ANALYZER_SERVER_RUNNING)) {
            this.serverReady = true;
            logger.info('Backend server is ready (detected from log)');
            resolve();
          }
        }
      });

      stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        errorBuffer += error;
        
        try {
          const lines = error.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{')) {
              const errorMessage = JSON.parse(line);
              this.handleServerError(errorMessage);
            }
          }
        } catch {
          logger.error('Server error', { error });
        }
      });

      serverProcess.on('exit', (code: number | null) => {
        logger.info('Server process exited', { code });
        
        if (code === 1 && !this.serverReady) {
          this.showServerExitError(code, errorBuffer);
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Increased timeout for slow systems and first-time DB creation
      setTimeout(() => {
        if (!this.serverReady) {
          logger.error('Server startup timeout after 60 seconds');
          reject(new Error('Server startup timeout - this may be due to slow disk I/O, antivirus scanning, or native module issues'));
        }
      }, 60000);
    });
  }

  handleServerError(errorMessage: ServerMessage): void {
    logger.error('Structured server error', { error: errorMessage });
    
    if (isDatabaseErrorMessage(errorMessage)) {
      this.showDatabaseError(errorMessage.details);
    } else if (isServerStartupErrorMessage(errorMessage)) {
      this.showServerStartupError(errorMessage);
    } else if (isGenericServerMessage(errorMessage)) {
      this.showGenericServerError(errorMessage);
    } else if (isServerReadyMessage(errorMessage)) {
      logger.info('Server ready message received during error handling context');
    }
  }

  showDatabaseError(errorDetails: DatabaseErrorDetails): void {
    const { description, solution } = errorDetails;
    
    const message = `Database Error: ${description}\n\nSuggested Solution: ${solution}\n\nThis is typically caused by native module compilation issues.`;
    
    const response = this.showMessageBoxSync({
      type: 'error',
      title: 'Database Initialization Failed',
      message: 'Server Exit Error',
      detail: message,
      buttons: ['Open Troubleshooting Guide', 'Retry', 'Exit'],
      defaultId: 1,
      cancelId: 2
    });

    switch (response) {
      case 0: // Open troubleshooting guide
        shell.openExternal(TROUBLESHOOTING_URL);
        break;
      case 1: // Retry
        this.restartServer();
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerStartupError(errorMessage: ServerStartupErrorMessage): void {
    const message = `Server startup failed: ${errorMessage.message}\n\nThis could be due to:\n- Native module compilation issues\n- Port conflicts\n- Missing dependencies`;
    
    const response = this.showMessageBoxSync({
      type: 'error',
      title: 'Server Startup Error',
      message: 'Failed to Start Backend Server',
      detail: message,
      buttons: ['Run Diagnostics', OPEN_DOCUMENTATION, 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Run diagnostics
        this.runDiagnostics();
        break;
      case 1: // Open documentation
        shell.openExternal(TROUBLESHOOTING_URL);
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerExitError(exitCode: number, errorOutput: string): void {
    const message = `The backend server exited unexpectedly with code ${exitCode}.\n\nThis is often caused by native module compilation issues with better-sqlite3.\n\nError output:\n${errorOutput.slice(-500)}`;
    
    const response = this.showMessageBoxSync({
      type: 'error',
      title: 'Server Exit Error',
      message: `Server Exit Error (Code ${exitCode})`,
      detail: message,
      buttons: ['Run Diagnostics', OPEN_DOCUMENTATION, 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Run diagnostics
        this.runDiagnostics();
        break;
      case 1: // Open documentation
        shell.openExternal(TROUBLESHOOTING_URL);
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showGenericServerError(errorMessage: GenericServerMessage): void {
    dialog.showErrorBox('Server Error', `Server error: ${errorMessage.message || 'Unknown error'}`);
  }

  showDatabasePathError(error: Error): void {
    const message = `Cannot create or access the database directory.\n\nThis is typically caused by:\n• Insufficient file system permissions\n• Read-only file system\n• Corrupted user data directory\n\nTechnical details:\n${error.message}\n\nTry running the application with administrator privileges or check the user data directory permissions.`;
    
    const response = this.showMessageBoxSync({
      type: 'error',
      title: 'Database Path Error',
      message: 'Cannot Initialize Database',
      detail: message,
      buttons: ['Open User Data Folder', 'Retry with Different Location', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: { // Open user data folder
        const userDataPath = app.getPath('userData');
        shell.openPath(userDataPath);
        break;
      }
      case 1: // Retry (this could be enhanced to allow manual path selection)
        this.restartServer();
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerPathError(error: Error): void {
    const message = `${SERVER_FILES_ERROR_MESSAGE}${error.message}\n\nTry reinstalling the application or check the packaging configuration.`;
    
    const response = this.showMessageBoxSync({
      type: 'error',
      title: 'Server Files Not Found',
      message: 'Cannot Start Application',
      detail: message,
      buttons: [OPEN_DOCUMENTATION, 'Show Technical Details', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Open documentation
        shell.openExternal('https://github.com/electron/electron/blob/main/docs/tutorial/application-packaging.md');
        break;
      case 1: { // Show technical details
        let technicalDetails;
        try {
          // Attempt to parse JSON from error message
          const jsonPart = error.message.split(': ')[1];
          const parsedError = JSON.parse(jsonPart);
          technicalDetails = JSON.stringify(parsedError, null, 2);
        } catch (parseError) {
          const parseErr = parseError instanceof Error ? parseError : new Error(String(parseError));
          // Fallback to raw error message if JSON parsing fails
          logger.warn('Failed to parse error message as JSON', { error: parseErr instanceof Error ? parseErr.message : String(parseErr) });
          technicalDetails = error.message;
        }
        
        void this.showMessageBox({
          type: 'info',
          title: 'Technical Details',
          message: 'Path Resolution Error',
          detail: technicalDetails
        });
        break;
      }
      case 2: // Exit
        app.quit();
        break;
    }
  }

  async runDiagnostics(): Promise<void> {
    try {
      // Run comprehensive startup diagnostics
      const { default: StartupDiagnostics } = await import('./scripts/startup-diagnostics.js');
      const diagnostics = new StartupDiagnostics();
      const result = await diagnostics.run();
      
      // Show results to user
      const diagnosticsResult = result as { modules?: Record<string, { error?: unknown }>, errors: unknown[] };
      const moduleResults = Object.values(diagnosticsResult.modules ?? {}) as Array<{ error?: unknown }>;
      const hasErrors = diagnosticsResult.errors.length > 0 || moduleResults.some(moduleInfo => Boolean(moduleInfo?.error));
      const diagnosticsLogPath = 'See diagnostics log';
      
      const message = hasErrors 
        ? `Diagnostics found issues. Check the log file for details.\n\nLog location: ${diagnosticsLogPath}`
        : 'Diagnostics completed successfully. No issues found.';
      
      void this.showMessageBox({
        type: hasErrors ? 'warning' : 'info',
        title: 'Diagnostics Complete',
        message,
        detail: hasErrors 
          ? 'Common fixes:\n• Run: npm run rebuild:electron\n• Reinstall the application\n• Check antivirus software'
          : 'You can try restarting the application.'
      });
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to run diagnostics', { error: err instanceof Error ? err.message : String(err) });
      
      // Fallback to simple native module check
      const nodeExePath = process.execPath;
      const scriptPath = path.join(__dirname, 'scripts', 'check-native-modules.js');
      
      logger.debug('Running fallback diagnostics', { nodeExePath, scriptPath });
      
      const diagnostics = spawn(nodeExePath, [scriptPath, '--verbose'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1'
        }
      });
      
      diagnostics.on('exit', (code) => {
        const message = code === 0 
          ? 'Basic diagnostics completed successfully. Try restarting the application.'
          : `Diagnostics failed with exit code ${code}. Check the console for details.`;
          
        void this.showMessageBox({
          type: code === 0 ? 'info' : 'error',
          title: 'Diagnostics Complete',
          message
        });
      });
    }
  }

  async restartServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    
    this.serverReady = false;
    
    try {
      await this.startServer();
    } catch (error) {
      logger.error('Failed to restart server', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.startServer();
      this.createWindow();
    } catch (error) {
      logger.error('Failed to initialize application', { error: error instanceof Error ? error.message : String(error) });
      // Error dialogs are handled in startServer
    }
  }

  cleanup(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

const electronApp = new ElectronApp();

app.whenReady().then(() => {
  electronApp.initialize();
});

app.on('window-all-closed', () => {
  electronApp.cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    electronApp.createWindow();
  }
});

app.on('before-quit', () => {
  electronApp.cleanup();
});
