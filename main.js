import { app, BrowserWindow, shell, ipcMain } from 'electron';
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
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
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
    title: 'Employee Performance Analyzer',
    show: false // Don't show until ready
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    const indexPath = join(__dirname, 'dist', 'index.html');
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

      // Determine server path depending on environment
      const serverPath = isDev
        ? join(__dirname, 'server', 'server.js')                       // Development: use local folder
        : join(process.resourcesPath, 'server', 'server.js');         // Production: use extraResources copy

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
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
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
    console.log('Starting Employee Performance Analyzer...');
    
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
    app.quit();
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