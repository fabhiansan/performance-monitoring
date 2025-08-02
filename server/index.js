import express from 'express';
import DatabaseService from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Server {
  constructor() {
    this.app = express();
    this.database = new DatabaseService();
    this.server = null;
  }

  async initialize() {
    try {
      // Initialize database with error handling
      const dbResult = await this.database.initialize();
      
      if (!dbResult.success) {
        console.error('Server startup failed due to database error');
        
        // Send structured error information to stderr for Electron to capture
        process.stderr.write(JSON.stringify({
          type: 'database-error',
          details: dbResult.error,
          timestamp: new Date().toISOString()
        }) + '\n');
        
        // Exit with specific code for native module issues
        process.exit(1);
      }
      
      // Setup Express middleware and routes
      this.setupMiddleware();
      this.setupRoutes();
      
      return true;
      
    } catch (error) {
      console.error('Server initialization failed:', error);
      
      process.stderr.write(JSON.stringify({
        type: 'server-error',
        message: error.message,
        timestamp: new Date().toISOString()
      }) + '\n');
      
      process.exit(1);
    }
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../dist')));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        database: this.database.isReady(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Database status endpoint
    this.app.get('/api/database/status', (req, res) => {
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

  async start(port = 3000) {
    await this.initialize();
    
    this.server = this.app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
      
      // Signal to Electron that server is ready
      process.stdout.write(JSON.stringify({
        type: 'server-ready',
        port: port,
        timestamp: new Date().toISOString()
      }) + '\n');
    });
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
    this.database.close();
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Server();
  const port = process.env.PORT || 3000;
  server.start(port).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default Server;
