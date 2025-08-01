# Suggested Commands

## Development Commands

### Web Development
- `npm run dev:vite` - Start frontend only (Vite dev server on port 5173)
- `npm run server:node` - Start backend server (Express server on port 3001)
- `npm run dev:full` - Start both frontend and backend (requires concurrently)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm install` - Install dependencies
- `npm run rebuild:node` - Rebuild native modules for web mode

### Electron Desktop App
- `npm run dev` - Development mode (runs both Vite and Electron)
- `npm run electron:dev` - Individual Electron dev (requires Vite running separately)
- `npm run electron:build` - Production mode (run after npm run build)
- `npm run dist` / `npm run dist:mac` / `npm run dist:win` / `npm run dist:linux` - Build distributables

### TypeScript & Quality
- `tsc --noEmit` - Type checking (no specific script configured)

### System Commands (Darwin/macOS)
- `ls` - List directory contents
- `cd` - Change directory
- `grep` - Search text patterns
- `find` - Find files and directories
- `git` - Version control operations

### Database Operations
- Database automatically created at `server/performance_analyzer.db` (web) or userData directory (Electron)
- Native module rebuilding via `npm run rebuild:node` or automatic `postinstall` script