# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Development Commands

### Web Development
- **Start frontend only**: `npm run dev` (Vite dev server on port 5173)
- **Start backend server**: `npm run server` (Express server on port 3002)
- **Start both frontend and backend**: `npm run dev:full` (requires concurrently)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

### Electron Desktop App
- **Development mode**: `npm run electron:dev` (with DevTools)
- **Production mode**: `npm run electron:build` (run after `npm run build`)
- **Rebuild native modules**: `npm run electron:rebuild` (for better-sqlite3)
- **Build distributables**: `npm run dist:mac` / `npm run dist:win` / `npm run dist:linux`

### TypeScript
- **Type checking**: `tsc --noEmit` (no specific script configured)
- TypeScript configuration: `tsconfig.json` with strict mode enabled

## Environment Setup

### Web Development
- Create `.env.local` file with `GEMINI_API_KEY` for AI-powered performance summaries
- The app uses Vite's environment loading to inject the API key at build time
- Backend server runs on port 3002 and creates a SQLite database for data persistence

### Electron Desktop App
- API keys are managed through Electron's configuration system (`electron-config.js`)
- Configuration stored in OS-specific userData directories:
  - **macOS**: `~/Library/Application Support/Employee Performance Analyzer/config.json`
  - **Windows**: `%APPDATA%/Employee Performance Analyzer/config.json`
  - **Linux**: `~/.config/Employee Performance Analyzer/config.json`
- Database automatically created in userData directory for persistence

## Architecture Overview

This is a full-stack dashboard application with React + TypeScript frontend and Node.js + SQLite backend that analyzes employee performance data from CSV format and generates AI-powered summaries using Google's Gemini API. The application can run as both a web application and an Electron desktop app.

### Deployment Modes
1. **Web Application**: Separate frontend (Vite dev server) and backend (Express server)
2. **Electron Desktop App**: Integrated application with embedded backend server and desktop UI

### Backend Components

- **server/server.js**: Express API server with RESTful endpoints
- **server/database.js**: SQLite database service using better-sqlite3
- **Database**: SQLite database with tables for datasets, employees, and performance scores

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/datasets` - Get all saved datasets
- `GET /api/datasets/:id` - Get specific dataset
- `POST /api/datasets` - Save new dataset
- `DELETE /api/datasets/:id` - Delete dataset
- `GET /api/current-dataset` - Get current active dataset
- `POST /api/current-dataset` - Save current dataset
- `DELETE /api/current-dataset` - Clear current dataset
- `PATCH /api/current-dataset/employee/:name/summary` - Update employee summary

### Frontend Components

#### Core Application
- **App.tsx**: Main dashboard application with sidebar navigation and view routing
- **Sidebar.tsx**: Navigation sidebar with dashboard sections
- **index.tsx**: Application entry point
- **types.ts**: TypeScript interfaces for Employee and CompetencyScore data structures

#### Dashboard Views
- **DashboardOverview.tsx**: Overview dashboard with KPIs, charts, and team metrics
- **EmployeeAnalytics.tsx**: Employee list view with filtering, search, and sorting
- **DataManagement.tsx**: Data import/export and dataset management interface
- **EmployeeCard.tsx**: Individual employee performance visualization with radar charts
- **RekapKinerja.tsx**: Performance recap component
- **TableView.tsx**: Tabular data display component

#### Forms and Dialogs
- **AddEmployeeForm.tsx**: Form for adding new employees
- **EmployeeImport.tsx**: CSV import interface
- **ResolveEmployeesDialog.tsx**: Dialog for resolving employee data conflicts
- **UserProfileForm.tsx**: User profile management

#### Services
- **services/api.ts**: API client for backend communication
- **services/parser.ts**: CSV parsing logic that handles quoted fields and extracts employee competency scores
- **services/csvParser.ts**: Additional CSV parsing utilities
- **services/geminiService.ts**: Google Gemini AI integration for generating performance summaries
- **services/database.ts**: Database service interfaces
- **services/scoringService.ts**: Performance scoring algorithms

### Data Flow

1. **Data Import**: Users import CSV data via drag-drop or paste in Data Management section
2. **Parsing**: Parser extracts employee names from bracketed headers and aggregates competency scores
3. **Storage**: Data is automatically saved to SQLite database with versioning
4. **Visualization**: Dashboard displays data as:
   - Overview KPIs and team metrics with bar/pie charts
   - Individual employee radar charts
   - Filterable employee analytics view
5. **AI Integration**: Users can generate AI-powered performance summaries via Gemini API
6. **Persistence**: All data persists across sessions with dataset management

### Key Technical Details

**Frontend:**
- React 19 with TypeScript and modern hooks
- Vite for fast development and building
- Tailwind CSS for styling with dark mode support
- Recharts for data visualization (radar charts, bar charts, pie charts)
- Custom CSV parser that handles quoted fields and escaped quotes

**Backend:**
- Node.js with Express server
- SQLite database with better-sqlite3 for performance
- RESTful API design with proper error handling
- Automatic data persistence and versioning
- CORS enabled for frontend communication
- Dual deployment: standalone server or embedded in Electron

**Electron Integration:**
- **main.js**: Electron main process with window management and server lifecycle
- **electron-config.js**: Configuration management for desktop app
- Embedded Express server started as child process
- Native module rebuilding for better-sqlite3 compatibility
- Cross-platform packaging for macOS, Windows, and Linux

**Database Schema:**
- `datasets` table: Dataset metadata
- `employees` table: Employee information
- `performance_scores` table: Individual competency scores
- `current_dataset` table: Active dataset tracking

## Getting Started

### Web Application
1. **Install dependencies**: `npm install`
2. **Set up environment**: Create `.env.local` with `GEMINI_API_KEY`
3. **Start the backend server**: `npm run server` (runs on port 3002)
4. **Start the frontend**: `npm run dev` (runs on port 5173)
5. **Or start both**: `npm run dev:full` (requires concurrently package)
6. **Import your CSV data** in the Data Management section
7. **Explore the dashboard** with Overview, Analytics, and Employee views

### Electron Desktop App
1. **Install dependencies**: `npm install`
2. **Build frontend**: `npm run build`
3. **Rebuild native modules**: `npm run electron:rebuild`
4. **Run desktop app**: `npm run electron:build`
5. **Or use development mode**: `npm run electron:dev`
6. **Create distributables**: `npm run dist:mac` (or dist:win/dist:linux)

### Development Workflow
- Use TypeScript strict mode - all code must pass type checking
- Frontend uses React 19 with modern hooks and functional components
- Backend uses ES modules (type: "module" in package.json)
- Database operations use better-sqlite3 for synchronous SQLite access
- AI features require valid Gemini API key configuration

## Dashboard Features

- **Overview Dashboard**: Team KPIs, performance distribution, competency averages
- **Employee Analytics**: Searchable/filterable employee list with performance levels
- **Data Management**: CSV import/export, dataset saving/loading, drag-drop support
- **Persistent Storage**: SQLite database saves all data automatically
- **AI Summaries**: Generate performance summaries using Gemini API
- **Dark Mode**: Full dark mode support across all components

## Common Development Tasks

### CSV Data Processing
- CSV parser handles quoted fields, escaped quotes, and bracketed employee names
- Competency scores are extracted and aggregated per employee
- Data validation and employee resolution for mismatched names
- Support for drag-drop import and paste functionality

### Database Operations
- Database path: `server/performance_analyzer.db` (web) or userData directory (Electron)
- Tables auto-created on first run via `server/database.js`
- Synchronous operations using better-sqlite3 for performance
- Dataset versioning and current dataset management

### Electron Troubleshooting
- **Native module errors**: Run `npm run electron:rebuild` after install
- **Database issues**: Check userData directory permissions
- **Server startup failures**: Verify server/server.js exists and DB_PATH is writable
- **Build issues**: Ensure `npm run build` completes successfully before Electron build
- **API key issues**: Check Electron config file in OS-specific userData directory

### TypeScript Development
- Strict mode enabled with comprehensive linting rules
- Path alias `@/*` maps to project root
- ES2020 target with ESNext modules
- React JSX transform and DOM libraries included