import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import { app } from 'electron';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class StartupDiagnostics {
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
    } catch (error) {
      // Fallback for non-Electron environments
    }
    
    const fallbackDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return path.join(fallbackDir, 'startup-diagnostics.log');
  }

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      electronVersion: process.versions?.electron || null,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      execPath: process.execPath,
      argv: process.argv,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE,
        DB_PATH: process.env.DB_PATH,
        PORT: process.env.PORT
      },
      isPackaged: app?.isPackaged || false
    };
  }

  getPathInfo() {
    const paths = {
      __dirname,
      projectRoot: process.cwd()
    };
    
    try {
      if (app) {
        paths.appPath = app.getAppPath();
        paths.resourcesPath = process.resourcesPath;
        paths.userData = app.getPath('userData');
      }
    } catch (error) {
      paths.appError = error.message;
    }
    
    return paths;
  }

  async checkModule(moduleName) {
    try {
      const moduleInfo = {
        name: moduleName,
        resolved: null,
        error: null,
        loadTest: false
      };
      
      // Try to resolve the module
      try {
        moduleInfo.resolved = require.resolve(moduleName);
      } catch (error) {
        moduleInfo.error = error.message;
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
        } else {
          require(moduleName);
          moduleInfo.loadTest = true;
        }
      } catch (error) {
        moduleInfo.error = error.message;
      }
      
      this.diagnostics.modules[moduleName] = moduleInfo;
      return moduleInfo;
    } catch (error) {
      this.diagnostics.errors.push({
        phase: 'module-check',
        module: moduleName,
        error: error.message
      });
      return null;
    }
  }

  async checkServerPaths() {
    const serverPaths = [
      path.join(this.diagnostics.paths.projectRoot, 'server', 'server-wrapper.mjs'),
      path.join(this.diagnostics.paths.projectRoot, 'server', 'server-standardized.mjs'),
      path.join(this.diagnostics.paths.projectRoot, 'server', 'server.js')
    ];
    
    if (this.diagnostics.paths.appPath) {
      serverPaths.push(
        path.join(this.diagnostics.paths.appPath + '.unpacked', 'server', 'server-wrapper.mjs'),
        path.join(this.diagnostics.paths.appPath + '.unpacked', 'server', 'server-standardized.mjs'),
        path.join(this.diagnostics.paths.appPath, 'server', 'server-wrapper.mjs'),
        path.join(this.diagnostics.paths.appPath, 'server', 'server-standardized.mjs')
      );
    }
    
    this.diagnostics.serverPaths = {};
    
    for (const serverPath of serverPaths) {
      const exists = fs.existsSync(serverPath);
      this.diagnostics.serverPaths[serverPath] = {
        exists,
        isFile: exists ? fs.statSync(serverPath).isFile() : false
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
    } catch (error) {
      console.error('❌ Failed to write diagnostics:', error.message);
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
      const status = info.error ? '❌' : info.loadTest ? '✅' : '⚠️';
      console.log(`  ${status} ${name}: ${info.error || (info.loadTest ? 'OK' : 'Resolved but not tested')}`);
    }
    
    console.log('\nServer Paths:');
    for (const [serverPath, info] of Object.entries(this.diagnostics.serverPaths)) {
      const status = info.exists && info.isFile ? '✅' : '❌';
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
