/**
 * Fastify Server Entry Point
 * 
 * Modern TypeScript-first server startup
 */

import { FastifyServer } from './fastifyServer';
import { logger } from '../services/logger';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
const host = process.env.HOST || '0.0.0.0';

const server = new FastifyServer({
  port,
  host,
  dbPath: process.env.DB_PATH || null,
  enableSwagger: process.env.NODE_ENV !== 'production',
  enableCors: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
});

// Start server
server.start().catch((error) => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});