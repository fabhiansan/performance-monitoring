import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fork } from 'child_process';
import { existsSync } from 'fs';
import ElectronConfig from './electron-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let serverProcess;
let config;
// Determine if we are running in development mode
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
const port = 3001;

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
    icon: join(__dirname, 'icon.png'), // App icon
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

function startServer() {
  return new Promise((resolve, reject) => {
    try {
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

      // Determine server path depending on environment with better Windows support
      let serverPath;
      if (isDev) {
        serverPath = join(__dirname, 'server', 'server.js');
      } else {
        // Try multiple possible paths for better Windows compatibility
        const possiblePaths = [
          join(process.resourcesPath, 'server', 'server.js'),
          join(process.resourcesPath, 'app', 'server', 'server.js'),
          join(__dirname, 'server', 'server.js'),
          join(__dirname, 'resources', 'server', 'server.js')
        ];
        
        serverPath = possiblePaths.find(path => existsSync(path));
        
        if (!serverPath) {
          console.error('Server file not found in any of these locations:', possiblePaths);
          throw new Error(`Server file not found. Searched paths: ${possiblePaths.join(', ')}`);
        }
      }

      console.log('Server path:', serverPath);
      console.log('Server file exists:', existsSync(serverPath));
      
      if (!existsSync(serverPath)) {
        throw new Error(`Server file not found at: ${serverPath}`);
      }

      serverProcess = fork(serverPath, [], {
        env,
        silent: false,
        execArgv: [] // Clear execArgv to avoid issues with ES modules
      });

      serverProcess.on('message', (message) => {
        if (message === 'server-ready') {
          console.log('Express server is ready');
          resolve();
        }
      });

      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        if (!isDev) {
          dialog.showErrorBox('Server Error', `Server process failed to start: ${error.message}`);
        }
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code !== 0) {
          const errorMsg = `Server exited with code ${code}`;
          if (!isDev) {
            dialog.showErrorBox('Server Exit', errorMsg);
          }
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
    
    // Initialize config
    config = new ElectronConfig();
    console.log('Config loaded from:', config.getConfigPath());
    
    // Start the Express server first
    await startServer();
    
    // Then create the window
    createWindow();

    console.log('Application ready!');
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Show error dialog on Windows/production
    if (!isDev) {
      dialog.showErrorBox('Startup Failed', 
        `Failed to start Dashboard Penilaian Kinerja Pegawai Dinas Sosial:\n\n${error.message}\n\nPlease check if:\n- The application files are not corrupted\n- You have write permissions to the user data directory\n- No other instance is running`
      );
    }
    
    // Show error page in window if it exists
    if (mainWindow && !mainWindow.isDestroyed()) {
      const errorPath = join(__dirname, 'error.html');
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