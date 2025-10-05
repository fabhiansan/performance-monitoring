# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Guidelines
## GUIDELINES
- **NEVER IGNORE TYPESCRIPT AND ESLINT ERROR**
- **NEVER USE MOCKUP DATA OR HARDCODED VALUES** -> Immediately implement the backend
- **NEVER MAKES A SHORT TERM SOLUTION** -> It will cause the code to be unmaintainable in the long run
- **Less Code = Better Code**

## ANTI-OVER-ENGINEERING PRINCIPLES
**Core Philosophy: WORKING > BEAUTIFUL**
- **NO complex abstractions when simple solutions work**
- **NO creating multiple versions of the same component**
- **NO elaborate error handling that masks real issues**
- **NO premature optimization or "future-proofing"**
- **NO custom implementations when standard solutions exist**

### 🎯 DECISION FRAMEWORK
When implementing features, ask:
1. **Does a simple solution already exist?** → Use it
2. **Can I copy a working pattern?** → Copy it
3. **Will this work in 5 minutes?** → Choose that over "perfect" solution
4. **Am I adding abstraction layers?** → Probably over-engineering
5. **Would HTML/CSS/basic JS solve this?** → Use those first

### 🚨 WARNING SIGNS OF OVER-ENGINEERING
- Creating "reusable" components used only once
- Adding configuration options "for flexibility"
- Complex type hierarchies with minimal usage
- Custom hooks that wrap standard functionality
- Multiple files for simple features
- Abstract base classes with single implementations

### Web Development
- **Start frontend only**: `pnpm run dev:vite` (Vite dev server on port 5173)
- **Start backend server**: `pnpm run server:node` (Fastify server on port 3002)
- **Start both frontend and backend**: `pnpm run dev:full` (web app development - frontend + backend)
- **Build for production**: `pnpm run build`
- **Preview production build**: `pnpm run preview`
- **Install dependencies**: `pnpm install`
- **Rebuild native modules**: `pnpm run rebuild:node` (for better-sqlite3 in web mode)

### Electron Desktop App
- **Development mode**: `pnpm run dev` (Electron app with embedded server - auto-rebuilds native modules)
- **Individual Electron dev**: `pnpm run electron:dev` (requires Vite running separately, auto-rebuilds for Electron)
- **Production mode**: `pnpm run electron:build` (run after `pnpm run build`)
- **Build distributables**: `pnpm run dist` / `pnpm run dist:mac` / `pnpm run dist:win` / `pnpm run dist:linux`
- **Rebuild native modules**: Use `pnpm run rebuild:node` for web mode or `pnpm run rebuild:electron` for Electron

### TypeScript & Code Quality
- **Type checking**: `pnpm run check-types` (both frontend and backend), `pnpm run check-types:frontend`, `pnpm run check-types:backend`
- **Linting**: `pnpm run lint:check` (check), `pnpm run lint:fix` (auto-fix), `pnpm run lint:check:quiet` (quiet mode)
- **Testing**: `pnpm test` (run tests), `pnpm run test:watch` (watch mode), `pnpm run test:ui` (Vitest UI), `pnpm run test:run` (single run)
- TypeScript configuration: `tsconfig.json` with strict mode enabled, `tsconfig.node.json` for server-side code

## Environment Setup

### Web Development
- Create `.env.local` file with `GEMINI_API_KEY` for AI-powered performance summaries
- The app uses Vite's environment loading to inject the API key at build time
- Backend server runs on port 3002 and creates a SQLite database for data persistence

### Electron Desktop App
- API keys are managed through Electron's configuration system (`electron-config.ts`)
- Configuration stored in OS-specific userData directories:
  - **macOS**: `~/Library/Application Support/Employee Performance Analyzer/config.json`
  - **Windows**: `%APPDATA%/Employee Performance Analyzer/config.json`
  - **Linux**: `~/.config/Employee Performance Analyzer/config.json`
- Database automatically created in userData directory for persistence

## Architecture Overview

This is a full-stack dashboard application with React + TypeScript frontend and Node.js + SQLite backend that analyzes employee performance data from CSV format and generates AI-powered summaries using Google's Gemini API. The application can run as both a web application and an Electron desktop app.

### Deployment Modes
1. **Web Application**: Separate frontend (Vite dev server) and backend (Fastify server)
2. **Electron Desktop App**: Integrated application with embedded backend server and desktop UI

### Backend Components

- **server/server.ts**: Main server entry point (TypeScript, compiled to build/node/)
- **server/fastifyServer.ts**: Fastify server implementation with Swagger/OpenAPI
- **server/database.ts**: SQLite database service using better-sqlite3 and Kysely
- **Database**: SQLite database with tables for datasets, employees, and performance scores
- **Build system**: TypeScript compilation via `pnpm run build:node` to build/node/ directory

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
- **components/layout/Sidebar.tsx**: Navigation sidebar with dashboard sections
- **index.tsx**: Application entry point
- **types.ts**: TypeScript interfaces for Employee and CompetencyScore data structures

#### Dashboard Views
- **components/dashboard/DashboardOverview.tsx**: Overview dashboard with KPIs, charts, and team metrics
- **components/employees/EmployeeAnalytics.tsx**: Employee list view with filtering, search, and sorting
- **components/data/DataManagement.tsx**: Data import/export and dataset management interface
- **components/employees/EmployeeCard.tsx**: Individual employee performance visualization with radar charts
- **components/dashboard/RekapKinerja.tsx**: Performance recap component
- **components/dashboard/TableView.tsx**: Tabular data display component

#### Forms and Dialogs
- **components/employees/AddEmployeeForm.tsx**: Form for adding new employees
- **components/employees/EmployeeImport.tsx**: CSV import interface
- **components/shared/ResolveEmployeesDialog.tsx**: Dialog for resolving employee data conflicts

#### Services
- **services/api.ts**: API client for backend communication
- **services/parser.ts**: CSV parsing logic that handles quoted fields and extracts employee competency scores
- **services/csvParser.ts**: Additional CSV parsing utilities
- **services/database/enhancedDatabaseService.ts**: Database service interfaces
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
- Zustand for state management with React Query for server state

**Backend:**
- Node.js with Fastify server
- SQLite database with better-sqlite3 for performance
- Kysely for type-safe database queries
- RESTful API design with proper error handling
- Automatic data persistence and versioning
- CORS enabled for frontend communication
- Dual deployment: standalone server or embedded in Electron

**Electron Integration:**
- **main.ts**: Electron main process with window management and server lifecycle (TypeScript)
- **electron-config.ts**: Configuration management for desktop app (TypeScript)
- Embedded Fastify server started as child process
- Native module rebuilding for better-sqlite3 compatibility
- Cross-platform packaging for macOS, Windows, and Linux
- Automatic native module rebuilds via postinstall script

**Database Schema:**
- `datasets` table: Dataset metadata
- `employees` table: Employee information
- `performance_scores` table: Individual competency scores
- `current_dataset` table: Active dataset tracking

## Getting Started

### Web Application
1. **Install dependencies**: `pnpm install`
2. **Set up environment**: Create `.env.local` with `GEMINI_API_KEY`
3. **Start the backend server**: `pnpm run server:node` (runs on port 3002)
4. **Start the frontend**: `pnpm run dev:vite` (runs on port 5173)
5. **Or start both**: `pnpm run dev:full` (requires concurrently package)
6. **Import your CSV data** in the Data Management section
7. **Explore the dashboard** with Overview, Analytics, and Employee views

### Electron Desktop App
1. **Install dependencies**: `pnpm install`
2. **Build frontend**: `pnpm run build`
3. **Rebuild native modules**: Native modules are rebuilt automatically via `postinstall` script
4. **Run desktop app**: `pnpm run electron:build`
5. **Or use development mode**: `pnpm run dev` (starts both Vite and Electron)
6. **Create distributables**: `pnpm run dist:mac` (or dist:win/dist:linux)

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
- Supports both numeric scores (10, 65, 75, etc.) and string ratings ("Baik", "Sangat Baik", "Kurang Baik")
- String rating mapping: "Kurang Baik" → 65, "Baik" → 75, "Sangat Baik" → 85
- Data validation and employee resolution for mismatched names
- Support for drag-drop import and paste functionality

### Database Operations
- Database path: `server/performance_analyzer.db` (web) or userData directory (Electron)
- Tables auto-created on first run via `server/database.ts`
- Synchronous operations using better-sqlite3 for performance
- Type-safe queries using Kysely query builder
- Dataset versioning and current dataset management

### Electron Troubleshooting
- **Native module errors**: Use `pnpm run rebuild:electron` for Electron or `pnpm run rebuild:node` for web development
- **Better-sqlite3 binding errors**: Run the correct rebuild command for your target environment (Node.js vs Electron)
- **Wrong development mode**: Use `pnpm run dev` for Electron app, `pnpm run dev:full` for web app (they are different!)
- **Database issues**: Check userData directory permissions
- **Server startup failures**: Verify server/server.ts exists and DB_PATH is writable
- **Build issues**: Ensure `pnpm run build` completes successfully before Electron build
- **API key issues**: Check Electron config file in OS-specific userData directory
- **Development server issues**: Use `pnpm run dev` for integrated development or `pnpm run electron:dev` if running Vite separately

### TypeScript Development
- Strict mode enabled with comprehensive linting rules (ESLint + SonarJS)
- Path alias `@/*` maps to project root
- ES2020 target with ESNext modules
- React JSX transform and DOM libraries included
- Separate configurations: `tsconfig.json` (frontend) and `tsconfig.node.json` (backend)
- Code quality standards: max line length 500 chars, cognitive complexity limit 20
- Testing with Vitest and TDD-Guard integration

## Code Quality Standards

### ESLint Configuration
- Comprehensive ESLint setup with TypeScript, React, and SonarJS plugins
- Maximum line length: 500 characters
- Cognitive complexity limit: 20 (25 for tests)
- Strict TypeScript rules with `no-explicit-any` enforcement
- Separate configurations for frontend, backend, and test files

### Testing Framework
- **Primary framework**: Vitest with jsdom environment
- **Test organization**: Unit tests in `src/__tests__/`, integration tests in `test/`
- **Coverage and UI**: `pnpm run test:ui` for interactive test interface
- **Watch mode**: `pnpm run test:watch` for continuous testing during development

### Development Patterns
- **Error handling**: Custom error classes (`AppError`, `NetworkError`, `ServerError`, `ValidationError`)
- **API responses**: Consistent `ApiResponse<T>` interface with success/error/metadata
- **Component patterns**: Functional components with hooks, explicit prop interfaces
- **Service layer**: Dedicated service files for business logic, database operations in `enhancedDatabaseService.ts`
- **Validation**: Server-side validation middleware, client-side validation service

### Package Management
- **Use pnpm** (version 10.15.1+) as the package manager
- Native modules automatically rebuilt via postinstall script
- Better-sqlite3 requires native compilation for both Node.js and Electron targets
- Use `pnpm run check:native` to verify native module compatibility

### Design System
- Component library in `design-system/` directory
- Design tokens in `constants/designTokens.ts`
- Reusable UI patterns in `components/shared/ui-patterns/`
- Consistent styling with Tailwind CSS and custom design tokens
