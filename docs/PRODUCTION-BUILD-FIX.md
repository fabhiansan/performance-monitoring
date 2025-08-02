# Production Build Fix Guide

This document outlines the fixes needed to resolve production build issues in the Employee Performance Analyzer Electron app.

## Issues Fixed

### 1. Server File Path Issue
**Problem**: The main.js was trying to start `server/index.js` but the full API implementation is in `server/server.js`.

**Solution**: Updated `main.js` to use `server/server.js` instead of `server/index.js` in all server path configurations.

**Files Modified**:
- `main.js` - Updated `generateServerPaths()` method

### 2. API Base URL Configuration
**Problem**: The frontend API service was hardcoded to use `http://localhost:3002/api` without proper environment variable handling for production builds.

**Solution**: 
1. Created `.env.production` file with proper API base URL
2. Updated `vite.config.ts` to load environment variables and define them at build time
3. Enhanced API service to properly handle different environments

**Files Created**:
- `.env.production` - Production environment variables

**Files Modified**:
- `vite.config.ts` - Added environment variable loading and build-time definitions
- `services/api.ts` - Already had proper environment handling

## Build Process

### For Development
```bash
# Start frontend and backend separately
npm run dev:vite    # Frontend on port 5173
npm run dev:server  # Backend on port 3002

# Or start both together
npm run dev:full
```

### For Production Build
```bash
# Clean previous builds
npm run build:clean

# Build frontend with production environment
npm run build

# Build Electron app
npm run electron:build

# Or build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## Environment Variables

### Development (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3002/api
GEMINI_API_KEY=your_development_api_key
```

### Production (.env.production)
```env
VITE_API_BASE_URL=http://localhost:3002/api
# GEMINI_API_KEY should be set during build or runtime
```

## Verification Steps

1. **Build the app**:
   ```bash
   npm run build
   npm run electron:build
   ```

2. **Test the packaged app**:
   - Install the generated installer/package
   - Launch the app
   - Verify the server starts correctly
   - Check that API calls work properly
   - Test data import/export functionality

3. **Check logs**:
   - Look for server startup messages
   - Verify API endpoints are available
   - Ensure database initialization works

## Common Issues and Solutions

### Server Not Starting
- **Cause**: Wrong server file path or missing dependencies
- **Solution**: Ensure `server/server.js` exists and all dependencies are included in the build

### API Connection Errors
- **Cause**: Incorrect API base URL or server not running
- **Solution**: Check environment variables and server startup logs

### Database Issues
- **Cause**: SQLite native module not properly rebuilt for Electron
- **Solution**: Run `npm run rebuild:electron` before building

### Missing Files in Build
- **Cause**: Files not included in electron-builder configuration
- **Solution**: Check `package.json` build configuration and ensure all necessary files are included

## File Structure in Production

```
app.asar/
├── dist/                 # Frontend build files
├── server/
│   ├── server.js        # Main server file (fixed)
│   ├── database.js      # Database operations
│   └── *.db            # SQLite database files
├── main.js              # Electron main process (fixed)
├── package.json
└── node_modules/
    └── better-sqlite3/  # Native module
```

## Testing Production Build

1. **Local Testing**:
   ```bash
   # Build and test locally
   npm run build
   npm run preview  # Test frontend build
   npm run electron # Test Electron app
   ```

2. **Full Production Test**:
   ```bash
   # Complete build process
   npm run build:clean
   npm run build
   npm run electron:build
   
   # Test the generated installer
   # Install and run the app
   ```

## Notes

- The server always runs on port 3002 in both development and production
- Environment variables are loaded at build time for the frontend
- The Electron app includes its own backend server
- Database files are created in the user's data directory
- Native modules (better-sqlite3) must be rebuilt for Electron

## Troubleshooting Commands

```bash
# Rebuild native modules
npm run rebuild:electron

# Check native module compatibility
npm run check:native

# Debug server startup
npm run debug:server

# Test server independently
npm run test:server
```