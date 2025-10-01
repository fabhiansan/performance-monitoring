/**
 * Main Server Entry Point (Legacy Compatibility)
 * 
 * This file now uses the unified server factory for consistency.
 * All server variants should eventually use the same factory.
 */

import { FastifyServer } from './fastifyServer.js';
import { logger } from '../services/logger.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

(async () => {
try {
  // Start Fastify server with sensible defaults for the Electron app
  const server = new FastifyServer({
    port,
    host: process.env.SERVER_HOST || '127.0.0.1',
    dbPath: process.env.DB_PATH || null,
    enableSwagger: process.env.NODE_ENV !== 'production',
    enableCors: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  });

  if (process.env.DISABLE_SERVER_LISTEN === '1') {
    logger.warn('Server listen disabled via DISABLE_SERVER_LISTEN=1. Running in no-op mode.');
    const keepAlive = setInterval(() => {
      // no-op interval to keep event loop active
    }, 60_000);
    const shutdown = () => {
      logger.info('Shutting down no-op server process');
      clearInterval(keepAlive);
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    await new Promise<void>(() => { /* keep process alive */ });
  } else {
    await server.start();
  }

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
})();
