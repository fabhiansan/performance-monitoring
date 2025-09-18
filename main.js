import { app, BrowserWindow, dialog, shell } from 'electron';
import { fork, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.serverReady = false;
    this.serverPort = 3002; // Updated to match server.js default port
  }

  createWindow() {
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
  generateServerPaths() {
    const isPackaged = app.isPackaged;
    const appPath = app.getAppPath();
    
    return [
      // Primary: PREFER unpacked location with wrapper for better reliability
      {
        serverPath: path.join(appPath + '.unpacked', 'server', 'server-wrapper.mjs'),
        cwd: path.join(appPath + '.unpacked', 'server'),
        description: 'App path with .unpacked + wrapper (most reliable)'
      },
      // Secondary: Unpacked location with direct server
      {
        serverPath: path.join(appPath + '.unpacked', 'server', 'server-standardized.mjs'),
        cwd: path.join(appPath + '.unpacked', 'server'),
        description: 'App path with .unpacked (direct server)'
      },
      // Tertiary: Legacy resourcesPath with wrapper
      {
        serverPath: path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server-wrapper.mjs'),
        cwd: path.join(process.resourcesPath, 'app.asar.unpacked', 'server'),
        description: 'Resources path with wrapper fallback'
      },
      // Quaternary: Legacy resourcesPath direct
      {
        serverPath: path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server-standardized.mjs'),
        cwd: path.join(process.resourcesPath, 'app.asar.unpacked', 'server'),
        description: 'Resources path direct fallback'
      },
      // Development fallback with wrapper
      {
        serverPath: path.join(__dirname, 'server', 'server-wrapper.mjs'),
        cwd: path.join(__dirname, 'server'),
        description: 'Development with wrapper'
      },
      // Development fallback direct
      {
        serverPath: path.join(__dirname, 'server', 'server-standardized.mjs'),
        cwd: path.join(__dirname, 'server'),
        description: 'Development direct fallback'
      }
    ];
  }

  /**
   * Resolve database path based on app packaging status
   * @returns {string} Resolved database path
   */
  resolveDatabasePath() {
    const isPackaged = app.isPackaged;
    
    console.log('🔍 Resolving database path...');
    console.log(`App packaged: ${isPackaged}`);
    
    let databasePath;
    
    if (isPackaged) {
      // For packaged apps, use userData directory for writable location
      const userDataPath = app.getPath('userData');
      const databaseDir = path.join(userDataPath, 'database');
      databasePath = path.join(databaseDir, 'performance_analyzer.db');
      
      console.log(`📂 Using userData directory: ${userDataPath}`);
      console.log(`📁 Database directory: ${databaseDir}`);
      
      // Ensure database directory exists
      try {
        if (!fs.existsSync(databaseDir)) {
          fs.mkdirSync(databaseDir, { recursive: true });
          console.log(`✅ Created database directory: ${databaseDir}`);
        }
        
        // Validate directory is writable
        fs.accessSync(databaseDir, fs.constants.W_OK);
        console.log(`✅ Database directory is writable: ${databaseDir}`);
        
      } catch (error) {
        const pathError = new Error(`Failed to create or access database directory: ${databaseDir}. ${error.message}`);
        console.error('❌ Database path error:', pathError.message);
        throw pathError;
      }
    } else {
      // For development, use the current working directory
      databasePath = path.join(process.cwd(), 'server', 'performance_analyzer.db');
      console.log(`🛠️ Development mode - using current directory: ${databasePath}`);
    }
    
    console.log(`📊 Final database path: ${databasePath}`);
    return databasePath;
  }

  /**
   * Validate a server path configuration
   * @param {Object} pathConfig - Path configuration object
   * @returns {boolean} True if path is valid, false otherwise
   */
  validateServerPath(pathConfig) {
    console.log(`🔍 Checking ${pathConfig.description}: ${pathConfig.serverPath}`);
    
    try {
      if (fs.existsSync(pathConfig.serverPath)) {
        const stats = fs.statSync(pathConfig.serverPath);
        if (stats.isFile()) {
          console.log(`✅ Found valid server file: ${pathConfig.serverPath}`);
          console.log(`📁 Working directory: ${pathConfig.cwd}`);
          return true;
        } else {
          console.log(`❌ Path exists but is not a file: ${pathConfig.serverPath}`);
        }
      } else {
        console.log(`❌ Path does not exist: ${pathConfig.serverPath}`);
      }
    } catch (error) {
      console.log(`❌ Error accessing path ${pathConfig.serverPath}:`, error.message);
    }
    
    return false;
  }

  resolveServerPath() {
    const isPackaged = app.isPackaged;
    const appPath = app.getAppPath();
    
    console.log('🔍 Resolving server path...');
    console.log(`App packaged: ${isPackaged}`);
    console.log(`App path: ${appPath}`);
    console.log(`Resources path: ${process.resourcesPath}`);
    console.log(`__dirname: ${__dirname}`);
    
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

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('Starting backend server...');
      
      try {
        const pathConfig = this.resolveServerPath();
        const { serverPath, cwd } = pathConfig;
        const isPackaged = app.isPackaged;
        
        console.log(`🚀 Starting server with resolved configuration:`);
        console.log(`   Server path: ${serverPath}`);
        console.log(`   Working directory: ${cwd}`);
        
        // Resolve database path and add to environment
        const databasePath = this.resolveDatabasePath();
        
        const env = { 
          ...process.env, 
          PORT: this.serverPort,
          DB_PATH: databasePath
        };
        const forkOptions = {
          cwd: cwd,
          env: env,
          silent: true
        };

        if (isPackaged) {
          forkOptions.execPath = process.execPath;
          forkOptions.env.ELECTRON_RUN_AS_NODE = '1';
        }

        // Final validation before fork
        if (!fs.existsSync(serverPath)) {
          const error = new Error(`Server file not found at resolved path: ${serverPath}`);
          console.error('❌ Final validation failed:', error.message);
          reject(error);
          return;
        }

        // Start the server.js file
        if (isPackaged && process.platform === 'win32') {
          // For Windows packaged apps, use spawn with Node.js to run ES modules
          const nodeExePath = process.execPath;
          console.log(`🪟 Windows spawn: ${nodeExePath} with server: ${serverPath}`);
          
          this.serverProcess = spawn(nodeExePath, [serverPath], {
            cwd: forkOptions.cwd,
            env: {
              ...forkOptions.env,
              ELECTRON_RUN_AS_NODE: '1'
            },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'], // Add IPC for better communication
            shell: false
          });
          
          // Listen for IPC messages on Windows spawn
          this.serverProcess.on('message', (message) => {
            console.log('Received IPC message:', message);
            if (message && message.type === 'server-ready') {
              this.serverReady = true;
              this.serverPort = message.port || this.serverPort;
              console.log(`✅ Backend server is ready on port ${this.serverPort} (via IPC)`);
              resolve();
            }
          });
        } else {
          // For development and other platforms, use fork for better integration
          this.serverProcess = fork(serverPath, [], forkOptions);
          
          // Listen for IPC messages from fork
          this.serverProcess.on('message', (message) => {
            console.log('Received fork message:', message);
            if (message && message.type === 'server-ready') {
              this.serverReady = true;
              this.serverPort = message.port || this.serverPort;
              console.log(`✅ Backend server is ready on port ${this.serverPort} (via fork IPC)`);
              resolve();
            }
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize server:', error.message);
        
        // Check if this is a database path error
        if (error.message.includes('database directory')) {
          this.showDatabasePathError(error);
        } else {
          this.showServerPathError(error);
        }
        reject(error);
        return;
      }

      let errorBuffer = '';
      let outputBuffer = '';

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        try {
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{')) {
              const message = JSON.parse(line);
              if (message.type === 'server-ready') {
                this.serverReady = true;
                this.serverPort = message.port || this.serverPort;
                console.log(`✅ Backend server is ready on port ${this.serverPort}`);
                resolve();
              }
            }
          }
        } catch (e) {
          // Not JSON, regular log output
          console.log('Server:', output);
          
          // Also check for the regular server startup message
          if (output.includes('Performance Analyzer API server running')) {
            this.serverReady = true;
            console.log('✅ Backend server is ready (detected from log)');
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
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
        } catch (e) {
          console.error('Server Error:', error);
        }
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        
        if (code === 1 && !this.serverReady) {
          this.showServerExitError(code, errorBuffer);
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Increased timeout for slow systems and first-time DB creation
      setTimeout(() => {
        if (!this.serverReady) {
          console.error('❌ Server startup timeout after 60 seconds');
          reject(new Error('Server startup timeout - this may be due to slow disk I/O, antivirus scanning, or native module issues'));
        }
      }, 60000);
    });
  }

  handleServerError(errorMessage) {
    console.error('Structured server error:', errorMessage);
    
    if (errorMessage.type === 'database-error') {
      this.showDatabaseError(errorMessage.details);
    } else if (errorMessage.type === 'server-startup-error') {
      this.showServerStartupError(errorMessage);
    } else {
      this.showGenericServerError(errorMessage);
    }
  }

  showDatabaseError(errorDetails) {
    const { type, description, solution } = errorDetails;
    
    const message = `Database Error: ${description}\n\nSuggested Solution: ${solution}\n\nThis is typically caused by native module compilation issues.`;
    
    const response = dialog.showMessageBoxSync(this.mainWindow, {
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
        shell.openExternal('https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/troubleshooting.md');
        break;
      case 1: // Retry
        this.restartServer();
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerStartupError(errorMessage) {
    const message = `Server startup failed: ${errorMessage.message}\n\nThis could be due to:\n- Native module compilation issues\n- Port conflicts\n- Missing dependencies`;
    
    const response = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'error',
      title: 'Server Startup Error',
      message: 'Failed to Start Backend Server',
      detail: message,
      buttons: ['Run Diagnostics', 'Open Documentation', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Run diagnostics
        this.runDiagnostics();
        break;
      case 1: // Open documentation
        shell.openExternal('https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/troubleshooting.md');
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerExitError(exitCode, errorOutput) {
    const message = `The backend server exited unexpectedly with code ${exitCode}.\n\nThis is often caused by native module compilation issues with better-sqlite3.\n\nError output:\n${errorOutput.slice(-500)}`;
    
    const response = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'error',
      title: 'Server Exit Error',
      message: `Server Exit Error (Code ${exitCode})`,
      detail: message,
      buttons: ['Run Diagnostics', 'Open Documentation', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Run diagnostics
        this.runDiagnostics();
        break;
      case 1: // Open documentation
        shell.openExternal('https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/troubleshooting.md');
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showGenericServerError(errorMessage) {
    dialog.showErrorBox('Server Error', `Server error: ${errorMessage.message || 'Unknown error'}`);
  }

  showDatabasePathError(error) {
    const message = `Cannot create or access the database directory.\n\nThis is typically caused by:\n• Insufficient file system permissions\n• Read-only file system\n• Corrupted user data directory\n\nTechnical details:\n${error.message}\n\nTry running the application with administrator privileges or check the user data directory permissions.`;
    
    const response = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'error',
      title: 'Database Path Error',
      message: 'Cannot Initialize Database',
      detail: message,
      buttons: ['Open User Data Folder', 'Retry with Different Location', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Open user data folder
        const userDataPath = app.getPath('userData');
        shell.openPath(userDataPath);
        break;
      case 1: // Retry (this could be enhanced to allow manual path selection)
        this.restartServer();
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  showServerPathError(error) {
    const message = `Cannot locate server files required to start the application.\n\nThis is typically caused by:\n• Incorrect packaging configuration\n• Missing asar.unpacked settings\n• Corrupted installation\n\nTechnical details:\n${error.message}\n\nTry reinstalling the application or check the packaging configuration.`;
    
    const response = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'error',
      title: 'Server Files Not Found',
      message: 'Cannot Start Application',
      detail: message,
      buttons: ['Open Documentation', 'Show Technical Details', 'Exit'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response) {
      case 0: // Open documentation
        shell.openExternal('https://github.com/electron/electron/blob/main/docs/tutorial/application-packaging.md');
        break;
      case 1: // Show technical details
        let technicalDetails;
        try {
          // Attempt to parse JSON from error message
          const jsonPart = error.message.split(': ')[1];
          const parsedError = JSON.parse(jsonPart);
          technicalDetails = JSON.stringify(parsedError, null, 2);
        } catch (parseError) {
          // Fallback to raw error message if JSON parsing fails
          console.warn('Failed to parse error message as JSON:', parseError.message);
          technicalDetails = error.message;
        }
        
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Technical Details',
          message: 'Path Resolution Error',
          detail: technicalDetails
        });
        break;
      case 2: // Exit
        app.quit();
        break;
    }
  }

  async runDiagnostics() {
    try {
      // Run comprehensive startup diagnostics
      const { default: StartupDiagnostics } = await import('./scripts/startup-diagnostics.js');
      const diagnostics = new StartupDiagnostics();
      const result = await diagnostics.run();
      
      // Show results to user
      const hasErrors = result.errors.length > 0 || 
        Object.values(result.modules).some(m => m.error);
      
      const message = hasErrors 
        ? `Diagnostics found issues. Check the log file for details.\n\nLog location: ${diagnostics.logPath}`
        : 'Diagnostics completed successfully. No issues found.';
      
      dialog.showMessageBox(this.mainWindow, {
        type: hasErrors ? 'warning' : 'info',
        title: 'Diagnostics Complete',
        message,
        detail: hasErrors 
          ? 'Common fixes:\n• Run: npm run rebuild:electron\n• Reinstall the application\n• Check antivirus software'
          : 'You can try restarting the application.'
      });
      
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      
      // Fallback to simple native module check
      const nodeExePath = process.execPath;
      const scriptPath = path.join(__dirname, 'scripts', 'check-native-modules.js');
      
      console.log(`Running fallback diagnostics: ${nodeExePath} ${scriptPath}`);
      
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
          
        dialog.showMessageBox(this.mainWindow, {
          type: code === 0 ? 'info' : 'error',
          title: 'Diagnostics Complete',
          message
        });
      });
    }
  }

  async restartServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    
    this.serverReady = false;
    
    try {
      await this.startServer();
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  }

  async initialize() {
    try {
      await this.startServer();
      this.createWindow();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      // Error dialogs are handled in startServer
    }
  }

  cleanup() {
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
