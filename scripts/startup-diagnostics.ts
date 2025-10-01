import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import { app } from 'electron';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants for repeated string literals
const DATABASE_FILENAME = 'performance_analyzer.db';
const SERVER_FILENAME = 'server.js';
const SERVER_WRAPPER_FILENAME = 'server-wrapper.js';
const SERVER_STANDARDIZED_FILENAME = 'server-standardized.js';
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  electronVersion?: string;
  appVersion?: string;
  isElectron: boolean;
  isDevelopment: boolean;
  isPackaged?: boolean;
}

interface PathInfo {
  projectRoot: string;
  serverPath: string;
  databasePath: string;
  logPath: string;
  tempPath: string;
  appPath?: string;
  resourcesPath?: string;
  userDataPath?: string;
}

interface ModuleInfo {
  [moduleName: string]: {
    loaded: boolean;
    version?: string;
    path?: string;
    error?: string;
  };
}

interface ServerPathInfo {
  serverFile: string;
  serverDir: string;
  databaseFile: string;
  exists: boolean;
}

interface ErrorInfo {
  phase: string;
  module?: string;
  error: string;
}

interface DiagnosticsInfo {
  timestamp: string;
  environment: EnvironmentInfo;
  paths: PathInfo;
  modules: ModuleInfo;
  errors: ErrorInfo[];
  serverPaths?: ServerPathInfo;
}

class StartupDiagnostics {
  private logPath: string;
  private diagnostics: DiagnosticsInfo;

  constructor() {
    this.logPath = this.getLogPath();
    this.diagnostics = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      paths: this.getPathInfo(),
      modules: {},
      errors: []
    };
  }

  getLogPath() {
    try {
      if (app && app.getPath) {
        const userDataPath = app.getPath('userData');
        const logDir = path.join(userDataPath, 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        return path.join(logDir, 'startup-diagnostics.log');
      }
    } catch (_error: unknown) {
      // Fallback for non-Electron environments
    }
    
    const fallbackDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return path.join(fallbackDir, 'startup-diagnostics.log');
  }

  getEnvironmentInfo(): EnvironmentInfo {
    const isElectron = Boolean(process.versions?.electron);
    return {
      nodeVersion: process.version,
      electronVersion: process.versions?.electron,
      platform: process.platform,
      arch: process.arch,
      appVersion: app?.getVersion?.(),
      isElectron,
      isDevelopment: process.env.NODE_ENV === 'development',
      isPackaged: app?.isPackaged
    };
  }

  getPathInfo(): PathInfo {
    const paths: PathInfo = {
      projectRoot: process.cwd(),
      serverPath: path.join(__dirname, '..', 'server'),
      databasePath: path.join(__dirname, '..', 'server', DATABASE_FILENAME),
      logPath: this.logPath,
      tempPath: path.join(process.cwd(), 'temp')
    };
    
    try {
      if (app) {
        paths.appPath = app.getAppPath();
        paths.resourcesPath = process.resourcesPath;
        paths.userDataPath = app.getPath('userData');
      }
    } catch (error: unknown) {
      // Log error but don't add to paths object since it's not in the interface
      console.error('Error getting app paths:', error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE);
    }
    
    return paths;
  }

  async checkModule(moduleName: string) {
    try {
      const moduleInfo: {
        name: string;
        resolved: string | null;
        version?: string;
        loaded: boolean;
        error?: string;
        loadTest?: boolean;
      } = {
        name: moduleName,
        resolved: null,
        loaded: false
      };
      
      // Try to resolve the module
      try {
        moduleInfo.resolved = require.resolve(moduleName);
      } catch (error: unknown) {
        moduleInfo.error = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
        this.diagnostics.modules[moduleName] = moduleInfo;
        return moduleInfo;
      }
      
      // Try to load the module
      try {
        if (moduleName === 'better-sqlite3') {
          const Database = require(moduleName);
          const testDb = new Database(':memory:');
          testDb.exec('SELECT 1');
          testDb.close();
          moduleInfo.loadTest = true;
          moduleInfo.loaded = true;
        } else {
          require(moduleName);
          moduleInfo.loadTest = true;
          moduleInfo.loaded = true;
        }
      } catch (error: unknown) {
        moduleInfo.error = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
        moduleInfo.loaded = false;
      }
      
      this.diagnostics.modules[moduleName] = moduleInfo;
      return moduleInfo;
    } catch (error: unknown) {
      this.diagnostics.errors.push({
        phase: 'module-check',
        module: moduleName,
        error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
      });
      return null;
    }
  }

  async checkServerPaths() {
    const serverPaths = [
      path.join(this.diagnostics.paths.projectRoot, 'server', SERVER_WRAPPER_FILENAME),
      path.join(this.diagnostics.paths.projectRoot, 'server', SERVER_STANDARDIZED_FILENAME),
      path.join(this.diagnostics.paths.projectRoot, 'server', SERVER_FILENAME)
    ];
    
    if (this.diagnostics.paths.appPath) {
      serverPaths.push(
        path.join(this.diagnostics.paths.appPath + '.unpacked', 'server', SERVER_WRAPPER_FILENAME),
        path.join(this.diagnostics.paths.appPath + '.unpacked', 'server', SERVER_STANDARDIZED_FILENAME),
        path.join(this.diagnostics.paths.appPath, 'server', SERVER_WRAPPER_FILENAME),
        path.join(this.diagnostics.paths.appPath, 'server', SERVER_STANDARDIZED_FILENAME)
      );
    }
    
    // Find the first existing server file
    const firstExistingServer = serverPaths.find(p => fs.existsSync(p));
    
    if (firstExistingServer) {
      this.diagnostics.serverPaths = {
        serverFile: firstExistingServer,
        serverDir: path.dirname(firstExistingServer),
        databaseFile: path.join(path.dirname(firstExistingServer), DATABASE_FILENAME),
        exists: true
      };
    } else {
      this.diagnostics.serverPaths = {
        serverFile: serverPaths[0] || '',
        serverDir: path.dirname(serverPaths[0] || ''),
        databaseFile: path.join(path.dirname(serverPaths[0] || ''), DATABASE_FILENAME),
        exists: false
      };
    }
  }

  async run() {
    console.log('🔍 Running startup diagnostics...');
    
    // Check critical modules
    const criticalModules = ['better-sqlite3', 'express', 'cors', 'electron'];
    for (const moduleName of criticalModules) {
      await this.checkModule(moduleName);
    }
    
    // Check server paths
    await this.checkServerPaths();
    
    // Write diagnostics to file
    this.writeDiagnostics();
    
    // Print summary
    this.printSummary();
    
    return this.diagnostics;
  }

  writeDiagnostics() {
    try {
      const diagnosticsJson = JSON.stringify(this.diagnostics, null, 2);
      fs.writeFileSync(this.logPath, diagnosticsJson);
      console.log(`📝 Diagnostics written to: ${this.logPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.error('❌ Failed to write diagnostics:', errorMessage);
    }
  }

  printSummary() {
    console.log('\n📊 Diagnostics Summary:');
    console.log(`Environment: ${this.diagnostics.environment.platform} ${this.diagnostics.environment.arch}`);
    console.log(`Node.js: ${this.diagnostics.environment.nodeVersion}`);
    console.log(`Electron: ${this.diagnostics.environment.electronVersion || 'Not available'}`);
    console.log(`Packaged: ${this.diagnostics.environment.isPackaged}`);
    
    console.log('\nModule Status:');
    for (const [name, info] of Object.entries(this.diagnostics.modules)) {
      const moduleInfo = info as {
        error?: string;
        loadTest?: boolean;
        loaded: boolean;
        resolved?: string | null;
        version?: string;
      };
      const status = moduleInfo.error ? '❌' : moduleInfo.loadTest ? '✅' : '⚠️';
      console.log(`  ${status} ${name}: ${moduleInfo.error || (moduleInfo.loadTest ? 'OK' : 'Resolved but not tested')}`);
    }
    
    console.log('\nServer Paths:');
    for (const [serverPath, info] of Object.entries(this.diagnostics.serverPaths || {})) {
      const pathInfo = info as {
        exists: boolean;
        isFile: boolean;
      };
      const status = pathInfo.exists && pathInfo.isFile ? '✅' : '❌';
      console.log(`  ${status} ${serverPath}`);
    }
    
    if (this.diagnostics.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      this.diagnostics.errors.forEach(error => {
        console.log(`  - ${error.phase}: ${error.error}`);
      });
    }
  }
}

// Export for use in other modules
export default StartupDiagnostics;

// Run diagnostics if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostics = new StartupDiagnostics();
  diagnostics.run().catch(console.error);
}
