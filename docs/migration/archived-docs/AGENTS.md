# Repository Guidelines

## Project Structure & Module Organization
Entry points `index.tsx`/`App.tsx` render the React SPA; Electron boot lives in `main.js`. UI components sit in `components/`, contexts/state hooks in `contexts/`, data access in `services/` and `utils/`, constants in `constants/`. The Express + better-sqlite3 backend is under `server/` with support modules in `middleware/` and `scripts/`. Static assets stay in `assets/`; build outputs land in `dist/` and installers in `release/`. Tests live in `src/__tests__` for focused specs and `test/` for integration runs that rely on `sample-data/`.

## Build, Test & Development Commands
Run `npm install` once, then `npm run check:native` if native modules change. `npm run dev` starts Vite and Electron, while `npm run dev:full` also boots the API server. Use `npm run server:start` when iterating on backend-only changes. Build web bundles with `npm run build` and full distributables via `npm run build:complete` or platform targets (`npm run dist:win|mac|linux`). Default tests run with `npm test`; `npm run test:watch` keeps Vitest hot, and `npm run test:server` smokes backend startup.

## Coding Style & Naming Conventions
Honor the strict TypeScript settings in `tsconfig.json`. Stick to two-space indentation, PascalCase component files (`EmployeeAnalytics.tsx`), camelCase helpers, and SCREAMING_SNAKE_CASE constants. Keep imports relative to feature folders and reserve barrel files for stable APIs. Before pushing, run `npm run build` (or `vite`) to catch typing or JSX regressions.

## Testing Guidelines
Vitest powers unit coverage; name specs `*.test.ts` or `*.test.tsx` and colocate them with source or in `src/__tests__`. Use the `test/` directory for integration and parsing suites that leverage fixtures from `test/fixtures` and `sample-data/`. Add tests for scoring logic, refresh flows, and data migrations when touched, and include new fixtures whenever schemas evolve.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes such as `feat:`, `fix:`, `refactor:`, mirroring recent history. Keep messages imperative and scoped to one change. Pull requests should summarize intent, list the scripts or tests executed, link issues, and attach UI evidence when visual output shifts. Call out database or Electron packaging impacts so reviewers can retest those areas.

## Environment & Security Notes
Target Node 20+ per `package.json`. After dependency upgrades run `npm run rebuild:electron` to refresh native bindings. Keep SQLite data in local copies (`test.db`) and avoid committing sensitive config; audit changes to `electron-config.*` before release.
