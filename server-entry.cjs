#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-undef */
/**
 * Universal server entry point for Electron packaging
 * Supports both development and production builds
 */

const path = require('path');
const fs = require('fs');

// Determine if we're running from a built version or development
const isBuilt = fs.existsSync(path.join(__dirname, 'build', 'node', 'server'));

let serverPath;

if (isBuilt && fs.existsSync(path.join(__dirname, 'build', 'node', 'server', 'fastify.js'))) {
  // Use the new TypeScript-built Fastify server
  serverPath = path.join(__dirname, 'build', 'node', 'server', 'fastify.js');
} else if (fs.existsSync(path.join(__dirname, 'server', 'fastify.ts'))) {
  // Development mode - use tsx to run TypeScript directly
  const { spawn } = require('child_process');
  const server = spawn('npx', ['tsx', path.join(__dirname, 'server', 'fastify.ts')], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('exit', (code) => {
    process.exit(code);
  });
  
  process.exit(0);
} else if (fs.existsSync(path.join(__dirname, 'server', 'server.js'))) {
  // Fallback to old Express server
  serverPath = path.join(__dirname, 'server', 'server.js');
} else {
  console.error('No suitable server file found');
  process.exit(1);
}

// Import and run the server
try {
  require(serverPath);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}