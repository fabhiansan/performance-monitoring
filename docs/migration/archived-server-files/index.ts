import express, { type Express, type Request, type Response } from 'express';
import type { Server as HttpServer } from 'http';
import DatabaseService from './database';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../services/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Server {
  private app: Express;
  private database: DatabaseService;
  private server: HttpServer | null;
  constructor() {
    this.app = express();
    this.database = new DatabaseService();
    this.server = null;
  }

  async initialize(): Promise<boolean> {
    try {
      // Initialize database with error handling
      await this.database.initialize();
      
      // Setup Express middleware and routes
      this.setupMiddleware();
      this.setupRoutes();
      
      return true;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Server initialization failed', { 
        error: message,
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      process.stderr.write(JSON.stringify({
        type: 'server-error',
        message,
        timestamp: new Date().toISOString()
      }) + '\n');
      
      process.exit(1);
    }
  }

  setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../dist')));
  }

  setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        database: this.database.isReady(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Database status endpoint
    this.app.get('/api/database/status', (_req: Request, res: Response) => {
      if (this.database.isReady()) {
        res.json({ status: 'connected' });
      } else {
        res.status(500).json({
          status: 'error',
          details: this.database.getErrorDetails()
        });
      }
    });
  }

  async start(port = 3000): Promise<void> {
    await this.initialize();

    this.server = this.app.listen(port, () => {
      logger.info('Server started successfully', { port });
      
      // Signal to Electron that server is ready
      process.stdout.write(JSON.stringify({
        type: 'server-ready',
        port: port,
        timestamp: new Date().toISOString()
      }) + '\n');
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
    this.database.close();
  }
}

const serverInstance = new Server();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await serverInstance.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await serverInstance.stop();
  process.exit(0);
});

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  serverInstance.start(port).catch(error => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start server', { 
      error: message,
      stack: error instanceof Error ? error.stack : undefined 
    });
    process.exit(1);
  });
}

export default Server;
