# Employee Performance Analyzer - Project Documentation

## Project Overview

The Employee Performance Analyzer is a desktop application built with Electron that provides a comprehensive dashboard for monitoring employee performance in the Social Services Department (Dinas Sosial). The application features employee data management, performance analytics, and reporting capabilities with a modern React frontend and Fastify backend.

### Key Features
- Employee data management with CRUD operations
- Performance analytics and dashboard visualization
- Data import/export functionality with CSV support
- PDF report generation
- Session-based dataset management
- Responsive UI with dark/light mode support

### Architecture
- **Frontend**: React 19 with TypeScript, Vite build system
- **Backend**: Fastify server with TypeScript
- **Database**: SQLite with Kysely ORM
- **Desktop**: Electron with auto-updater
- **UI Framework**: Custom design system with Tailwind CSS
- **State Management**: React Query for server state, Zustand for local state
- **API Validation**: Shared Zod schemas between frontend and backend

## Building and Running

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 10.15.1
- Git

### Initial Setup
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables in `.env` or `.env.local`:
   - `GEMINI_API_KEY` for AI features
   - `VITE_API_BASE_URL` for API endpoints (defaults to `http://localhost:3002/api`)

### Development Commands

#### Running the Application
- `pnpm run dev` - Run the Electron app in development mode (frontend + backend)
- `pnpm run dev:vite` - Run only the Vite dev server (frontend only)
- `pnpm run dev:electron` - Run only the Electron app (after starting the backend separately)
- `pnpm run server:start` - Run only the backend server (Fastify)

#### Building the Application
- `pnpm run build` - Build only the frontend (for Vite)
- `pnpm run build:node` - Build only the backend (TypeScript compilation)
- `pnpm run build:production` - Build both frontend and backend for production
- `pnpm run build:complete` - Clean build and package the entire application

#### Packaging for Distribution
- `pnpm run dist` - Build and package for the current platform
- `pnpm run dist:win` - Build and package for Windows
- `pnpm run dist:mac` - Build and package for macOS
- `pnpm run dist:linux` - Build and package for Linux

#### Testing
- `pnpm run test` - Run unit tests in watch mode
- `pnpm run test:run` - Run unit tests once
- `pnpm run test:ui` - Open Vitest UI
- `pnpm run test:server` - Run backend server tests

#### Linting and Type Checking
- `pnpm run lint:check` - Check code for linting issues
- `pnpm run lint:fix` - Automatically fix linting issues
- `pnpm run check-types` - Run TypeScript type checking for both frontend and backend
- `pnpm run check-types:frontend` - Frontend-only type checking
- `pnpm run check-types:backend` - Backend-only type checking

### Native Dependencies
The application uses `better-sqlite3` which may require native compilation:
- `pnpm run rebuild:native` - Rebuild native modules
- `pnpm run rebuild:electron` - Rebuild native modules for Electron
- `pnpm run check:native` - Check if native modules are working

## Development Conventions

### Code Style
- **TypeScript**: Strict mode with comprehensive error checking
- **ESLint**: Enforces code quality with React, TypeScript, and SonarJS rules
- **Prettier**: Code formatting with 500-character line length limit for code (as configured in ESLint)
- **Cognitive Complexity**: Functions should not exceed complexity of 20 (enforced by SonarJS)

### Naming Conventions
- **Components**: PascalCase (e.g., `DashboardOverview.tsx`, `EmployeeManagement.tsx`)
- **Hooks**: camelCase starting with `use` (e.g., `useEmployees.ts`, `useSessionManager.ts`)
- **Services**: camelCase ending with `Service` (e.g., `reportGenerationService.ts`)
- **Schemas**: PascalCase ending with `Schema` (e.g., `employee.schemas.ts`)

### File Structure
```
employee-performance-analyzer/
├── components/              # React components
│   ├── dashboard/           # Dashboard-related components
│   ├── employees/           # Employee management components
│   ├── layout/              # Layout components (Sidebar, etc.)
│   ├── reporting/           # PDF report components
│   └── shared/              # Shared components (ErrorBoundary, etc.)
├── contexts/                # React Context providers
├── design-system/           # Design system components and tokens
├── hooks/                   # React hooks for data fetching and state
├── schemas/                 # Zod schemas for validation
├── services/                # Backend services and utilities
├── server/                  # Backend Fastify server implementation
├── types.ts                 # Shared TypeScript types
├── App.tsx                  # Main application component
├── main.ts                  # Electron main process
└── server/                  # Backend server implementation
```

### API and Data Flow
- **Frontend**: Uses React Query (TanStack Query) for server state management
- **Backend**: Fastify server with typed endpoints using Zod schemas
- **Validation**: Shared Zod schemas between frontend and backend for consistency
- **Communication**: API calls via fetch, with structured error handling

### Error Handling
- **Frontend**: Centralized error context with user-friendly messages
- **Backend**: Structured logging with Pino, comprehensive error responses
- **Validation**: Zod schemas for runtime validation, comprehensive error messages

### Testing
- **Unit Tests**: Vitest with React Testing Library
- **API Tests**: Vitest with Supertest for backend endpoints
- **E2E Tests**: Playwright for cross-platform testing
- **Mocking**: MSW (Mock Service Worker) for API mocking during development

### Internationalization
- The application supports Indonesian language (Bahasa Indonesia)
- Error messages and UI elements are localized in Indonesian
- Date/time formats follow Indonesian conventions

## Key Technologies and Libraries

### Frontend
- React 19 with hooks and modern patterns
- TypeScript with strict mode
- Vite for fast development and builds
- Tailwind CSS with custom design tokens
- React Query for server state management
- React Hook Form with Zod for form validation
- Recharts for data visualization
- Headless UI/Radix UI for accessible components
- html2canvas and jsPDF for PDF generation

### Backend
- Fastify for high-performance server
- TypeScript for type safety
- Kysely for type-safe SQL queries
- Better-sqlite3 for database operations
- Zod for schema validation
- Pino for structured logging
- OpenAPI/Swagger for API documentation

### Desktop
- Electron for cross-platform desktop distribution
- electron-builder for packaging and auto-updates
- IPC for communication between renderer and main processes

### Development
- pnpm for fast, disk-efficient package management
- ESLint with React, TypeScript, and SonarJS rules
- Prettier for consistent code formatting
- Vitest for fast testing
- TypeScript path aliases for cleaner imports

## Notable Configuration Files

- `vite.config.ts` - Frontend build configuration
- `tsconfig.json` and `tsconfig.node.json` - TypeScript configurations
- `tailwind.config.ts` - Styling configuration
- `electron-config.ts` - Electron-specific configuration
- `server/fastifyServer.ts` - Backend server implementation
- `schemas/` - Shared validation schemas
- `eslint.config.js` - Code quality rules
- `MIGRATION_PLAN.md` - Detailed migration roadmap and architecture decisions

## Project Status

The application has undergone a major rewrite transitioning from older JavaScript-based architecture to a modern TypeScript stack with React, Fastify, and Electron. The migration has been completed with:

- Modern React architecture with TanStack Query
- Complete design system with accessibility compliance
- Type-safe API contracts with shared Zod schemas
- Fastify backend with Kysely ORM
- Professional error handling and loading states
- Comprehensive testing setup
- Structured logging with Pino
- OpenAPI documentation
- Enhanced PDF/export flows with service modules

The project is actively maintained with comprehensive documentation in `MIGRATION_PLAN.md` detailing the architectural decisions and implementation steps.

## Environment Variables

- `GEMINI_API_KEY`: Gemini API key for AI features (required for some functionality)
- `PORT`: Backend server port (defaults to 3002)
- `DB_PATH`: Database file path (defaults to local SQLite file)
- `NODE_ENV`: Environment mode (development/production)
- `VITE_API_BASE_URL`: API base URL for frontend (defaults to `http://localhost:3002/api`)
- `VITE_LOG_LEVEL`: Frontend logging level (DEBUG, INFO, WARN, ERROR)
- `LOG_LEVEL`: Backend logging level (DEBUG, INFO, WARN, ERROR)