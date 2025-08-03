# REPO CONTEXT
This file contains important context about this repo for [Tonkotsu](https://www.tonkotsu.ai) and helps it work faster and generate better code.

## Initial Setup
```bash
# Install Node.js dependencies
npm install

# Rebuild native modules (required for better-sqlite3)
npm run rebuild:native
```

## Build Commands
```bash
# Development build
npm run build

# Production build  
npm run build:production

# Complete production build with cleanup
npm run build:complete

# Electron build
npm run electron:build
```

## Lint Commands
No dedicated lint scripts are configured. TypeScript checking is done during build via `tsc`.

## Test Commands
```bash
# Test server startup
npm run test:server

# Manual test files in test/ directory - run with node directly:
node test/data-validation-test.js
node test/enhanced-validation-test.js
node test/organizational-level-parsing-test.js
```

## Development Server Commands
```bash
# Run Vite dev server only
npm run dev:vite

# Run both Vite dev server and Electron (full development)
npm run dev

# Run full development with server
npm run dev:full

# Run backend server only
npm run dev:server

# Preview production build
npm run preview
```

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + better-sqlite3
- **Desktop**: Electron
- **Build Tool**: Vite
- **Package Manager**: npm

## Important Notes
- This is an Electron-based desktop app for employee performance monitoring
- Uses better-sqlite3 for database operations (requires native module rebuilding)
- No virtual environment needed (Node.js project)
- Production builds require native module rebuilding for Electron