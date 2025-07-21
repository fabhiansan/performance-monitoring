// CommonJS wrapper for main.js to handle ES module imports on Windows
const { pathToFileURL } = require('url');
const path = require('path');

// Import the ES module main.js dynamically
async function startApp() {
  try {
    const mainModulePath = path.join(__dirname, 'main.js');
    const mainModuleUrl = pathToFileURL(mainModulePath).href;
    await import(mainModuleUrl);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

startApp();
