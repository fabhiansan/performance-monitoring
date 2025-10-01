#!/usr/bin/env node

/**
 * Unified Server Entry Point
 * 
 * This replaces the multiple server implementations with a single,
 * configurable entry point using the server factory.
 */

import { createServerApp } from './serverFactory';
import { logger } from '../services/logger';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

const serverOptions = {
  useStandardizedResponses: process.env.USE_STANDARDIZED_RESPONSES === 'true',
  useValidationMiddleware: process.env.USE_VALIDATION_MIDDLEWARE === 'true',
  enableDetailedLogging: process.env.NODE_ENV === 'development',
  cors: {
    enabled: true,
    options: undefined // Use default CORS options
  },
  jsonLimit: '50mb',
  dbPath: process.env.DB_PATH || null
};

async function startServer() {
  try {
    const { startServer } = await createServerApp(serverOptions);
    await startServer(port);
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
    
    // Send structured error to stderr for Electron to capture
    if (process.stderr) {
      process.stderr.write(JSON.stringify({
        type: 'server-startup-error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }) + '\n');
    }
    
    process.exit(1);
  }
}

startServer();