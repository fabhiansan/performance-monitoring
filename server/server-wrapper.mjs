#!/usr/bin/env node

/**
 * Server Wrapper for Electron App
 * 
 * This wrapper ensures:
 * 1. Proper native module resolution
 * 2. Error logging to stderr for Electron main process
 * 3. IPC communication when available
 * 4. Graceful error handling
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced error reporting
function reportError(type, error, context = {}) {
  const errorReport = {
    type,
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context: {
      ...context,
      nodeVersion: process.version,
      electronVersion: process.versions?.electron || 'not available',
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      execPath: process.execPath
    }
  };
  
  // Send to stderr as JSON for main process to parse
  process.stderr.write(JSON.stringify(errorReport) + '\n');
  
  // Also log to console for debugging
  console.error(`[${type}] ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
}

// Check critical dependencies before starting
function checkDependencies() {
  const criticalModules = ['better-sqlite3', 'express', 'cors'];
  const missingModules = [];
  
  for (const moduleName of criticalModules) {
    try {
      require.resolve(moduleName);
      console.log(`✅ ${moduleName} resolved successfully`);
    } catch (error) {
      console.error(`❌ Failed to resolve ${moduleName}:`, error.message);
      missingModules.push({ module: moduleName, error: error.message });
    }
  }
  
  if (missingModules.length > 0) {
    reportError('dependency-error', new Error('Missing critical modules'), {
      missingModules
    });
    process.exit(1);
  }
}

// Test better-sqlite3 specifically
function testBetterSqlite3() {
  try {
    console.log('🔍 Testing better-sqlite3...');
    const Database = require('better-sqlite3');
    const testDb = new Database(':memory:');
    testDb.exec('SELECT 1');
    testDb.close();
    console.log('✅ better-sqlite3 test passed');
  } catch (error) {
    console.error('❌ better-sqlite3 test failed:', error.message);
    
    reportError('native-module-error', error, {
      module: 'better-sqlite3',
      suggestion: 'Run: npm run rebuild:electron'
    });
    
    process.exit(1);
  }
}

// Main startup function
async function startServer() {
  try {
    console.log('🚀 Starting server wrapper...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Electron version: ${process.versions?.electron || 'N/A'}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Script directory: ${__dirname}`);
    
    // Check if we're in the right directory
    const serverPath = join(__dirname, 'server-standardized.mjs');
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found: ${serverPath}`);
    }
    
    // Check dependencies
    checkDependencies();
    
    // Test native modules
    testBetterSqlite3();
    
    console.log('✅ All dependency checks passed');
    console.log('📂 Loading main server...');
    
    // Import and start the actual server
    const serverModule = await import('./server-standardized.mjs');
    
    console.log('✅ Server loaded successfully');
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    
    reportError('server-startup-error', error, {
      phase: 'initialization',
      serverPath: join(__dirname, 'server-standardized.mjs')
    });
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  reportError('uncaught-exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  reportError('unhandled-rejection', error, { promise: String(promise) });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
