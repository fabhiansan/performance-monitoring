import './server/server';

console.log('Server started and will keep running...');

// Keep the process alive
setInterval(() => {
  // This function is intentionally empty. Its purpose is to prevent the script from exiting.
}, 1000 * 60 * 60); // Run every hour

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server is shutting down...');
  process.exit(0);
});
