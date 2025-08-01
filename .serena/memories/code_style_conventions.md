# Code Style & Conventions

## TypeScript Configuration
- Strict mode enabled with comprehensive linting rules
- Path alias `@/*` maps to project root
- ES2020 target with ESNext modules
- React JSX transform and DOM libraries included

## Code Organization
- **Frontend**: React 19 with TypeScript and modern hooks
- **Backend**: ES modules (type: "module" in package.json)
- **Database**: Synchronous operations using better-sqlite3
- **Components**: Functional components with hooks

## File Structure
- `components/` - React components
- `services/` - API clients and utilities
- `server/` - Backend Express server and database
- `types.ts` - TypeScript interfaces

## Naming Conventions
- **Components**: PascalCase (e.g., `EmployeeCard.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Database**: snake_case for table names and columns
- **API endpoints**: kebab-case with RESTful patterns

## Database Patterns
- Use transactions for multi-operation database changes
- Prepared statements for performance and security
- Foreign key relationships with proper cascading
- Timestamp tracking with CURRENT_TIMESTAMP defaults

## React Patterns
- Modern functional components with hooks
- Props interfaces defined in TypeScript
- State management with useState and useEffect
- Custom hooks for reusable logic