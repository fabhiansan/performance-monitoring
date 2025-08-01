#!/usr/bin/env node

/**
 * Native Module Rebuild Script for Employee Performance Analyzer
 * 
 * This script handles comprehensive rebuilding of native modules,
 * particularly better-sqlite3, for different environments and platforms.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const config = {
  modules: ['better-sqlite3'],
  platforms: ['win32', 'darwin', 'linux'],
  architectures: ['x64', 'arm64'],
  environments: ['node', 'electron'],
  verboseOutput: process.argv.includes('--verbose') || process.argv.includes('-v'),
  forceRebuild: process.argv.includes('--force') || process.argv.includes('-f'),
  targetEnvironment: process.argv.includes('--electron') ? 'electron' : 
                    process.argv.includes('--node') ? 'node' : 'auto'
};

class NativeModuleRebuilder {
  constructor() {
    this.currentPlatform = platform();
    this.currentArch = arch();
    this.isElectronContext = this.detectElectronContext();
    this.electronVersion = this.getElectronVersion();
    this.nodeVersion = process.version;
    
    this.log('Native Module Rebuilder initialized');
    this.log(`Platform: ${this.currentPlatform}`);
    this.log(`Architecture: ${this.currentArch}`);
    this.log(`Node.js version: ${this.nodeVersion}`);
    this.log(`Electron version: ${this.electronVersion || 'Not detected'}`);
    this.log(`Environment: ${this.isElectronContext ? 'Electron' : 'Node.js'}`);
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    
    if (config.verboseOutput || level === 'error' || level === 'success') {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  async run() {
    try {
      this.log('Starting native module rebuild process...', 'info');
      
      // Step 1: Environment detection
      await this.detectEnvironment();
      
      // Step 2: Cleanup old builds
      if (config.forceRebuild) {
        await this.cleanupOldBuilds();
      }
      
      // Step 3: Rebuild modules
      await this.rebuildModules();
      
      // Step 4: Verify builds
      await this.verifyBuilds();
      
      this.log('Native module rebuild completed successfully!', 'success');
      process.exit(0);
    } catch (error) {
      this.log(`Rebuild failed: ${error.message}`, 'error');
      this.log(`Stack trace: ${error.stack}`, 'error');
      
      // Provide helpful suggestions
      this.provideTroubleshootingSuggestions(error);
      process.exit(1);
    }
  }

  detectElectronContext() {
    // Check if we're in an Electron environment
    const hasElectronDep = this.hasElectronDependency();
    const isElectronProcess = process.versions && process.versions.electron;
    
    return hasElectronDep || isElectronProcess;
  }

  hasElectronDependency() {
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      if (!existsSync(packageJsonPath)) return false;
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return !!(packageJson.devDependencies?.electron || packageJson.dependencies?.electron);
    } catch (error) {
      this.log(`Error reading package.json: ${error.message}`, 'warn');
      return false;
    }
  }

  getElectronVersion() {
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      if (!existsSync(packageJsonPath)) return null;
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const electronVersion = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
      
      if (electronVersion) {
        // Remove version prefixes like ^, ~, etc.
        return electronVersion.replace(/^[\^~]/, '');
      }
      
      return null;
    } catch (error) {
      this.log(`Error detecting Electron version: ${error.message}`, 'warn');
      return null;
    }
  }

  async detectEnvironment() {
    this.log('Detecting build environment...', 'info');
    
    const targetEnv = config.targetEnvironment === 'auto' 
      ? (this.isElectronContext ? 'electron' : 'node')
      : config.targetEnvironment;
    
    this.log(`Target environment: ${targetEnv}`, 'info');
    
    // Check for required build tools
    await this.checkBuildTools();
    
    return targetEnv;
  }

  async checkBuildTools() {
    this.log('Checking build tools availability...', 'info');
    
    const requiredTools = [];
    
    if (this.currentPlatform === 'win32') {
      requiredTools.push('python', 'node-gyp');
    } else {
      requiredTools.push('python', 'make', 'gcc', 'node-gyp');
    }
    
    for (const tool of requiredTools) {
      try {
        execSync(`${tool} --version`, { stdio: 'pipe' });
        this.log(`✓ ${tool} is available`, 'info');
      } catch (error) {
        this.log(`✗ ${tool} is not available or not in PATH`, 'warn');
        
        if (tool === 'python') {
          this.log('Python is required for native module compilation', 'warn');
          this.log('Install Python from: https://www.python.org/downloads/', 'warn');
        } else if (tool === 'node-gyp') {
          this.log('Installing node-gyp globally...', 'info');
          try {
            execSync('npm install -g node-gyp', { stdio: 'inherit' });
            this.log('✓ node-gyp installed successfully', 'success');
          } catch (installError) {
            this.log(`Failed to install node-gyp: ${installError.message}`, 'error');
          }
        }
      }
    }
  }

  async cleanupOldBuilds() {
    this.log('Cleaning up old native module builds...', 'info');
    
    const cleanupPaths = [
      join(projectRoot, 'node_modules', 'better-sqlite3', 'build'),
      join(projectRoot, 'node_modules', 'better-sqlite3', 'prebuilds'),
      join(projectRoot, 'node_modules', '.cache')
    ];
    
    for (const path of cleanupPaths) {
      if (existsSync(path)) {
        try {
          rmSync(path, { recursive: true, force: true });
          this.log(`Cleaned up: ${path}`, 'info');
        } catch (error) {
          this.log(`Failed to clean up ${path}: ${error.message}`, 'warn');
        }
      }
    }
  }

  async rebuildModules() {
    this.log('Rebuilding native modules...', 'info');
    
    const targetEnv = await this.detectEnvironment();
    
    for (const moduleName of config.modules) {
      await this.rebuildSingleModule(moduleName, targetEnv);
    }
  }

  async rebuildSingleModule(moduleName, targetEnv) {
    this.log(`Rebuilding ${moduleName} for ${targetEnv}...`, 'info');
    
    const moduleBasePath = join(projectRoot, 'node_modules', moduleName);
    
    if (!existsSync(moduleBasePath)) {
      this.log(`Module ${moduleName} not found in node_modules`, 'warn');
      this.log(`Installing ${moduleName}...`, 'info');
      
      try {
        execSync(`npm install ${moduleName}`, {
          cwd: projectRoot,
          stdio: config.verboseOutput ? 'inherit' : 'pipe'
        });
      } catch (error) {
        throw new Error(`Failed to install ${moduleName}: ${error.message}`);
      }
    }
    
    // Try multiple rebuild strategies
    const strategies = targetEnv === 'electron' 
      ? ['electron-rebuild', 'electron-builder-rebuild', 'manual-electron']
      : ['npm-rebuild', 'node-gyp-rebuild'];
    
    let rebuildSuccess = false;
    
    for (const strategy of strategies) {
      try {
        this.log(`Trying rebuild strategy: ${strategy}`, 'info');
        await this.executeRebuildStrategy(strategy, moduleName, targetEnv);
        
        // Verify the rebuild was successful
        if (await this.verifyModuleBuild(moduleName, targetEnv)) {
          this.log(`✓ ${moduleName} rebuilt successfully with ${strategy}`, 'success');
          rebuildSuccess = true;
          break;
        }
      } catch (error) {
        this.log(`Strategy ${strategy} failed: ${error.message}`, 'warn');
        continue;
      }
    }
    
    if (!rebuildSuccess) {
      throw new Error(`Failed to rebuild ${moduleName} with any strategy`);
    }
  }

  async executeRebuildStrategy(strategy, moduleName, targetEnv) {
    const cwd = process.cwd();
    process.chdir(projectRoot);
    
    try {
      switch (strategy) {
        case 'electron-rebuild':
          await this.runCommand('npx @electron/rebuild --force', {
            env: {
              ...process.env,
              npm_config_cache: join(projectRoot, '.npm-cache'),
              npm_config_target: this.electronVersion,
              npm_config_runtime: 'electron',
              npm_config_target_platform: this.currentPlatform,
              npm_config_target_arch: this.currentArch
            }
          });
          break;
          
        case 'electron-builder-rebuild':
          await this.runCommand('npx electron-builder install-app-deps', {
            env: {
              ...process.env,
              npm_config_target: this.electronVersion,
              npm_config_runtime: 'electron'
            }
          });
          break;
          
        case 'manual-electron':
          await this.runCommand(`npm rebuild ${moduleName} --runtime=electron --target=${this.electronVersion} --disturl=https://electronjs.org/headers --build-from-source`);
          break;
          
        case 'npm-rebuild':
          await this.runCommand(`npm rebuild ${moduleName}`);
          break;
          
        case 'node-gyp-rebuild':
          const modulePath = join(projectRoot, 'node_modules', moduleName);
          process.chdir(modulePath);
          await this.runCommand('npx node-gyp rebuild');
          break;
          
        default:
          throw new Error(`Unknown rebuild strategy: ${strategy}`);
      }
    } finally {
      process.chdir(cwd);
    }
  }

  runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Executing: ${command}`, 'info');
      
      const child = spawn(command, [], {
        shell: true,
        stdio: config.verboseOutput ? 'inherit' : 'pipe',
        env: { ...process.env, ...options.env },
        cwd: options.cwd || process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          if (config.verboseOutput) {
            process.stdout.write(data);
          }
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          if (config.verboseOutput) {
            process.stderr.write(data);
          }
        });
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with exit code ${code}\nstderr: ${stderr}\nstdout: ${stdout}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  async verifyModuleBuild(moduleName, targetEnv) {
    this.log(`Verifying ${moduleName} build for ${targetEnv}...`, 'info');
    
    try {
      // Try to require the module in a safe way
      const modulePath = join(projectRoot, 'node_modules', moduleName);
      
      if (!existsSync(modulePath)) {
        return false;
      }
      
      // Check for build artifacts
      const buildPath = join(modulePath, 'build');
      const prebuildPath = join(modulePath, 'prebuilds');
      
      const hasBuildArtifacts = existsSync(buildPath) || existsSync(prebuildPath);
      
      if (!hasBuildArtifacts) {
        this.log(`No build artifacts found for ${moduleName}`, 'warn');
        return false;
      }
      
      // For Electron builds, skip dynamic loading test since it will fail when run from Node.js
      if (targetEnv === 'electron') {
        this.log(`✓ ${moduleName} build artifacts verified for Electron (skipping runtime test)`, 'success');
        return true;
      }
      
      // Try to load the module dynamically (Node.js only)
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const loadedModule = require(moduleName);
        
        if (moduleName === 'better-sqlite3') {
          // Specific test for better-sqlite3
          if (typeof loadedModule !== 'function') {
            this.log('better-sqlite3 loaded but is not a constructor function', 'warn');
            return false;
          }
          
          // Try to create a test database
          const testDb = new loadedModule(':memory:');
          testDb.close();
        }
        
        this.log(`✓ ${moduleName} loaded and tested successfully`, 'success');
        return true;
      } catch (loadError) {
        this.log(`Module loading test failed: ${loadError.message}`, 'warn');
        return false;
      }
    } catch (error) {
      this.log(`Verification failed: ${error.message}`, 'warn');
      return false;
    }
  }

  async verifyBuilds() {
    this.log('Verifying all native module builds...', 'info');
    
    const targetEnv = await this.detectEnvironment();
    let allValid = true;
    
    for (const moduleName of config.modules) {
      const isValid = await this.verifyModuleBuild(moduleName, targetEnv);
      if (!isValid) {
        allValid = false;
        this.log(`✗ ${moduleName} verification failed`, 'error');
      }
    }
    
    if (!allValid) {
      throw new Error('Some native modules failed verification');
    }
    
    this.log('✓ All native modules verified successfully', 'success');
  }

  provideTroubleshootingSuggestions(error) {
    this.log('\n🔧 Troubleshooting Suggestions:', 'error');
    
    const suggestions = [];
    
    if (error.message.includes('Python')) {
      suggestions.push('Install Python: https://www.python.org/downloads/');
      suggestions.push('Ensure Python is in your system PATH');
    }
    
    if (error.message.includes('node-gyp')) {
      suggestions.push('Install build tools:');
      if (this.currentPlatform === 'win32') {
        suggestions.push('  • npm install -g windows-build-tools');
        suggestions.push('  • Install Visual Studio Build Tools');
      } else if (this.currentPlatform === 'darwin') {
        suggestions.push('  • xcode-select --install');
      } else {
        suggestions.push('  • sudo apt-get install build-essential (Ubuntu/Debian)');
        suggestions.push('  • sudo yum install gcc gcc-c++ make (RHEL/CentOS)');
      }
    }
    
    if (error.message.includes('electron')) {
      suggestions.push('Try rebuilding specifically for Electron:');
      suggestions.push('  • npm run rebuild:electron');
      suggestions.push('  • npx @electron/rebuild --force');
    }
    
    if (error.message.includes('permission') || error.message.includes('EACCES')) {
      suggestions.push('Fix permission issues:');
      if (this.currentPlatform !== 'win32') {
        suggestions.push('  • sudo chown -R $(whoami) ~/.npm');
      }
      suggestions.push('  • Try running with elevated privileges');
    }
    
    suggestions.push('General fixes:');
    suggestions.push('  • Clear npm cache: npm cache clean --force');
    suggestions.push('  • Delete node_modules and package-lock.json, then npm install');
    suggestions.push('  • Update Node.js and npm to latest versions');
    
    suggestions.forEach(suggestion => {
      this.log(`  ${suggestion}`, 'error');
    });
    
    this.log('\n📖 For more help, check: docs/TROUBLESHOOTING.md', 'error');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const rebuilder = new NativeModuleRebuilder();
  rebuilder.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default NativeModuleRebuilder;
