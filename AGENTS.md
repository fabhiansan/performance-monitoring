# Repository Guidelines

## Project Structure & Module Organization
The Electron + Vite frontend boots from `App.tsx`; key directories:
- `components/` (dashboard, employees, reporting, shared UI primitives) and `design-system/` for reusable styling.
- `hooks/`, `contexts/`, and `services/` centralize data access, state, and side-effects.
- `server/` contains the Fastify backend and bootstrapping scripts; `build/node/` holds its compiled output.
- Shared resources live in `assets/`, `constants/`, `middleware/`, and `utils/`.
- Tests sit in `test/` (integration and service suites) and `src/__tests__/` (component-level specs); `dist/` and `release/` are generated artifacts.

## Build, Test, and Development Commands
Run `pnpm install` once, then use:
- `pnpm run dev` to launch Vite and Electron together for the desktop experience.
- `pnpm run dev:full` if you also need the Node server (`pnpm run server:node`) alongside the UI.
- `pnpm run build` for a quick Vite bundle; `pnpm run build:production` and `pnpm run dist` generate distributable desktop builds.
- `pnpm run lint:check`, `pnpm run check-types`, and `pnpm test` keep lint, types, and tests green; append `:watch` for iterative work.
- `pnpm run rebuild:electron` repairs native modules after Node/Electron upgrades.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation and double quotes per ESLint config. Prefer functional React components and hooks; colocate styles via Tailwind utility classes from `tailwind.config.ts`. Name components and contexts in `PascalCase`, hooks in `camelCase` with a `use` prefix, and exported constants in `SCREAMING_SNAKE_CASE`. Run `pnpm run lint:fix` before pushing.

## Testing Guidelines
Vitest powers the suite; React Testing Library and MSW support UI and network simulation. Place new specs near peers using the pattern `*.test.ts` or `*.test.tsx`. Integration flows belong in `test/` beside fixtures. Cover new behaviors, run `pnpm test` locally, and add edge-case assertions for database access or async hooks.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commits style (`feat:`, `fix:`, `chore:`) with imperative summaries under 72 characters and descriptive bodies when needed. PRs should link tracking issues, outline the motivation and testing, and attach screenshots or GIFs for UI changes. Request reviewers once lint, type checks, and tests pass via the commands above.

## Environment & Configuration Notes
Use Node 20+ and PNPM 10+ to match the lockfile. Server scripts respect `DB_PATH`, `SERVER_HOST`, and `DISABLE_SERVER_LISTEN`; note custom values in the PR. After upgrading Electron or native dependencies, run `pnpm run check:native` to confirm `better-sqlite3` bindings build correctly.
