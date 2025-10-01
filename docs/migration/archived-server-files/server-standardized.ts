/**
 * Standardized Server Entry Point
 * 
 * This server uses enhanced response formatting and validation middleware.
 * It demonstrates the server factory with all features enabled.
 */

import { createServerApp } from './serverFactory';
import { logger } from '../services/logger';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

(async () => {
try {
  // Create server using the unified factory with all features enabled
  const { startServer } = await createServerApp({
    useStandardizedResponses: true, // Enable enhanced responses
    useValidationMiddleware: true,  // Enable validation
    enableDetailedLogging: true,    // Enable detailed logging
    useAuthentication: process.env.NODE_ENV === 'production', // Disable auth in development
    cors: { enabled: true },
    jsonLimit: '50mb',
    dbPath: process.env.DB_PATH || null
  });
  
  await startServer(port);

} catch (error) {
  logger.error('Failed to start standardized server', { error: error instanceof Error ? error.message : String(error) });
  
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
})();