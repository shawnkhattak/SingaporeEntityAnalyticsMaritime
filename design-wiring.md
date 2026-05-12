# SEAM V2 — UI Wiring Implementation Guide

Paste this into Codex or Claude Code together with the design file from `design.md`. This document is the **complete technical contract** between the redesigned UI and the existing SEAM V2 backend. Do not invent endpoints — every API call below already exists in `backend/app/api/routes/`.

> **Critical:** the backend, models, schemas, and routes are **frozen** for this UI rebuild. If a feature in the design requires a new endpoint, list it under "§13 New endpoints to add" and stub it client-side with TODOs — do not refactor the backend silently.

---

## 1. Stack & file layout

- **Runtime**: React 19 + Vite 6 + TypeScript 5.8, single-page client at `frontend/src/`.
- **Map**: `maplibre-gl` 5.x.
- **Graph**: `@xyflow/react` 12.x.
- **Icons**: `lucide-react`.
- **State**: keep it local with hooks for now. Where cross-page sharing is needed (selected vessel ID, active filters, command-panel collapse state, toast queue), introduce **one** `AppStateContext` in `frontend/src/state/AppState.tsx` — no Redux, no Zustand, no React Query unless explicitly approved.
- **Routing**: keep the existing hand-rolled `pushState`-based router in `App.tsx`. Extend it to support the new routes in §3.
- **API base URL**: continue to use `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"` exported from `frontend/src/api.ts`.
- **Styling**: replace the contents of `frontend/src/styles.css` with the new token system (§2). No CSS framework, no Tailwind, no styled-components. CSS custom properties + plain CSS class names matching the components below.

### 1.1 New files to create

```
frontend/src/
├── App.tsx                          (modify: new routes + map-as-canvas)
├── api.ts                           (extend: new helper functions in §4)
├── types.ts                         (extend: filter + UI types in §5)
├── styles.css                       (rewrite: tokens in §2)
├── state/
│   └── AppState.tsx                 (new: shared filters, selection, toasts)
├── components/
│   ├── Shell.tsx                    (rewrite: map canvas + floating panels)
│   ├── command-panel/
│   │   ├── CommandPanel.tsx
│   │   ├── BrandHeader.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── PrimaryNav.tsx
│   │   ├── MapFilters.tsx
│   │   ├── SourceRefreshControls.tsx
│   │   ├── KeyStatsStrip.tsx
│   │   └── FooterStrip.tsx
│   ├── map/
│   │   ├── MapCanvas.tsx            (replaces MapPage map body)
│   │   ├── VesselLayer.tsx
│   │   ├── GeoOverlayLayer.tsx
│   │   ├── PortActivityLayer.tsx
│   │   ├── VesselPopover.tsx
│   │   ├── MapUtilityBar.tsx
│   │   └── MapStatusStrip.tsx
│   ├── inspector/
│   │   ├── InspectorShell.tsx       (sticky header, body, footer, resizable)
│   │   ├── VesselListInspector.tsx
│   │   ├── VesselDetailInspector.tsx
│   │   ├── EntityListInspector.tsx
│   │   ├── EntityDetailInspector.tsx
│   │   ├── PortsInspector.tsx
│   │   ├── RiskFeedInspector.tsx
│   │   ├── NewsInspector.tsx
│   │   ├── SanctionsInspector.tsx
│   │   └── EvidenceInspector.tsx
│   ├── canvas/
│   │   ├── GraphCanvas.tsx          (replaces GraphPage body)
│   │   ├── SchemaCanvas.tsx         (replaces SchemaPage body)
│   │   └── OpsConsole.tsx           (replaces DevPage entirely)
│   ├── pages/
│   │   └── RoadmapPage.tsx          (restyle only)
│   ├── primitives/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── Pill.tsx
│   │   ├── Badge.tsx
│   │   ├── Tabs.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Toast.tsx
│   │   ├── Modal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Skeleton.tsx
│   │   ├── ErrorState.tsx
│   │   ├── Avatar.tsx
│   │   ├── JsonViewer.tsx
│   │   └── CommandPalette.tsx
│   └── hooks/
│       ├── useDebounce.ts
│       ├── useHotkey.ts             (slash-focus search, ⌘K palette)
│       ├── useRoute.ts              (extracted from App.tsx)
│       ├── usePoll.ts               (light interval poller, no React Query)
│       └── useToast.ts
```

Delete (after migration):
- `frontend/src/components/DevPage.tsx` (replaced by `canvas/OpsConsole.tsx`)
- `frontend/src/components/MapPage.tsx` (logic absorbed into `Shell.tsx` + `map/MapCanvas.tsx`)
- `frontend/src/components/PlaceholderPage.tsx`
- `frontend/src/components/VesselSearchPage.tsx` (replaced by `inspector/VesselListInspector.tsx`)
- `frontend/src/components/VesselDetailPage.tsx` (replaced by `inspector/VesselDetailInspector.tsx`)
- `frontend/src/components/EntityPage.tsx` (split into `EntityList…` + `EntityDetail…` inspectors)
- `frontend/src/components/GraphPage.tsx`, `SchemaPage.tsx` (replaced by `canvas/*Canvas.tsx`)

---

## 2. Design tokens — drop into `styles.css`

```css
:root {
  --ocean-50:  #F2F7FB;
  --ocean-100: #E5EFF6;
  --ocean-200: #D2E4F0;
  --ocean-500: #3A7FB8;
  --cyan-400:  #3FB6C9;

  --navy-900:  #0E2235;
  --navy-700:  #274C6E;
  --slate-500: #5F7184;

  --land-100:  #F2EEE5;
  --land-200:  #E6E0D2;

  --gray-100:  #F4F5F7;
  --gray-200:  #E6E9EE;
  --white:     #FFFFFF;

  --risk-critical: #C62828;
  --risk-high:     #E04A1F;
  --risk-medium:   #E59413;
  --risk-low:      #E5C100;
  --risk-none:     #9AA7B4;

  --health-ok:     #2E8F5B;
  --health-stale:  #E59413;
  --health-fail:   #C62828;
  --info-ingesting:#3A7FB8;

  --shadow-card:    0 6px 24px rgba(14,34,53,.08), 0 1px 2px rgba(14,34,53,.04);
  --shadow-popover: 0 12px 32px rgba(14,34,53,.14);

  --radius-panel: 14px;
  --radius-card:  10px;
  --radius-input: 8px;
  --radius-pill:  999px;
  --radius-badge: 6px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  color: var(--navy-900);
  background: var(--ocean-50);
  font-family: var(--font-sans);
}

/* Status helpers used by Pill/Badge primitives */
.pill { display:inline-flex; align-items:center; gap:6px; padding:2px 10px; border-radius:var(--radius-pill); font-size:12px; font-weight:600; }
.pill--risk-critical { background:rgba(198,40,40,.10); color:var(--risk-critical); }
.pill--risk-high     { background:rgba(224,74,31,.10); color:var(--risk-high); }
.pill--risk-medium   { background:rgba(229,148,19,.12); color:var(--risk-medium); }
.pill--risk-low      { background:rgba(229,193,0,.14); color:#8A7400; }
.pill--health-ok     { background:rgba(46,143,91,.10); color:var(--health-ok); }
.pill--health-stale  { background:rgba(229,148,19,.12); color:var(--risk-medium); }
.pill--health-fail   { background:rgba(198,40,40,.10); color:var(--risk-critical); }
```

---

## 3. Routing

Modify `App.tsx` so the **Map canvas + Command Panel render on every route except `/graph`, `/schema`, `/ops`, `/roadmap`**. The route only chooses which inspector is mounted on the right side.

```ts
type RouteState =
  | { name: "map" }
  | { name: "vessels-list" }
  | { name: "vessel-detail"; id: number }
  | { name: "entities-list" }
  | { name: "entity-detail"; id: number }
  | { name: "ports" }
  | { name: "risk" }
  | { name: "news" }
  | { name: "sanctions" }
  | { name: "evidence"; id: number }
  | { name: "graph"; subject?: { type: "vessel"|"entity"; id: number } }
  | { name: "schema" }
  | { name: "ops" }
  | { name: "roadmap" };
```

Parsing rules in `hooks/useRoute.ts`:

| Path | RouteState |
|---|---|
| `/`, `/map` | `map` |
| `/vessels` | `vessels-list` |
| `/vessels/:id` | `vessel-detail` |
| `/entities` | `entities-list` |
| `/entities/:id` | `entity-detail` |
| `/ports` | `ports` |
| `/risk` | `risk` |
| `/news` | `news` |
| `/sanctions` | `sanctions` |
| `/evidence/:id` | `evidence` |
| `/graph` (+ optional `?subject=vessel&id=…`) | `graph` |
| `/schema` | `schema` |
| `/ops`, `/dev` (alias) | `ops` |
| `/roadmap` | `roadmap` |

`Shell.tsx` renders:

```
<Shell>
  <CommandPanel />                         {/* always */}
  {!isFullCanvas(route) && <MapCanvas />}  {/* map workspace */}
  {isFullCanvas(route)
    ? renderFullCanvas(route)              {/* GraphCanvas | SchemaCanvas | OpsConsole | RoadmapPage */}
    : renderInspector(route)}              {/* right-side inspector */}
  <CommandPalette />                       {/* triggered by ⌘K */}
  <ToastViewport />
</Shell>
```

`isFullCanvas(route)` returns true for `graph | schema | ops | roadmap`.

---

## 4. API surface — every binding

All helpers live in `frontend/src/api.ts`. Existing helpers (keep names) and new ones to add.

### 4.1 Already in `api.ts` (verified) — reuse as-is

| Function | Endpoint | Used by |
|---|---|---|
| `loadDevState()` | `GET /api/dev/ingestion/jobs`, `/logs`, `/api/dev/source-health`, `/api/map/vessels?limit=25` | `OpsConsole`, `CommandPanel.FooterStrip` |
| `browseDevVessels(q, limit)` | `GET /api/dev/vessels?q=…&limit=…` | `OpsConsole` vessel browser |
| `runTestJob()` | `POST /api/dev/ingestion/test` | `OpsConsole` |
| `runPositionsSnapshot()` | `POST /api/dev/ingestion/positions-snapshot?mode=live` | `SourceRefreshControls`, `OpsConsole`, map empty state |
| `runParticulars(id)` | `POST /api/dev/ingestion/vessel-particulars/{id}?mode=live` | `VesselDetailInspector`, `SourceRefreshControls` |
| `runMovements(id)` | `POST /api/dev/ingestion/vessel-movements/{id}?mode=live` | `VesselDetailInspector`, `SourceRefreshControls` |
| `runPortActivity(kind)` | `POST /api/dev/ingestion/port-activity?kind={due-arrive\|due-depart}` | `SourceRefreshControls`, `PortsInspector` |
| `runRefreshLive()` | `POST /api/dev/ingestion/refresh-live` | `SourceRefreshControls`, `OpsConsole` |
| `runGeoLive()` | `POST /api/dev/ingestion/geo-layers` | `SourceRefreshControls`, `OpsConsole` |
| `runSanctionsLive()` | `POST /api/dev/ingestion/sanctions?confirm_live=true` | `SanctionsInspector`, `OpsConsole` (with confirm modal) |
| `runNewsLive()` | `POST /api/dev/ingestion/news` | `NewsInspector`, `SourceRefreshControls` |
| `runRiskRecompute(vesselId?)` | `POST /api/dev/risk/recompute` (+`?vessel_id=`) | `RiskFeedInspector`, `VesselDetailInspector`, `OpsConsole` |
| `loadMapVessels(limit=250)` | `GET /api/map/vessels?limit=…` | `MapCanvas`, `KeyStatsStrip` |
| `searchVessels(q, limit=20)` | `GET /api/vessels/search?q=…&limit=…` | `GlobalSearch`, `VesselListInspector` |
| `getVessel(id)` | `GET /api/vessels/{id}` | `VesselDetailInspector` |
| `getVesselObservations(id)` | `GET /api/vessels/{id}/observations?limit=20` | `VesselDetailInspector` Evidence tab |
| `getVesselEvents(id)` | `GET /api/vessels/{id}/events?limit=20` | `VesselDetailInspector` Port calls tab |
| `getVesselRiskFlags(id)` | `GET /api/vessels/{id}/risk-flags` | `VesselDetailInspector` Risk tab, map halos |
| `getVesselGraph(id)` | `GET /api/graph/vessels/{id}` | `VesselDetailInspector` Graph tab, `GraphCanvas` |
| `searchEntities(q, limit)` | `GET /api/entities/search?q=…&limit=…` | `GlobalSearch`, `EntityListInspector` |
| `getEntity(id)` | `GET /api/entities/{id}` | `EntityDetailInspector` |
| `getEntityVessels(id)` | `GET /api/entities/{id}/vessels` | `EntityDetailInspector` Vessels tab |
| `getEntityRelationships(id)` | `GET /api/entities/{id}/relationships` | `EntityDetailInspector` Relationships tab |
| `getEntityRiskFlags(id)` | `GET /api/entities/{id}/risk-flags` | `EntityDetailInspector` Risk tab, `RiskFeedInspector` |
| `getEntityGraph(id)` | `GET /api/graph/entities/{id}` | `EntityDetailInspector` Graph tab, `GraphCanvas` |
| `getSchemaGraph()` | `GET /api/meta/schema-graph` | `SchemaCanvas` |
| `getGeoLayers()` | `GET /api/geo/layers` | `MapFilters`, `GeoOverlayLayer` |
| `getGeoLayer(name)` | `GET /api/geo/layers/{name}` | `GeoOverlayLayer` |
| `getDevTableCounts()` | `GET /api/dev/table-counts` | `OpsConsole`, `KeyStatsStrip` |
| `getRecentObservations()` | `GET /api/dev/observations?limit=20` | `OpsConsole`, `EvidenceInspector` recents |

### 4.2 New helpers to add to `api.ts`

```ts
// Health & meta
export const getHealth = () => getJson<{ status: string; database: boolean }>("/api/health");

// Port activity feed (for PortsInspector and map overlay)
export const getPortActivity = (kind: "due-arrive" | "due-depart", limit = 100) =>
  getJson<VesselEvent[]>(`/api/ports/activity?kind=${kind}&limit=${limit}`);

// Reference data (used for flag-state, vessel-type filter dropdowns)
export const getReferenceDomain = (domain: string) =>
  getJson<{ code: string; label: string }[]>(`/api/reference/${domain}`);

export const getReferenceSummary = () =>
  getJson<Record<string, number>>("/api/dev/reference/summary");

// Evidence
export const getEvidence = (id: number) =>
  getJson<{ id: number; source: string; observation_type: string; raw_payload: Record<string, unknown>; observed_at: string | null; fetched_at: string; source_record_id: string | null; payload_hash: string }>(`/api/evidence/${id}`);

// Sanctions CSV ingestion variants
export const runSanctionsCsv = (csv: string) =>
  fetch(`${apiBaseUrl}/api/dev/ingestion/sanctions-csv`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csv,
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<Record<string, unknown>>;
  });

export const runSanctionsCsvUrl = () =>
  postJson<Record<string, unknown>>("/api/dev/ingestion/sanctions-csv-url");
```

`getJson` and `postJson` are already exported; reuse them for everything else.

### 4.3 Polling cadence

- `loadMapVessels()`: poll every **30 s** while on a map route AND `timeWindow === "Live"`. Cancel on route change to a full-canvas surface.
- `loadDevState()`: poll every **10 s** while on `/ops`, every **60 s** elsewhere (for the FooterStrip "Backend OK" indicator).
- `getHealth()`: poll every **15 s** globally.
- Stop polling when `document.visibilityState === "hidden"`. Use `usePoll` hook (see §10).

---

## 5. Shared types — extend `frontend/src/types.ts`

Add to the existing file (keep all current exports). Do not rename existing types.

```ts
export type RiskSeverity = "critical" | "high" | "medium" | "low" | "none";
export type HealthStatus = "ok" | "stale" | "fail";
export type JobStatusUi = "queued" | "running" | "success" | "failure";
export type TimeWindow = "live" | "1h" | "6h" | "24h" | "7d";

export type MapFilters = {
  riskSeverities: Set<RiskSeverity>;     // empty = all
  vesselTypes: Set<string>;              // empty = all
  flagStates: Set<string>;               // empty = all
  hasSanctions: boolean;
  hasOpenRiskFlag: boolean;
  portActivityKind: null | "due-arrive" | "due-depart";
  timeWindow: TimeWindow;
  enabledGeoLayers: Set<string>;          // names from /api/geo/layers
};

export const DEFAULT_FILTERS: MapFilters = {
  riskSeverities: new Set(),
  vesselTypes: new Set(),
  flagStates: new Set(),
  hasSanctions: false,
  hasOpenRiskFlag: false,
  portActivityKind: null,
  timeWindow: "live",
  enabledGeoLayers: new Set(["ports_p", "coastline_l"]),
};

export type ToastVariant = "success" | "info" | "warning" | "error";
export type Toast = { id: string; variant: ToastVariant; title: string; body?: string; ttl?: number };

export type SelectedSubject =
  | { kind: "vessel"; id: number }
  | { kind: "entity"; id: number }
  | { kind: "port"; code: string }
  | { kind: "evidence"; id: number }
  | null;
```

---

## 6. Global app state — `state/AppState.tsx`

One context provider mounted in `main.tsx`. The reducer manages:

```ts
type AppState = {
  filters: MapFilters;
  selected: SelectedSubject;
  isPanelCollapsed: boolean;
  isInspectorOpen: boolean;
  inspectorWidth: 480 | 720;
  toasts: Toast[];
  runningJobs: Record<string, true>;   // keyed by job_type or arbitrary slug; drives shimmer + disabled states
  vessels: VesselMapFeature[];          // shared map data, last fetched
  health: SourceHealth[];               // last health snapshot
  jobs: IngestionJob[];                 // last 50
};
```

Reducer actions: `SET_FILTERS`, `RESET_FILTERS`, `SELECT_SUBJECT`, `CLEAR_SELECTION`, `TOGGLE_PANEL`, `OPEN_INSPECTOR`, `CLOSE_INSPECTOR`, `RESIZE_INSPECTOR`, `PUSH_TOAST`, `DISMISS_TOAST`, `JOB_STARTED`, `JOB_FINISHED`, `SET_VESSELS`, `SET_HEALTH`, `SET_JOBS`.

Expose convenience hooks: `useFilters()`, `useSelection()`, `useToasts()`, `useRunningJobs()`.

---

## 7. Component-by-component wiring

### 7.1 `Shell.tsx`

- Mounts the `AppStateProvider`.
- Renders `<CommandPanel/>` always.
- Renders `<MapCanvas/>` if route is not full-canvas.
- Renders the right-side inspector for inspector routes via a small `<InspectorRouter/>` switch.
- Renders `<CommandPalette/>` (listens for `⌘K` / `Ctrl+K` via `useHotkey`).
- Renders `<ToastViewport/>`.
- Listens for `Escape` to close inspector and `/` to focus global search (unless typing in an input).

### 7.2 `command-panel/CommandPanel.tsx`

Composes (in order): `BrandHeader`, `GlobalSearch`, `PrimaryNav`, `MapFilters`, `SourceRefreshControls`, `KeyStatsStrip`, `FooterStrip`.

Width 320px expanded, 64px collapsed; toggle persists in `localStorage` under `seam:panel-collapsed`.

#### `BrandHeader`
- Static. Click navigates to `/`.

#### `GlobalSearch`
- Single `<input>`, focused by `/` hotkey.
- On change (debounced 200ms), call `Promise.all([searchVessels(q, 5), searchEntities(q, 5)])`. If `q` matches `/^#?\d+$/`, also call `getEvidence(Number(q))` and surface as an evidence result.
- Render results in a popover; click navigates to the appropriate inspector route.

#### `PrimaryNav`
- Links to each route (§3). Determine active link from `useRoute()`.
- Below a 1px divider, render `Operations` and `Roadmap` in slate-500 to indicate "developer / meta" links.

#### `MapFilters`
- Reads/writes `filters` via `useFilters()`.
- Geo layer toggle list: `useEffect(() => { getGeoLayers().then(setLayers); }, [])`. Each toggle mutates `filters.enabledGeoLayers`.
- Risk severity chips: toggle in `filters.riskSeverities`.
- Vessel type multi-select: feed from `getReferenceDomain("vessel_type")`. Fallback list if endpoint returns empty: `["Cargo","Tanker","Bulker","Container","Passenger","Fishing","Other"]`.
- Flag state multi-select: feed from `getReferenceDomain("flag_state")`. Fallback to distinct `flag_country_code` values in `state.vessels`.
- Port activity radio: writes `filters.portActivityKind`. When non-null, also triggers a fetch via `getPortActivity(kind)` cached in component state.
- Time window: writes `filters.timeWindow`. Only `live` causes polling.
- "Reset filters" link visible when filters ≠ `DEFAULT_FILTERS`, calls `RESET_FILTERS`.

#### `SourceRefreshControls`
- Each row dispatches `JOB_STARTED` with a slug, awaits the corresponding `runXxx()` helper, then dispatches `JOB_FINISHED` and pushes a toast.
- "Refresh sanctions API" opens a `<Modal/>` confirmation; only on confirm does it call `runSanctionsLive()`.
- Per-vessel refresh buttons (particulars / movements) are disabled unless `selected?.kind === "vessel"`.

#### `KeyStatsStrip`
- Tracked vessels = `state.vessels.length` (or compute from `getDevTableCounts().vessels`).
- Active ports = count of distinct `port_code` in latest `getPortActivity("due-arrive")` ∪ `getPortActivity("due-depart")` results (cached, refreshed every 60s).
- Sanctions matches = sum of risk flags with `flag_type === "sanctions"`. Source: `state.vessels` cross-referenced via `getVesselRiskFlags` would be too expensive — instead, add a lightweight `state.sanctionsCount` updated whenever the Sanctions inspector or Risk inspector loads. For initial load, derive from `getDevTableCounts().risk_flags` and decorate "—" until populated.
- Open risk flags = `getDevTableCounts().risk_flags` (or sum from risk inspector cache). Mini bar uses per-severity counts from `state.vessels` aggregation (`browseDevVessels` returns `highest_risk_severity` per row when available).
- Each tile click sets filters appropriately and navigates: tracked → `/vessels`, ports → `/ports`, sanctions → `/sanctions`, risk → `/risk`.

#### `FooterStrip`
- "Backend OK" dot bound to `getHealth()` poller.
- Last health check timestamp = `state.health[0]?.last_checked_at`.
- Clicking opens `/ops`.

### 7.3 `map/MapCanvas.tsx`

- Owns a single MapLibre `Map` instance via a ref, mounted full-screen behind the panel.
- Style spec: build inline (no remote tile server) using the §5.1 colors:
  ```ts
  style: {
    version: 8,
    sources: {},
    layers: [{ id: "background", type: "background", paint: { "background-color": "#E5EFF6" } }],
  }
  ```
  Add a static `land` source from a GeoJSON file under `frontend/public/basemap/land.json` (instructed in §13 if missing).
- Pulls vessels via `loadMapVessels(5000)` on mount + on `filters.timeWindow === "live"` poll (`usePoll(30_000)`), updating `state.vessels`.
- Renders sub-layers:
  - `VesselLayer` — driven by `state.vessels` filtered by `MapFilters` (apply `riskSeverities`, `vesselTypes`, `flagStates`, `hasSanctions`, `hasOpenRiskFlag` in JS before passing to MapLibre as a GeoJSON source). Clustering at zoom < 6.
  - `GeoOverlayLayer` — iterates `filters.enabledGeoLayers`, calls `getGeoLayer(name)` lazily. Mirrors current `MapPage` behavior with new colors.
  - `PortActivityLayer` — when `filters.portActivityKind` is set, plots port markers from `getPortActivity(kind)`.
- Selection: clicking a vessel circle dispatches `SELECT_SUBJECT { kind:"vessel", id }`, opens `VesselPopover` at the click coordinates, and navigates to `/vessels/{id}` (router pushes, inspector opens).
- Map utility bar (zoom, fit, basemap toggle, measure, coords readout) is a separate floating component anchored top-right of the canvas.
- Map status strip is anchored bottom-center.

### 7.4 `inspector/InspectorShell.tsx`

Props: `title`, `subtitle?`, `breadcrumb?`, `onClose`, `tabs?`, `footer?`, `children`. Includes resize handle on the left edge that toggles between 480 and 720 px and persists to `localStorage`.

### 7.5 `inspector/VesselListInspector.tsx`
- Local state: `query`, `results`, `isSearching`.
- `useDebounce(query, 250)` → `searchVessels(debounced)`.
- If `query` empty, fall back to `state.vessels` filtered by `MapFilters` (same predicate as the map layer).
- Rows render `<ResultCard kind="vessel" />`. Click → `/vessels/:id`.

### 7.6 `inspector/VesselDetailInspector.tsx`
- `useEffect` on `id`:
  ```ts
  Promise.all([
    getVessel(id),
    getVesselObservations(id),
    getVesselEvents(id),
    getVesselRiskFlags(id),
  ])
  ```
- Auto-center map: dispatch a `MAP_CENTER` event (or call into `MapCanvas` via a ref/context) using `latest_position`.
- Tabs: Overview / Position history / Port calls / Evidence / Risk / Graph.
- Buttons:
  - **Refresh particulars** → `runParticulars(id)` then re-`load()`.
  - **Refresh movements** → `runMovements(id)` then re-`load()`.
  - **Open in graph** → `/graph?subject=vessel&id=:id`.
  - **Open evidence** → opens the first evidence ID inspector, or evidence tab.
- Graph tab calls `getVesselGraph(id)` and renders a mini React Flow.

### 7.7 `inspector/EntityListInspector.tsx`
- Search via `searchEntities(q)`. Same shell pattern.

### 7.8 `inspector/EntityDetailInspector.tsx`
- `Promise.all([getEntity, getEntityVessels, getEntityRelationships, getEntityRiskFlags, getEntityGraph])`.
- Tabs: Overview / Vessels / Relationships / Risk / Graph.

### 7.9 `inspector/PortsInspector.tsx`
- Tabs: Due to arrive / Due to depart / All ports.
- Each tab fetches `getPortActivity(kind)` (or both, then groups for "All ports").
- Group rows by `port_code`; rendering expandable port rows with the vessel events.
- Sticky footer: "Pull live (arrivals)" / "Pull live (departures)" calling `runPortActivity(kind)`.

### 7.10 `inspector/RiskFeedInspector.tsx`
- There is **no** `/api/risk/flags` aggregate endpoint today. Build the feed client-side:
  - On open, iterate `state.vessels` and call `getVesselRiskFlags(id)` for each vessel that has `highest_risk_severity != null` (cap at e.g. 100 to avoid stampede). Cache in `state.riskFeed`.
  - Augment with `getEntityRiskFlags(id)` for entities loaded via inspectors.
  - Refresh on `runRiskRecompute()`.
- Filter chips: by `flag_type` and by `status` (open/resolved).
- Selecting a row pans/zooms the map to the subject's last known position via the `MAP_CENTER` channel.
- Footer button: "Recompute risk flags" → `runRiskRecompute()`. Toast on completion.
- **Note for the implementer**: if this proves expensive, add a new endpoint per §13.

### 7.11 `inspector/NewsInspector.tsx`
- There is **no** dedicated news endpoint. Use `getRecentObservations()` and filter `observation.source` for known RSS feed identifiers (e.g. starts with `news.` or `rss.`).
- Each row renders headline (from `raw_payload.title`), source, published time (`observed_at`), linked subjects.
- "Refresh news" button → `runNewsLive()`.
- Add proper endpoint per §13 once available.

### 7.12 `inspector/SanctionsInspector.tsx`
- Top metrics: count of sanctions risk flags (from running risk feed), last refresh time.
- "Refresh from API" → confirm modal → `runSanctionsLive()`.
- "Upload CSV": drag-and-drop file zone + paste textarea; on submit, read file as text and call `runSanctionsCsv(text)`.
- "Refresh from CSV URL" → `runSanctionsCsvUrl()`.
- Rows: filter `state.riskFeed` (built in 7.10) for `flag_type === "sanctions"`. Show subject (vessel/entity), source list, evidence #.

### 7.13 `inspector/EvidenceInspector.tsx`
- Fetch via `getEvidence(id)`.
- Render the metadata header + `<JsonViewer/>` for `raw_payload`.
- "Open subject" buttons: if `raw_payload` contains `vessel_id` or `entity_id`, expose links to the right inspector.

### 7.14 `canvas/GraphCanvas.tsx`
- Replaces `GraphPage.tsx`. Subject type + id from URL query; "Load" triggers `getVesselGraph` or `getEntityGraph`.
- Adds layout selector — Force / Hierarchical / Radial. Implement Hierarchical and Radial as JS-side layouts using simple algorithms (no external deps).
- Right inspector mounts the standard `InspectorShell` showing the selected node's details and a link to `/evidence/:id`.
- "Export PNG" via the React Flow built-in (or `html-to-image` if installed — otherwise omit and label as future).

### 7.15 `canvas/SchemaCanvas.tsx`
- Replaces `SchemaPage.tsx`. `getSchemaGraph()`. Domain filter dropdown. Click node → inspector shows columns and a static list of related API routes (compute by matching table name to known route prefixes: `vessels` → `/api/vessels/*`, etc.).

### 7.16 `canvas/OpsConsole.tsx`
- Replaces all of `DevPage.tsx`. All API calls already used in `DevPage.tsx` carry over — preserve the logic, restyle the layout into the 3-column grid + full-width vessel browser + bottom map preview described in §7.3 of `design.md`.
- Replace `window.confirm` with the new `<Modal/>` primitive for the OpenSanctions quota warning.
- Replace inline `error` strings with `<ErrorState/>` and surface job outcomes via `<Toast/>`.

### 7.17 `pages/RoadmapPage.tsx`
- Same content as today, restyled with the new tokens.

---

## 8. MapLibre integration details

- Initialize **one** `Map` instance. Persist it across route changes so the map state survives navigation.
- Use `useEffect` in `MapCanvas.tsx` with empty deps for init; never re-create the map on filter changes.
- Vessel data source ID: `"vessels"`. Update via `(map.getSource("vessels") as maplibregl.GeoJSONSource).setData(...)`.
- Risk halos: add a second circle layer `"vessels-halo"` painted with `circle-color` driven by a `case` expression on `severity` property.
- Selected vessel: stored in `state.selected`; before paint, update a `"vessels-selected"` filter expression that keeps only the selected ID.
- Hover cursor: `mouseenter`/`mouseleave` set canvas style cursor to `pointer`.
- Cluster source: `cluster: true, clusterRadius: 40, clusterMaxZoom: 6`. Render two layers: clusters (circle with count text) and unclustered points.
- Bidirectional map ↔ inspector coordination is via a tiny event bus:
  ```ts
  // hooks/useMapCenter.ts
  type CenterEvent = { lng: number; lat: number; zoom?: number };
  const channel = new EventTarget();
  export const requestMapCenter = (ev: CenterEvent) => channel.dispatchEvent(new CustomEvent("center", { detail: ev }));
  export const onMapCenter = (fn: (ev: CenterEvent) => void) => { /* addEventListener */ };
  ```
  Inspectors call `requestMapCenter(...)` when they load a subject; `MapCanvas` subscribes once.

---

## 9. Filter predicate (single source of truth)

Implement once and reuse in both the inspector lists and the map layer:

```ts
export function matchesFilters(v: VesselMapFeature, riskByVessel: Record<number, RiskFlag[]>, filters: MapFilters): boolean {
  const flags = riskByVessel[v.vessel_id] ?? [];
  const highest = highestSeverity(flags); // "critical" | … | "none"
  if (filters.riskSeverities.size && !filters.riskSeverities.has(highest)) return false;
  if (filters.vesselTypes.size && (!v.vessel_type_code || !filters.vesselTypes.has(v.vessel_type_code))) return false;
  if (filters.flagStates.size && (!v.flag_country_code || !filters.flagStates.has(v.flag_country_code))) return false;
  if (filters.hasSanctions && !flags.some((f) => f.flag_type === "sanctions")) return false;
  if (filters.hasOpenRiskFlag && !flags.some((f) => f.status === "open")) return false;
  if (filters.timeWindow !== "live") {
    const cutoff = Date.now() - timeWindowMs(filters.timeWindow);
    if (new Date(v.position_timestamp).getTime() < cutoff) return false;
  }
  return true;
}
```

`riskByVessel` is populated lazily as the user opens inspectors. For unloaded vessels, treat `highest` as `"none"`.

---

## 10. Reusable hooks

```ts
// useDebounce
export function useDebounce<T>(value: T, ms: number): T { /* standard impl */ }

// useHotkey
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, deps: unknown[]): void { /* … */ }
// usage: useHotkey("/", focusSearch, []); useHotkey("mod+k", openPalette, []);

// usePoll
export function usePoll(fn: () => Promise<void> | void, intervalMs: number, options?: { paused?: boolean }): void {
  // Honors document.visibilityState === "hidden" by pausing.
}
```

---

## 11. Command palette (`primitives/CommandPalette.tsx`)

- Triggered by `⌘K` / `Ctrl+K`. Centered modal, 560px wide.
- Sections (in order):
  1. **Go to** — static list of routes from §3.
  2. **Recently viewed vessels** — last 8 vessel IDs from `localStorage`.
  3. **Ingestion actions** — every entry from §7.2.SourceRefreshControls.
  4. **Search results** — live results from `searchVessels` / `searchEntities` (same fetch as `GlobalSearch`, debounced 200ms).
- Keyboard: arrow keys navigate, Enter activates, Escape closes.

---

## 12. Toasts

- Mount `<ToastViewport/>` bottom-right with stacked toasts.
- Surface a toast for every ingestion job result (success/failure), risk recompute, and unrecoverable API error.
- TTL defaults: success 4s, info 4s, warning 6s, error sticky until dismissed.

---

## 13. New endpoints to ADD to backend (do not implement silently — open a follow-up)

The UI degrades gracefully without these, but the design assumes they exist. Add TODO comments at the call sites.

1. `GET /api/risk/feed?status=open&limit=200` — aggregated risk flags across vessels and entities. Replaces the per-vessel client fan-out in `RiskFeedInspector`.
2. `GET /api/news?limit=50` — RSS-derived news rows, surfaced as their own collection rather than filtered observations.
3. `GET /api/sanctions/matches?limit=100` — aggregated sanctions risk flags joined with their subjects.
4. `GET /api/ports` — distinct ports referenced by stored events, with counts of due-arrive / due-depart for the "All ports" tab.
5. `GET /api/vessels?limit=…&filters=…` — server-side filtering and pagination for the vessels inspector when datasets grow.
6. `GET /api/reference/flag_state` and `/api/reference/vessel_type` — confirm these are populated; if not, seed them from existing data.

---

## 14. Migration order (suggested PR slicing)

1. **Tokens + primitives**: rewrite `styles.css` with §2, add `primitives/*` (Button, Input, Pill, Tabs, Tooltip, Toast, Modal, EmptyState, Skeleton, ErrorState, JsonViewer). No behavior change yet — wrap existing components to use them.
2. **Routing + Shell skeleton**: introduce the new `RouteState`, `useRoute`, and the `Shell` that mounts the map canvas behind every non-full-canvas route. Keep old pages mounted inside the right-side area temporarily.
3. **Command panel**: build the left floating panel (Brand, Search, Nav, Filters, Refresh, Stats, Footer). Remove the topbar from `Shell`.
4. **Map canvas refactor**: move `VesselMapPreview` logic into `MapCanvas`, wire filters from `AppState`, port the geo overlay logic, add halos and clustering.
5. **Inspectors**: convert each page into an inspector (vessels list, vessel detail, entities list, entity detail, evidence). Add the new inspectors (ports, risk, news, sanctions).
6. **Full-canvas surfaces**: rewrite `OpsConsole` from `DevPage`. Restyle `GraphCanvas`/`SchemaCanvas`/`RoadmapPage`.
7. **Polish**: command palette, hotkeys, toast wiring, polling, persisted preferences, error/empty/loading states.
8. **Cleanup**: delete the old `DevPage.tsx`, `MapPage.tsx`, `VesselSearchPage.tsx`, `VesselDetailPage.tsx`, `EntityPage.tsx`, `GraphPage.tsx`, `SchemaPage.tsx`, `PlaceholderPage.tsx`.

---

## 15. Quality bar / acceptance checklist

- [ ] `npm run build` passes (`tsc -b && vite build`).
- [ ] No new dependencies beyond what's already in `frontend/package.json` unless explicitly approved. Acceptable additions if needed: `@react-flow/background-utils` (already pulled via `@xyflow/react`), nothing else.
- [ ] The map is visible on every route in §3 except `graph`, `schema`, `ops`, `roadmap`.
- [ ] Command panel is reachable from every route and the collapsed/expanded state persists.
- [ ] Every entry in design.md §9 ("buttons that MUST appear") has a wired handler.
- [ ] Every existing route (`/dev`, `/map`, `/vessels`, `/vessels/:id`, `/entities`, `/entities/:id`, `/graph`, `/schema`, `/roadmap`) still resolves; old anchors do not 404.
- [ ] Risk severity, health status, and job status are conveyed by **both** color and text/icon.
- [ ] All forms keyboard-accessible. `/` focuses search, `⌘K` opens palette, `Esc` closes inspector and modal.
- [ ] Sanctions API button triggers a confirm modal before calling.
- [ ] Polling pauses when the tab is hidden.
- [ ] Map style uses only inline colors (no external tile fetch); no console errors from missing tile servers.
- [ ] No leftover references to the old palette (`#006d77`, `#83c5be`, `#d66a2d`) in `styles.css` or component files.

---

## 16. Out of scope

- Authentication / user management (designed for, but no API).
- Real-time websockets (current backend is REST only).
- Saving filter presets server-side (use `localStorage`).
- Internationalization.
- Numerical risk scoring (V1 is categorical only; respect the README guardrails).

When implementing, treat this document as the contract. If you discover a backend behavior that contradicts what's written here, **stop and surface the conflict** rather than improvising — the wiring assumptions must stay in sync with the routes in `backend/app/api/routes/`.
