# Employee Performance Analyzer - Development Guide

## Build & Development Commands
- `npm install` - Install dependencies (auto-rebuilds native modules)
- `npm run dev` - Frontend + Electron development mode
- `npm run dev:full` - Full stack development (includes API server)
- `npm run build` - Build web bundle with Vite
- `npm run test` - Run all tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Open Vitest UI
- `npm run lint:check` - Check for linting errors
- `npm run lint:fix` - Auto-fix linting issues
- `npm run check-types` - TypeScript type checking

## Code Style Guidelines

### TypeScript
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Define interfaces in `types.ts` (PascalCase: `Employee`, `CompetencyScore`)
- Use camelCase for properties and functions
- Always define return types for functions
- Use `@/` alias for absolute imports from root

### React Components
- Use functional components with hooks
- PascalCase file names: `EmployeeCard.tsx`
- Default exports for components
- Define explicit prop interfaces
- Use `useCallback` for event handlers, `useMemo` for expensive calculations

### Error Handling
- Use custom error classes from `services/errorHandler.ts`
- Handle errors with proper typing: `AppError`, `NetworkError`, `ServerError`, `ValidationError`
- Use global ErrorContext for error management
- Display errors with ErrorDisplay component

### Testing
- Use Vitest with jsdom environment
- Test files: `*.test.ts` or `*.test.tsx`
- Unit tests in `src/__tests__/`, integration tests in `test/`
- Use `describe`, `it`, `expect` patterns
- Mock external dependencies and API calls

### Project Structure
- Components: `components/` (PascalCase)
- Services: `services/` (camelCase)
- Server: `server/` directory
- Types: `types.ts`
- Constants: `constants/`
- Utils: `utils/`

### Database & API
- SQLite with better-sqlite3
- API responses use `ApiResponse<T>` interface
- Server runs on port 3002, frontend on port 5173
- Use prepared statements for database operations

### Git Workflow
- Conventional commits: `feat:`, `fix:`, `refactor:`
- Test changes before committing
- Run `npm run lint:check` and `npm run check-types` before pushing