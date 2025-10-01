# Team A Phase 0 Discovery – 2025-02-15

## Scope
- Catalogued current user-facing surfaces (screens, dialogs, exports, Electron shell) per MIGRATION_PLAN.md Phase 0 deliverables.
- Logged initial accessibility/usability concerns requiring action during redesign.
- Captured build-time performance signals and outlined how to gather in-app journey timings once instrumentation lands.

## UI Inventory

### Primary Views
| View ID            | Component Reference | Purpose & Key Features | Primary Data Dependencies | Notes |
|--------------------|---------------------|------------------------|---------------------------|-------|
| `overview`         | `components/DashboardOverview.tsx:1` | Dashboard summary with Recharts bar visualisations, legacy performance level badges, responsive container sizing logic. | `Employee[]`, organizational mapping hash | High LOC (550+) with bespoke layout utilities; relies on `utils/useResizeObserver` for layout and has duplicated performance tier metadata alongside `constants/ui` definitions. |
| `analytics`        | `components/EmployeeAnalytics.tsx:1` | Filterable employee cards with search, sort, and TanStack-style filtering implemented locally. | `Employee[]` | Native `<select>` elements rendered without label associations (`id`/`htmlFor`), and conditional filter panel lacks focus management. |
| `rekap-kinerja`    | `components/RekapKinerja.tsx:1` | Detailed recap tables and weight calculations; exposes manual scoring modal and competency breakdown. | `Employee[]`, derived recap metrics | Contains bespoke fixed-position modal overlay (no design-system usage) and large in-component calculation helpers; candidate for hook extraction. |
| `report`           | `components/Report.tsx:1` | Generates printable/PDF performance reports per employee via `html2canvas` + `jspdf`. | `Employee[]` | Blocks UI during PDF generation; UI controls mix Indonesian labels with unbound form fields. |
| `employee-management` | `components/EmployeeManagement.tsx:1` | CRUD for employee roster, CSV import, bulk actions, integration with API client. | `api.getAllEmployees`, manual refresh callback | Relies on imperative `window.confirm` prompts and inline state; utilities for sorting/filtering embedded in component. |
| `data`             | `components/DataManagement.tsx:1` | Upload sessions, CSV parsing, normalization, reconciliation flows. | `Employee[]`, `UploadSession`, manual mapping state | Still hosts legacy parsing logic and bespoke modal state (`resolveModal`), though large portions already extracted to hooks. |
| `table` (hidden)   | `components/TableView.tsx:1` | Tabular employee dataset explorer. | `Employee[]` | Not exposed in sidebar navigation but routable; styling relies on Tailwind tables without sticky headers. |

### Secondary Surfaces & Dialogs
- `components/ResolveEmployeesDialog.tsx:1`: Compound modal using design-system primitives for unknown employee reconciliation (triggered by Data Management uploads).
- `components/RekapKinerja.tsx:512`: Custom modal overlay for calculation breakdown; lacks focus trap/aria semantics.
- `App.tsx:344`: Dataset switching overlay displayed during background refresh; purely visual with no `role`/announcements.
- `components/DataManagement.tsx:1069`: Legacy resolve modal wrapper feeding `ResolveEmployeesDialog` with mapping data.
- `components/EmployeeManagement.tsx:116`: Bulk action drawers and inline confirm prompts replaceable with standardized modals/toasts.

### PDF / Export / Reporting Flows
- `components/Report.tsx:17`: `generatePDF()` uses `html2canvas` to rasterize DOM, then streams into `jsPDF`; output saved as `Laporan_Kinerja_<name>_<semester>_<year>.pdf`.
- `components/DataManagement.tsx:742`: Normalized data export triggers CSV/JSON downloads via dynamically created anchors.
- `services/api.ts:640`: API client exposes `/exports` endpoints for backend-driven artifacts (to be realigned with new ApiClient abstraction during refactor).

### Electron Windows & Desktop Shell
- `main.ts:92`: Single `BrowserWindow` instantiated with context isolation and devtools toggle; no multi-window flows.
- `main.ts:204`: IPC messaging focuses on server boot status (`server-ready`, `database-error`, etc.) with OS dialogs via `dialog.showMessageBox`. Future work includes typing IPC contracts and aligning with Team B schema packages.

## Accessibility & UX Findings
- Navigation buttons in `components/Sidebar.tsx:25` render as generic `<button>`s with variants but no `aria-current` or `aria-label`, reducing screen reader clarity.
- `components/EmployeeAnalytics.tsx:48` uses `<select>` controls without `id` attributes tied to labels; focus order inside collapsible filters is not managed when toggled.
- `components/RekapKinerja.tsx:513` modal lacks focus trap, keyboard dismissal (`Esc`), and announces no `role="dialog"` or accessible title/description.
- `components/Report.tsx:60` uses Indonesian labels but again omits `htmlFor`/`id` pairings; PDF generation button shows animated spinner but no live region for progress.
- `App.tsx:332` dataset switching overlay traps pointer clicks yet remains invisible to assistive tech (missing `role="status"` with `aria-live`).
- Color palettes in charts (`DashboardOverview`) rely on color hue alone to convey performance levels; needs textual annotations or patterns for WCAG compliance.

## Baseline Performance & Measurement Plan

### Current Signals (CLI)
- `npm run build` (Vite) completes in **3.5s** on local dev hardware; largest chunks:
  - `dist/assets/utils-BwzNdXas.js` → 560.56 kB (gzip 166.52 kB)
  - `dist/assets/charts-DzC0vkpf.js` → 351.30 kB (gzip 102.06 kB)
  - `dist/assets/main-Dnb1i6v8.js` → 241.59 kB (gzip 59.40 kB)
- Bundle composition indicates opportunity to split shared utilities/charts into lazy-loaded modules when rewriting views.

### Journey Timing Strategy
- **Dataset load**: instrument `AppContent` (`App.tsx:68`) to mark `dataset-switch:start/end` using `performance.mark` and surface telemetry via TanStack Query interceptors.
- **Upload flow**: wrap `DataManagement` import pipeline (`components/DataManagement.tsx:280`) with timing hooks to capture CSV parse + API save durations.
- **PDF generation**: add timers around `generatePDF` to report canvas render + file save times; consider moving to worker.
- Capture timings to a shared logger (or temporary console) and export to CSV for baseline comparison pre/post migration.
- Screenshots to be captured manually during next interactive QA run; note to add Playwright trace recordings once Playwright harness is in place.

## Open Questions / Follow-Ups
- Confirm whether the hidden `table` view remains a supported surface or can be retired during redesign.
- Align with Team B on upcoming API schema package to avoid duplicating Zod validators inside Team A clients.
- Schedule accessibility audit pass once new design system components (Table, Toast, Dialog) are ready to replace bespoke implementations.
