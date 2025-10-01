# Employee Performance Analyzer - Knowledge Base

## Project Overview

Full-stack dashboard application for analyzing employee performance data from CSV format. Built with React + TypeScript frontend and Node.js + SQLite backend. Generates AI-powered summaries using Google's Gemini API.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Desktop**: Electron wrapper with embedded server
- **Database**: SQLite with auto-creation and versioning

## Development Modes

1. **Web Development**: `npm run dev:full` (starts both Vite on :5173 and Express on :3002)
2. **Electron Development**: `npm run dev` (starts Vite + Electron app)
3. **Individual processes**:
   - Frontend only: `npm run dev:vite`
   - Backend only: `npm run server:node`
   - Electron only: `npm run electron:dev` (requires Vite running)

## Key Development Notes

- **Native modules**: better-sqlite3 requires rebuilding for Node.js vs Electron
  - Web dev: `npm run rebuild:node`
  - Electron dev: `npm run rebuild:electron` (auto-run via preelectron scripts)
- **Database**: Auto-created at `server/performance_analyzer.db` (web) or userData directory (Electron)
- **Environment**: `.env.local` with `GEMINI_API_KEY` for AI features
- **TypeScript**: Strict mode enabled, must pass type checking

## Data Flow

1. CSV import via drag-drop or paste
2. Parser extracts employee names from bracketed headers
3. Competency scores aggregated per employee
4. SQLite persistence with dataset versioning
5. Dashboard visualization with charts and analytics
6. AI-powered performance summaries via Gemini API

## Common Issues

- **Build failures**: Run correct rebuild command for target environment
- **Database errors**: Check file permissions and paths
- **Development server conflicts**: Use correct npm script for intended mode
- **API key issues**: Verify environment configuration