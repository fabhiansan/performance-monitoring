#!/usr/bin/env node

/**
 * Native Module Diagnostic Script for Employee Performance Analyzer
 * 
 * This script checks the status and compatibility of native modules,
 * particularly better-sqlite3, across different environments.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class NativeModuleChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      platform: platform(),
      arch: arch(),
      nodeVersion: process.version,
      electronVersion: null,
      modules: {},
      recommendations: [],
      overallStatus: 'unknown'
    };
    
    this.modules = ['better-sqlite3'];
    this.verboseOutput = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.jsonOutput = process.argv.includes('--json');
  }

  log(message, level = 'info') {
    if (this.jsonOutput) return; // Suppress logs in JSON mode
    
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    
    if (this.verboseOutput || level === 'error' || level === 'success' || level === 'warn') {
      console.log(`${prefix} ${message}`);
    }
  }

  async run() {
    try {
      this.log('Starting native module diagnostics...', 'info');
      
      // Detect Electron version
      this.results.electronVersion = this.detectElectronVersion();
      
      // Check each module
      for (const moduleName of this.modules) {
        this.results.modules[moduleName] = await this.checkModule(moduleName);
      }
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Determine overall status
      this.determineOverallStatus();
      
      // Output results
      this.outputResults();
      
    } catch (error) {
      this.log(`Diagnostic check failed: ${error.message}`, 'error');
      this.results.overallStatus = 'error';
      this.results.error = error.message;
      this.outputResults();
      process.exit(1);
    }
  }

  detectElectronVersion() {
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      if (!existsSync(packageJsonPath)) return null;
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const electronVersion = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
      
      if (electronVersion) {
        return electronVersion.replace(/^[\^~]/, '');
      }
      
      return null;
    } catch (error) {
      this.log(`Error detecting Electron version: ${error.message}`, 'warn');
      return null;
    }
  }

  async checkModule(moduleName) {
    this.log(`Checking ${moduleName}...`, 'info');
    
    const moduleResult = {
      name: moduleName,
      installed: false,
      version: null,
      buildArtifacts: {
        hasBuilds: false,
        buildPath: null,
        prebuildPath: null,
        buildDate: null
      },
      compatibility: {
        nodeCompatible: false,
        electronCompatible: false,
        architectureMatch: false,
        platformMatch: false
      },
      loadTest: {
        canRequire: false,
        canInstantiate: false,
        error: null
      },
      recommendations: []
    };

    // Check if module is installed
    const modulePath = join(projectRoot, 'node_modules', moduleName);
    if (!existsSync(modulePath)) {
      moduleResult.recommendations.push(`Install ${moduleName}: npm install ${moduleName}`);
      return moduleResult;
    }
    
    moduleResult.installed = true;
    
    // Get module version
    try {
      const modulePackageJson = join(modulePath, 'package.json');
      if (existsSync(modulePackageJson)) {
        const modulePackage = JSON.parse(readFileSync(modulePackageJson, 'utf8'));
        moduleResult.version = modulePackage.version;
      }
    } catch (error) {
      this.log(`Error reading module package.json: ${error.message}`, 'warn');
    }
    
    // Check build artifacts
    await this.checkBuildArtifacts(modulePath, moduleResult);
    
    // Check compatibility
    await this.checkCompatibility(modulePath, moduleResult);
    
    // Test loading
    await this.testModuleLoading(moduleName, moduleResult);
    
    // Generate module-specific recommendations
    this.generateModuleRecommendations(moduleResult);
    
    return moduleResult;
  }

  async checkBuildArtifacts(modulePath, moduleResult) {
    const buildPath = join(modulePath, 'build');
    const prebuildPath = join(modulePath, 'prebuilds');
    
    if (existsSync(buildPath)) {
      moduleResult.buildArtifacts.hasBuilds = true;
      moduleResult.buildArtifacts.buildPath = buildPath;
      
      try {
        const buildStat = statSync(buildPath);
        moduleResult.buildArtifacts.buildDate = buildStat.mtime.toISOString();
      } catch (error) {
        this.log(`Error getting build stats: ${error.message}`, 'warn');
      }
    }
    
    if (existsSync(prebuildPath)) {
      moduleResult.buildArtifacts.hasBuilds = true;
      moduleResult.buildArtifacts.prebuildPath = prebuildPath;
    }
    
    if (!moduleResult.buildArtifacts.hasBuilds) {
      moduleResult.recommendations.push('No build artifacts found - module may need rebuilding');
    }
  }

  async checkCompatibility(modulePath, moduleResult) {
    const { name: moduleName } = moduleResult;
    
    // Check Node.js compatibility by looking for appropriate bindings
    const possibleBindings = [
      join(modulePath, 'build', 'Release', `${moduleName}.node`),
      join(modulePath, 'build', 'Debug', `${moduleName}.node`),
      join(modulePath, 'lib', 'binding', `${this.results.platform}-${this.results.arch}`, `${moduleName}.node`)
    ];
    
    for (const bindingPath of possibleBindings) {
      if (existsSync(bindingPath)) {
        moduleResult.compatibility.nodeCompatible = true;
        break;
      }
    }
    
    // Check Electron compatibility
    if (this.results.electronVersion) {
      const electronBindingPaths = [
        join(modulePath, 'prebuilds', `${this.results.platform}-${this.results.arch}`, 'electron.node'),
        join(modulePath, 'build', 'electron', `${moduleName}.node`)
      ];
      
      for (const bindingPath of electronBindingPaths) {
        if (existsSync(bindingPath)) {
          moduleResult.compatibility.electronCompatible = true;
          break;
        }
      }
    } else {
      moduleResult.compatibility.electronCompatible = true; // Not applicable
    }
    
    // Architecture and platform matching
    moduleResult.compatibility.architectureMatch = true; // Assume compatible unless proven otherwise
    moduleResult.compatibility.platformMatch = true;
    
    // Check for mismatched binaries by trying to get file info
    try {
      if (moduleResult.buildArtifacts.buildPath) {
        const output = execSync(`file "${moduleResult.buildArtifacts.buildPath}"/**/*.node 2>/dev/null || echo "no binaries found"`, 
          { encoding: 'utf8' });
        
        if (output.includes('x86-64') && this.results.arch !== 'x64') {
          moduleResult.compatibility.architectureMatch = false;
          moduleResult.recommendations.push('Architecture mismatch detected - rebuild required');
        }
        
        if (output.includes('arm64') && this.results.arch !== 'arm64') {
          moduleResult.compatibility.architectureMatch = false;
          moduleResult.recommendations.push('Architecture mismatch detected - rebuild required');
        }
      }
    } catch (error) {
      // File command not available or failed - skip architecture check
      this.log(`Could not check binary architecture: ${error.message}`, 'warn');
    }
  }

  async testModuleLoading(moduleName, moduleResult) {
    try {
      // Test if module can be required
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      const loadedModule = require(moduleName);
      moduleResult.loadTest.canRequire = true;
      
      // Module-specific tests
      if (moduleName === 'better-sqlite3') {
        await this.testBetterSqlite3(loadedModule, moduleResult);
      }
      
    } catch (error) {
      moduleResult.loadTest.error = error.message;
      
      // Analyze the error for more specific recommendations
      if (error.message.includes('Module did not self-register')) {
        moduleResult.recommendations.push('Native module version mismatch - rebuild required');
      } else if (error.message.includes('Cannot find module')) {
        moduleResult.recommendations.push('Module not properly installed - reinstall required');
      } else if (error.message.includes('The specified procedure could not be found')) {
        moduleResult.recommendations.push('Windows DLL compatibility issue - rebuild with correct tools');
      } else if (error.message.includes('dlopen')) {
        moduleResult.recommendations.push('Dynamic library loading failed - check build dependencies');
      }
    }
  }

  async testBetterSqlite3(Database, moduleResult) {
    try {
      // Test constructor
      if (typeof Database !== 'function') {
        moduleResult.loadTest.error = 'better-sqlite3 is not a constructor function';
        return;
      }
      
      // Test database creation
      const testDb = new Database(':memory:');
      moduleResult.loadTest.canInstantiate = true;
      
      // Test basic operations
      testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      const stmt = testDb.prepare('INSERT INTO test (name) VALUES (?)');
      stmt.run('test');
      
      const result = testDb.prepare('SELECT COUNT(*) as count FROM test').get();
      if (result.count !== 1) {
        throw new Error('Database operations test failed');
      }
      
      testDb.close();
      
      this.log('✓ better-sqlite3 full functionality test passed', 'success');
      
    } catch (error) {
      moduleResult.loadTest.error = `better-sqlite3 functionality test failed: ${error.message}`;
      moduleResult.recommendations.push('better-sqlite3 functionality test failed - rebuild recommended');
    }
  }

  generateModuleRecommendations(moduleResult) {
    const { name: moduleName } = moduleResult;
    
    if (!moduleResult.installed) {
      moduleResult.recommendations.push(`Module not installed: npm install ${moduleName}`);
      return;
    }
    
    if (!moduleResult.buildArtifacts.hasBuilds) {
      moduleResult.recommendations.push(`No build artifacts found: npm rebuild ${moduleName}`);
    }
    
    if (!moduleResult.compatibility.nodeCompatible && !moduleResult.compatibility.electronCompatible) {
      moduleResult.recommendations.push('No compatible binaries found - full rebuild required');
    } else if (this.results.electronVersion && !moduleResult.compatibility.electronCompatible) {
      moduleResult.recommendations.push('Electron compatibility missing - rebuild for Electron');
    } else if (!moduleResult.compatibility.nodeCompatible) {
      moduleResult.recommendations.push('Node.js compatibility missing - rebuild for Node.js');
    }
    
    if (!moduleResult.compatibility.architectureMatch) {
      moduleResult.recommendations.push(`Architecture mismatch (${this.results.arch}) - rebuild required`);
    }
    
    if (!moduleResult.loadTest.canRequire) {
      moduleResult.recommendations.push('Module loading failed - rebuild or reinstall required');
    } else if (!moduleResult.loadTest.canInstantiate && moduleName === 'better-sqlite3') {
      moduleResult.recommendations.push('Module instantiation failed - rebuild recommended');
    }
  }

  generateRecommendations() {
    const allModules = Object.values(this.results.modules);
    const hasIssues = allModules.some(module => module.recommendations.length > 0);
    
    if (!hasIssues) {
      this.results.recommendations.push('All native modules are working correctly');
      return;
    }
    
    // Environment-specific recommendations
    if (this.results.electronVersion) {
      this.results.recommendations.push('For Electron apps, use: npm run rebuild:electron');
    }
    
    this.results.recommendations.push('For Node.js apps, use: npm run rebuild:node');
    this.results.recommendations.push('For comprehensive rebuild, use: npm run rebuild:native');
    
    // Platform-specific recommendations
    if (this.results.platform === 'win32') {
      this.results.recommendations.push('Windows users: Ensure Visual Studio Build Tools are installed');
    } else if (this.results.platform === 'darwin') {
      this.results.recommendations.push('macOS users: Ensure Xcode Command Line Tools are installed');
    } else {
      this.results.recommendations.push('Linux users: Ensure build-essential package is installed');
    }
    
    // Common troubleshooting
    this.results.recommendations.push('If issues persist, try: npm cache clean --force');
    this.results.recommendations.push('Delete node_modules and package-lock.json, then npm install');
  }

  determineOverallStatus() {
    const modules = Object.values(this.results.modules);
    
    if (modules.length === 0) {
      this.results.overallStatus = 'no-modules';
      return;
    }
    
    const allWorking = modules.every(module => 
      module.installed && 
      module.loadTest.canRequire && 
      (module.name !== 'better-sqlite3' || module.loadTest.canInstantiate)
    );
    
    if (allWorking) {
      this.results.overallStatus = 'healthy';
    } else {
      const anyWorking = modules.some(module => module.loadTest.canRequire);
      this.results.overallStatus = anyWorking ? 'partial' : 'broken';
    }
  }

  outputResults() {
    if (this.jsonOutput) {
      console.log(JSON.stringify(this.results, null, 2));
      return;
    }
    
    // Human-readable output
    this.log('\n📋 Native Module Diagnostic Report', 'info');
    this.log('═'.repeat(50), 'info');
    
    this.log(`Platform: ${this.results.platform} (${this.results.arch})`, 'info');
    this.log(`Node.js: ${this.results.nodeVersion}`, 'info');
    if (this.results.electronVersion) {
      this.log(`Electron: ${this.results.electronVersion}`, 'info');
    }
    
    this.log(`\nOverall Status: ${this.getStatusEmoji()} ${this.results.overallStatus.toUpperCase()}`, 
      this.results.overallStatus === 'healthy' ? 'success' : 'error');
    
    // Module details
    for (const [moduleName, moduleResult] of Object.entries(this.results.modules)) {
      this.log(`\n📦 ${moduleName}`, 'info');
      this.log(`  Installed: ${moduleResult.installed ? '✅' : '❌'}`, 'info');
      
      if (moduleResult.installed) {
        this.log(`  Version: ${moduleResult.version || 'unknown'}`, 'info');
        this.log(`  Build artifacts: ${moduleResult.buildArtifacts.hasBuilds ? '✅' : '❌'}`, 'info');
        this.log(`  Can load: ${moduleResult.loadTest.canRequire ? '✅' : '❌'}`, 'info');
        
        if (moduleName === 'better-sqlite3') {
          this.log(`  Can instantiate: ${moduleResult.loadTest.canInstantiate ? '✅' : '❌'}`, 'info');
        }
        
        if (moduleResult.loadTest.error) {
          this.log(`  Error: ${moduleResult.loadTest.error}`, 'error');
        }
        
        if (moduleResult.recommendations.length > 0) {
          this.log(`  Recommendations:`, 'warn');
          moduleResult.recommendations.forEach(rec => {
            this.log(`    • ${rec}`, 'warn');
          });
        }
      }
    }
    
    // General recommendations
    if (this.results.recommendations.length > 0) {
      this.log('\n🔧 General Recommendations:', 'info');
      this.results.recommendations.forEach(rec => {
        this.log(`  • ${rec}`, 'info');
      });
    }
    
    this.log('\n📖 For more help, see: docs/TROUBLESHOOTING.md', 'info');
  }

  getStatusEmoji() {
    switch (this.results.overallStatus) {
      case 'healthy': return '✅';
      case 'partial': return '⚠️';
      case 'broken': return '❌';
      case 'no-modules': return '❓';
      default: return '❓';
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new NativeModuleChecker();
  checker.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default NativeModuleChecker;