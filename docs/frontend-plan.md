# Front-end

Status: built for every user-facing endpoint in [api.md](api.md). Not covered: `/internal/*` and `/webhooks/*` (worker-only), and QA generation / review / export (the API doesn't have them yet).

Run it: `cd front-end && npm install && npm run dev` (http://localhost:5200). Set `VITE_API_URL` if the API isn't on `http://localhost:8000` (see `front-end/.env.example`). The API's `CORS_ORIGINS` / `HOST_URL` must be `http://localhost:5200` (5173 is inside a Windows-reserved port range).

## Stack

React 19, Vite, Tailwind v4, react-router v7 (data router, lazy routes), TanStack Query, react-hook-form + zod, shadcn/ui (Radix) restyled to our look, axios, sonner, motion, Vitest. Fonts are bundled (`@fontsource`), nothing is fetched from Google. Tables are our own `DataGrid` (below), not TanStack Table.

## Structure

```
src/
  app/           providers, router
  pages/         route-level files only: thin, they just render a feature view
  features/<x>/  everything for one area: api.ts, queries.ts (TanStack hooks), types.ts,
                 schemas.ts (zod), components/ (the views and dialogs the page shows)
  components/
    ui/          shadcn primitives (edited for our look)
    data-grid/   DataGrid + its query model, local executor, column layout (see "DataGrid")
    shared/      QueryBoundary, StatusBadge, ConfirmDialog, EmptyState, FormField
    layout/      RootLayout, Sidebar (collapsible), Header, Footer, Panel, PageHeader, SplitView, RouteTabs
  lib/           api client, error normalisation, query client, token storage, formatters
```

Features: `auth`, `users`, `projects`, `members`, `documents`, `processing`, `extractions`, `model-config`, `credentials`, `landing`.

## Look

Zen-browser feel: warm ink + cream + white, light only. Tokens live in `src/index.css`
(shadcn's semantic names mapped to our values): `background` white (header, footer, cards, dialogs),
`workspace` `#EBE8E2` behind panels, `ink` `#16140F` for the sidebar and primary buttons, `cream` `#E5DCC8`,
muted `sage` / `clay` / `amber` / `dusty` for statuses. Fonts: Spectral (headings), Hanken Grotesk (body), JetBrains Mono (code).

## Screens

| Route | What | Who |
|---|---|---|
| `/login`, `/setup-password?token=` | sign in; finish an invited account | public |
| `/app/projects` | list, search, create | everyone |
| `/app/projects/:id` | overview, edit, delete | members (edit: owners) |
| `…/documents` | upload (drag & drop, progress), select, process, delete | members |
| `…/processing` | jobs list + job detail (split view, polls while running) | members |
| `…/extractions` | extracted documents + text viewer (split view) | members |
| `…/members` | team and project roles | members (edit: owners) |
| `…/models` | choose credential + model per stage; test before saving | members (edit: owners) |
| `/app/credentials` | connections: add, edit, test, delete | admin |
| `/app/credentials/:id` | register / sync / test Ollama and Azure models | admin |
| `/app/users` | invite, resend, activate / deactivate | admin |

## Layout

The sidebar collapses to an icon rail from `lg` up (button in the header or Ctrl/Cmd+B, remembered in `localStorage`); below `lg` it is a drawer. The workspace is a flex column at least as tall as the screen, so a grid placed in it grows to the bottom edge, with gridlines continuing through the empty space. `SplitView fill` does the same for two-pane screens, each pane scrolling on its own.

## DataGrid (`src/components/data-grid`)

Every list is a `<DataGrid>`. It is **server-style by design**: it never slices data itself. It edits one `GridQuery` (`page`, `pageSize`, `sort[]`, `filters[]`, `search`) and shows the `rows` + `total` it is given.

```tsx
const [query, setQuery] = useGridQuery({ storageKey: 'projects' });
const page = useLocalGrid(projects.data, columns, query);   // stand-in for the server
<DataGrid columns={columns} rows={page.rows} total={page.total} getRowId={…}
          query={query} onQueryChange={setQuery} loading={…} selection="multiple" … />
```

- **Columns** are declared as `GridColumn[]`: `id`, `header`, `accessor`, `cell`, `width/minWidth/maxWidth`, `align`, `sortable`, `resizable`, `hideable`, `reorderable`, `searchable`, `defaultHidden`, `filter` (`text` | `select` | `number` | `date`).
- **Features:** click / Shift-click multi-sort, drag-to-resize (double-click resets), drag-to-reorder, show/hide columns, per-column typed filters with removable chips, debounced search, pagination (page size, first/prev/next/last, jump to page), skeleton / refreshing / error / empty states, column layout and page size remembered per `storageKey`.
- **Selection:** `selection="none" | "single" | "multiple"`. Multiple has a checkbox column, Shift-click range, select-all for the page and "Select all N rows" across pages. State is `{mode:'ids', ids}` or `{mode:'all', excludedIds}`; resolve it with `resolveSelection` locally, or send the query to the server for bulk actions.
- **Going server-side:** when an endpoint paginates, replace `useLocalGrid(...)` with a query keyed on `query` that returns `{rows, total}`, and send `serializeGridQuery(query, columns)`. Nothing else in the grid or the screen changes. Proposed wire format:
  `page=2&page_size=25&q=dune&sort=created_at desc,title asc&filter=contains(title,'dune') and status in ('failed','queued') and size ge 100`
  (OData-flavoured; numbers unquoted by column type, strings quoted with `''` escaping). The backend does not implement this yet.
- Logic (filter, sort, page, selection, serialisation) is covered by `grid-logic.test.ts` (`npm test`).

## Rules the UI follows

- `GET /projects` doesn't return your project role, so owner-vs-worker is derived from the member list (`useProjectAccess`); admins count as owners. The API still enforces everything.
- Login is a form post (`username` = email). Tokens last 20 minutes with no refresh: the app signs out at expiry and on any 401, through React state (no hard reload).
- Errors from the API are normalised to `ApiError` (`{error:{code,message}}`, FastAPI `detail`, 422 field errors). Mutations toast their errors automatically; forms that show errors inline opt out with `meta: { silent: true }`.
- Only the stages in use are shown on the Models tab (`meta_agent`, `embedder`, `vision` for academic). Only PDFs can be processed.

## Not done yet / open

- Lists are still run in the browser (`useLocalGrid`) because the API returns whole lists. The grid itself is already server-style; see "Going server-side" above.
- Live updates poll every few seconds while work is running. The API has no WebSockets.
- No refresh tokens; tokens are in `localStorage`. A strict CSP at the web server is recommended (not added: Vite dev needs inline scripts).
- API types are hand-written from the pydantic models. Generating them from `/openapi.json` (openapi-typescript) would keep them in sync automatically.
- Tests cover only the grid's logic so far; there are no component or end-to-end tests.
