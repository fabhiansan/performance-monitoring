// Import sqlite3 to test if it loads properly
import 'better-sqlite3';

interface Issue {
  type: string;
  module: string;
  error: string;
}

class NativeModuleChecker {
  private issues: Issue[] = [];
  private verbose: boolean;

  constructor() {
    this.issues = [];
    this.verbose = process.argv.includes('--verbose');
  }

  async checkBetterSqlite3() {
    try {
      // sqlite3 is already imported at the top level
      console.log('✅ better-sqlite3 loaded successfully');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.issues.push({
        type: 'compilation-error',
        module: 'better-sqlite3',
        error: errorMessage
      });
      console.log('❌ better-sqlite3 failed to load:', errorMessage);
      return false;
    }
  }

  checkVersionCompatibility() {
    const electronVersion = process.versions.electron;
    const nodeVersion = process.versions.node;
    
    console.log(`Node.js version: ${nodeVersion}`);
    console.log(`Electron version: ${electronVersion || 'Not running in Electron'}`);
    
    if (electronVersion && this.verbose) {
      console.log('Running in Electron environment');
    }
  }

  async run() {
    console.log('🔍 Checking native modules...\n');
    
    this.checkVersionCompatibility();
    await this.checkBetterSqlite3();
    
    if (this.issues.length === 0) {
      console.log('\n✅ All native modules are working correctly');
    } else {
      console.log('\n❌ Issues found:');
      this.issues.forEach((issue: Issue) => {
        console.log(`- ${issue.type}: ${issue.module} - ${issue.error}`);
      });
      
      console.log('\n🔧 Suggested fixes:');
      console.log('1. Run: npm run rebuild:native');
      console.log('2. If that fails: npm run rebuild:electron');
      console.log('3. Clean install: rm -rf node_modules && npm install');
    }
  }
}

const checker = new NativeModuleChecker();
checker.run().catch(console.error);
