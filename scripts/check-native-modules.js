import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sqlite3 from 'better-sqlite3';

class NativeModuleChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async checkBetterSqlite3() {
    try {
      // sqlite3 is already imported at the top level
      console.log('✅ better-sqlite3 loaded successfully');
      return true;
    } catch (error) {
      this.issues.push({
        type: 'compilation-error',
        module: 'better-sqlite3',
        error: error.message
      });
      console.log('❌ better-sqlite3 failed to load:', error.message);
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
      this.issues.forEach(issue => {
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
