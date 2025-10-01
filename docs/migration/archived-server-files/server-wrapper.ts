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
import { logger } from '../services/logger';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ErrorReportContext extends Record<string, unknown> {}

interface NormalizedError {
  message: string;
  stack?: string;
  code?: string;
}

const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    const errno = error as NodeJS.ErrnoException;
    return {
      message: error.message,
      stack: error.stack,
      code: typeof errno.code === 'string' ? errno.code : undefined
    };
  }

  return {
    message: typeof error === 'string' ? error : String(error)
  };
};

// Enhanced error reporting
function reportError(type: string, error: unknown, context: ErrorReportContext = {}): void {
  const normalized = normalizeError(error);

  const errorReport = {
    type,
    timestamp: new Date().toISOString(),
    error: normalized,
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
  
  // Also log via structured logging
  logger.error(`Server wrapper error: ${type}`, {
    error: normalized.message,
    stack: normalized.stack,
    code: normalized.code,
    ...context
  });
}

// Check critical dependencies before starting
function checkDependencies(): void {
  const criticalModules = ['better-sqlite3', 'express', 'cors'];
  const missingModules = [];
  
  for (const moduleName of criticalModules) {
    try {
      require.resolve(moduleName);
      logger.debug('Module dependency resolved', { module: moduleName });
    } catch (error) {
      const normalized = normalizeError(error);
      logger.error('Failed to resolve module dependency', { 
        module: moduleName, 
        error: normalized.message 
      });
      missingModules.push({ module: moduleName, error: normalized.message });
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
function testBetterSqlite3(): void {
  try {
    logger.debug('Testing better-sqlite3 native module');
    const Database = require('better-sqlite3');
    const testDb = new Database(':memory:');
    testDb.exec('SELECT 1');
    testDb.close();
    logger.info('better-sqlite3 native module test passed');
  } catch (error) {
    const normalized = normalizeError(error);
    logger.error('better-sqlite3 test failed', { error: normalized.message });
    
    reportError('native-module-error', error, {
      module: 'better-sqlite3',
      suggestion: 'Run: npm run rebuild:electron'
    });
    
    process.exit(1);
  }
}

// Main startup function
async function startServer(): Promise<void> {
  try {
    logger.info('Starting server wrapper', {
      nodeVersion: process.version,
      electronVersion: process.versions?.electron || 'N/A',
      platform: `${process.platform} ${process.arch}`,
      workingDirectory: process.cwd(),
      scriptDirectory: __dirname
    });
    
    // Check if we're in the right directory
    const serverPath = join(__dirname, 'server-standardized.js');
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found: ${serverPath}`);
    }
    
    // Check dependencies
    checkDependencies();
    
    // Test native modules
    testBetterSqlite3();
    
    logger.info('All dependency checks passed');
    logger.debug('Loading main server module');
    
    // Import and start the actual server
    await import('./server-standardized.js');
    
    logger.info('Server module loaded successfully');
    
  } catch (error) {
    const normalized = normalizeError(error);
    logger.error('Server startup failed', { error: normalized.message, stack: normalized.stack });
    
    reportError('server-startup-error', error, {
      phase: 'initialization',
      serverPath: join(__dirname, 'server-standardized.js')
    });
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: unknown) => {
  reportError('uncaught-exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  reportError('unhandled-rejection', reason, { promise: String(promise) });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
