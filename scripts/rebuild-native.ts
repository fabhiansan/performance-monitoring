import { execSync } from 'child_process';
import * as fs from 'fs';

class NativeModuleRebuilder {
  private force: boolean;
  private verbose: boolean;

  constructor() {
    this.force = process.argv.includes('--force');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message: string) {
    console.log(`[REBUILD] ${message}`);
  }

  async runCommand(command: string, description: string) {
    this.log(`${description}...`);
    try {
      execSync(command, { 
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8'
      });
      this.log(`✅ ${description} completed`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`❌ ${description} failed: ${errorMessage}`);
      return false;
    }
  }

  async cleanCache() {
    if (this.force) {
      await this.runCommand('npm cache clean --force', 'Cleaning npm cache');
    }
  }

  async rebuildElectron() {
    const commands = [
      'npx electron-rebuild --force',
      'npx electron-rebuild --only better-sqlite3 --force'
    ];

    for (const command of commands) {
      const success = await this.runCommand(command, `Running: ${command}`);
      if (success) return true;
    }
    return false;
  }

  async manualRebuild() {
    this.log('Attempting manual rebuild...');
    const electronVersion = this.getElectronVersion();
    
    if (!electronVersion) {
      this.log('❌ Could not determine Electron version');
      return false;
    }

    const command = `cd node_modules/better-sqlite3 && npx node-gyp rebuild --target=${electronVersion} --runtime=electron --dist-url=https://electronjs.org/headers`;
    return await this.runCommand(command, 'Manual rebuild with node-gyp');
  }

  getElectronVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.devDependencies?.electron?.replace('^', '') || 
             packageJson.dependencies?.electron?.replace('^', '');
    } catch {
      return null;
    }
  }

  async run() {
    this.log('Starting native module rebuild process...');
    
    await this.cleanCache();
    
    let success = await this.rebuildElectron();
    
    if (!success) {
      this.log('Standard rebuild failed, trying manual approach...');
      success = await this.manualRebuild();
    }
    
    if (success) {
      this.log('✅ Native module rebuild completed successfully');
      this.log('Run "npm run check:native" to verify the installation');
    } else {
      this.log('❌ All rebuild attempts failed');
      this.log('Please check the troubleshooting guide or file an issue');
      process.exit(1);
    }
  }
}

const rebuilder = new NativeModuleRebuilder();
rebuilder.run().catch(console.error);
