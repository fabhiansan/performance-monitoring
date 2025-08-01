import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fork } from 'child_process';
import { existsSync } from 'fs';
// ElectronConfig will be dynamically imported in app.whenReady()

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let serverProcess;
let config;
// Determine if we are running in development mode
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
const port = 3002;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: join(__dirname, 'assets/icon.png'), // App icon
    title: 'Dashboard Penilaian Kinerja Pegawai Dinas Sosial',
    show: false // Don't show until ready
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load the app
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  if (isDev) {
    // Development: load from Vite dev server
    console.log('Loading from Vite dev server...');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    console.log('Loading from built files...');
    const indexPath = join(__dirname, 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('Index file exists:', existsSync(indexPath));
    
    if (existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('Built files not found! Run "npm run build" first.');
      app.quit();
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Window shown successfully');
  });
  
  // Add debug logging for page load
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function runServerHealthCheck() {
  try {
    // Dynamic import of health check module
    const { checkServerHealth } = await import('./server/server-health-check.js');
    const healthResult = await checkServerHealth();
    console.log('Server health check result:', healthResult);
    return healthResult;
  } catch (error) {
    console.warn('Health check module not available, proceeding with startup:', error.message);
    return { healthy: false, reason: 'health-check-unavailable', details: error.message };
  }
}

function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // Run server health check first
      console.log('Running server health check...');
      const healthCheck = await runServerHealthCheck();
      
      if (!healthCheck.healthy && healthCheck.reason === 'native-module-error') {
        console.error('Native module error detected:', healthCheck.details);
        const errorMsg = `Native module compilation issue detected:\n${healthCheck.details}\n\nPlease run: npm run rebuild:native`;
        
        dialog.showErrorBox('Native Module Error', errorMsg);
        reject(new Error(`Native module error: ${healthCheck.details}`));
        return;
      }
      
      // Set database path to userData directory
      const userDataPath = app.getPath('userData');
      const dbPath = join(userDataPath, 'performance_analyzer.db');
      
      console.log('Starting server with database at:', dbPath);
      console.log('User data path:', userDataPath);
      console.log('Platform:', process.platform);
      console.log('Architecture:', process.arch);
      
      // Set environment variables for the server
      const apiKey = config.getGeminiApiKey();
      const env = {
        ...process.env,
        DB_PATH: dbPath,
        PORT: port.toString(),
        NODE_ENV: isDev ? 'development' : 'production',
        API_KEY: apiKey,
        GEMINI_API_KEY: apiKey
      };

      // In packaged apps, ensure NODE_PATH includes the unpacked modules
      if (app.isPackaged) {
        const unpackedNodeModules = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
        env.NODE_PATH = env.NODE_PATH ? `${env.NODE_PATH}:${unpackedNodeModules}` : unpackedNodeModules;
        console.log('Set NODE_PATH for packaged app:', env.NODE_PATH);
      }

      // Determine server path depending on environment with better cross-platform support
      let serverPath;
      if (isDev) {
        // In development, prefer .mjs for explicit ES module support, then wrapper, then fallback to .js
        const mjsPath = join(__dirname, 'server', 'server.mjs');
        const wrapperPath = join(__dirname, 'server', 'server-wrapper.cjs');
        const jsPath = join(__dirname, 'server', 'server.js');
        
        if (existsSync(mjsPath)) {
          serverPath = mjsPath;
        } else if (existsSync(wrapperPath)) {
          serverPath = wrapperPath;
        } else {
          serverPath = jsPath;
        }
      } else {
        // Try multiple possible paths for cross-platform compatibility
        const possiblePaths = [
          // First try .mjs files for explicit ES module support
          join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server.mjs'),
          join(process.resourcesPath, 'app', 'server', 'server.mjs'),
          join(process.resourcesPath, 'server', 'server.mjs'),
          join(__dirname, 'server', 'server.mjs'),
          // Then try CommonJS wrapper for ES modules
          join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server-wrapper.cjs'),
          join(process.resourcesPath, 'app', 'server', 'server-wrapper.cjs'),
          join(process.resourcesPath, 'server', 'server-wrapper.cjs'),
          join(__dirname, 'server', 'server-wrapper.cjs'),
          // Then fallback to .js files
          join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server.js'), // Primary asar unpacked path
          join(process.resourcesPath, 'app', 'server', 'server.js'),
          join(process.resourcesPath, 'server', 'server.js'),
          join(__dirname, 'server', 'server.js'),
          join(__dirname, 'resources', 'server', 'server.js'),
          join(__dirname, '..', 'server', 'server.js'), // Go up one level
          join(process.cwd(), 'server', 'server.js'), // Current working directory
          join(app.getAppPath(), 'server', 'server.js') // App path fallback
        ];
        
        console.log('Searching for server in the following paths:');
        possiblePaths.forEach((path, index) => {
          const exists = existsSync(path);
          console.log(`${index + 1}. ${path} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        });
        
        serverPath = possiblePaths.find(path => existsSync(path));
        
        if (!serverPath) {
          console.error('Server file not found in any of these locations:', possiblePaths);
          console.error('Debug info:');
          console.error('  __dirname:', __dirname);
          console.error('  process.cwd():', process.cwd());
          console.error('  process.resourcesPath:', process.resourcesPath);
          console.error('  app.getAppPath():', app.getAppPath());
          console.error('  app.isPackaged:', app.isPackaged);
          throw new Error(`Server file not found. Searched ${possiblePaths.length} paths.`);
        }
      }

      console.log('Server path:', serverPath);
      console.log('Server file exists:', existsSync(serverPath));
      
      if (!existsSync(serverPath)) {
        throw new Error(`Server file not found at: ${serverPath}`);
      }

      // Fork options for ES modules and cross-platform compatibility
      const forkOptions = {
        env,
        silent: false,
        execArgv: [], // Clear execArgv to use default Node.js module resolution
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Ensure proper stdio for Windows
      };

      // In packaged apps, set the working directory to the unpacked location
      if (app.isPackaged) {
        const unpackedDir = join(process.resourcesPath, 'app.asar.unpacked');
        forkOptions.cwd = unpackedDir;
        console.log('Set working directory for packaged app:', forkOptions.cwd);
        
        // For ES modules in packaged apps, we need to ensure package.json is accessible
        // and the module type is properly recognized
        const packageJsonPath = join(unpackedDir, 'package.json');
        console.log('Package.json path in packaged app:', packageJsonPath);
        console.log('Package.json exists in unpacked dir:', existsSync(packageJsonPath));
      }

      console.log('Forking server with options:', {
        serverPath,
        args: [],
        options: { ...forkOptions, env: '...' } // Don't log full env for security
      });

      serverProcess = fork(serverPath, [], forkOptions);

      // Capture stdout/stderr for better error diagnosis
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
          console.log(`Server stdout: ${data}`);
        });
      }

      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          console.error(`Server stderr: ${data}`);
        });
      }

      serverProcess.on('message', (message) => {
        console.log('Server message received:', message);
        if (message === 'server-ready') {
          console.log('Express server is ready');
          resolve();
        }
      });

      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        
        // Provide detailed error analysis
        let errorDetails = `Server process failed to start: ${error.message}`;
        let suggestions = [];
        
        if (error.code === 'ENOENT') {
          errorDetails += '\n\nServer file not found or not executable.';
          suggestions.push('Verify the server files are properly built');
          suggestions.push('Run "npm run build" to rebuild the application');
        } else if (error.message.includes('better-sqlite3') || error.message.includes('native')) {
          errorDetails += '\n\nNative module loading error detected.';
          suggestions.push('Run "npm run rebuild:native" to rebuild native modules');
          suggestions.push('Ensure native modules are compiled for Electron');
        }
        
        if (suggestions.length > 0) {
          errorDetails += '\n\nSuggested fixes:\n' + suggestions.map(s => `• ${s}`).join('\n');
        }
        
        dialog.showErrorBox('Server Error', errorDetails);
        reject(error);
      });

      serverProcess.on('exit', (code, signal) => {
        console.log(`Server process exited with code ${code}, signal ${signal}`);
        if (code !== 0) {
          let errorMsg = `Server exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
          let suggestions = [];
          
          // Analyze exit codes for better error reporting
          if (code === 1) {
            errorMsg += '\n\nThis is typically caused by:';
            suggestions.push('Native module compilation issues (better-sqlite3)');
            suggestions.push('Missing dependencies or incorrect module paths');
            suggestions.push('Database permission issues');
            
            errorMsg += '\n\nSuggested fixes:';
            suggestions.push('Run "npm run rebuild:native" to rebuild native modules');
            suggestions.push('Check write permissions to user data directory');
            suggestions.push('Verify all dependencies are properly installed');
          } else if (code === 3221225477 || code === -1073741819) { // Windows access violation
            errorMsg += '\n\nWindows access violation detected.';
            suggestions.push('Run "npm run rebuild:electron" to rebuild for Electron');
            suggestions.push('Close any other instances of the application');
          }
          
          if (suggestions.length > 0) {
            errorMsg += '\n' + suggestions.map(s => `• ${s}`).join('\n');
          }
          
          console.error(errorMsg);
          dialog.showErrorBox('Server Exit Error', errorMsg);
          reject(new Error(errorMsg));
        }
      });

      // Fallback timeout in case server doesn't send ready message
      setTimeout(() => {
        console.log('Server started (timeout fallback)');
        resolve();
      }, 3000);

    } catch (error) {
      reject(error);
    }
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('Starting Dashboard Penilaian Kinerja Pegawai Dinas Sosial...');
    
    // Dynamically import ElectronConfig with proper path handling
    let ElectronConfig;
    if (app.isPackaged) {
      // In packaged app, files are unpacked to app.asar.unpacked
      const { pathToFileURL } = await import('url');
      const unpackedPath = join(process.resourcesPath, 'app.asar.unpacked', 'electron-config.js');
      console.log('Loading ElectronConfig from unpacked path:', unpackedPath);
      ElectronConfig = (await import(pathToFileURL(unpackedPath).href)).default;
    } else {
      // In development, use relative import
      console.log('Loading ElectronConfig from relative path in development');
      ElectronConfig = (await import('./electron-config.js')).default;
    }
    
    // Initialize config
    config = new ElectronConfig();
    console.log('Config loaded from:', config.getConfigPath());
    
    // Start the Express server (always start in both development and production)
    let serverStarted = false;
    console.log(`${isDev ? 'Development' : 'Production'} mode: Starting embedded server...`);
    try {
      await startServer();
      serverStarted = true;
      console.log('✅ Embedded server started successfully');
    } catch (error) {
      console.error('❌ Failed to start embedded server:', error.message);
      console.error('Will show error information in the application window');
      serverStarted = false;
    }
    
    // Always create the window, even if server failed
    createWindow();
    
    // If server failed to start, show error info to user after window is ready
    if (!serverStarted) {
      mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`
            console.error('Server failed to start. Please restart the application.');
            if (window.location.pathname !== '/error') {
              document.body.innerHTML = '<div style="padding: 40px; font-family: Arial, sans-serif; text-align: center;">' +
                '<h2 style="color: #e74c3c;">🔧 Server Error</h2>' +
                '<p>The backend server failed to start.</p>' +
                '<p>Please:</p>' +
                '<ul style="text-align: left; display: inline-block;">' +
                '<li>Restart the application</li>' +
                '<li>Check if another instance is running</li>' +
                '<li>Verify you have write permissions to the user data directory</li>' +
                '</ul>' +
                '<button onclick="require(\\'electron\\').remote.app.relaunch(); require(\\'electron\\').remote.app.exit()" ' +
                'style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">' +
                'Restart Application</button>' +
                '</div>';
            }
          `);
        }, 2000);
      });
    }

    console.log('Application ready!');
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Show error dialog on startup failure
    dialog.showErrorBox('Startup Failed', 
      `Failed to start Dashboard Penilaian Kinerja Pegawai Dinas Sosial:\n\n${error.message}\n\nPlease check if:\n- The application files are not corrupted\n- You have write permissions to the user data directory\n- No other instance is running`
    );
    
    // Show error page in window if it exists
    if (mainWindow && !mainWindow.isDestroyed()) {
      const errorPath = join(__dirname, 'assets/error.html');
      if (existsSync(errorPath)) {
        mainWindow.loadFile(errorPath);
        mainWindow.show();
      }
    }
    
    // Don't quit immediately, let user see the error
    setTimeout(() => {
      app.quit();
    }, 10000); // Quit after 10 seconds
  }
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Handle app termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  stopServer();
  app.quit();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  stopServer();
  app.quit();
});

// Handle restart request from renderer
ipcMain.on('restart-app', () => {
  console.log('Restart requested by user');
  stopServer();
  app.relaunch();
  app.exit(0);
});