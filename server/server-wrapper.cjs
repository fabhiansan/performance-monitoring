// CommonJS wrapper for ES module server
// This file provides compatibility for environments that have trouble with ES modules

const { pathToFileURL } = require('url');
const path = require('path');

async function startServer() {
  try {
    // Try to import the ES module version first
    const serverPath = path.join(__dirname, 'server.mjs');
    const serverModule = await import(pathToFileURL(serverPath).href);
    console.log('Successfully loaded ES module server via CommonJS wrapper');
    return serverModule.default;
  } catch (error) {
    console.error('Failed to load ES module server:', error.message);
    
    // Fallback to the original .js file
    try {
      const serverPath = path.join(__dirname, 'server.js');
      const serverModule = await import(pathToFileURL(serverPath).href);
      console.log('Successfully loaded .js server as fallback');
      return serverModule.default;
    } catch (fallbackError) {
      console.error('Failed to load fallback server:', fallbackError.message);
      throw fallbackError;
    }
  }
}

// Start the server
startServer().catch(error => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});