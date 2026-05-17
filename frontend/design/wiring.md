# SEAM V2 — UI Wiring Guide

> **Audience**: an implementing engineer (or Claude Code) rebuilding `frontend/src/` to match the hi-fi designs in this folder.
> **Source of truth for visuals**: open `SEAM V2 Hi-Fi.html` in a browser and click ⤢ on any artboard for a fullscreen view.
> **Source of truth for API**: `backend/app/api/routes/` — frozen for this rebuild. Do not refactor the backend silently. If a feature in the design requires a new endpoint, list it under **§14 New endpoints** and stub it client-side with a `TODO(api):` comment.

---

## Table of contents

1. Stack & target file layout
2. Design tokens (drop into `styles.css`)
3. Typography & icon system
4. Routing model
5. Global app state
6. Shared UI types
7. API surface — every call, where it's used
8. Component-by-component wiring
9. MapLibre integration
10. Filter predicate (single source of truth)
11. Hooks (`useDebounce`, `useHotkey`, `usePoll`, `useMapCenter`)
12. Command palette
13. Toasts, modals, error & empty states
14. New endpoints to ADD to the backend
15. Migration order (PR slicing)
16. Acceptance checklist
17. Out of scope

---

## 1. Stack & target file layout

- **Runtime**: React 19 + Vite 6 + TypeScript 5.8, SPA at `frontend/src/`.
- **Map**: `maplibre-gl` 5.x. One persistent `Map` instance for the lifetime of the SPA.
- **Graph**: `@xyflow/react` 12.x.
- **Icons**: `lucide-react`. Stroke 1.6px, 18px default, 16px in dense tables.
- **State**: local hooks. Cross-route shared state lives in a single `AppStateContext` — no Redux, no Zustand, no React Query.
- **Routing**: extend the existing hand-rolled `pushState` router in `App.tsx`. No `react-router`.
- **API base**: `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"`, re-exported from `frontend/src/api.ts`.
- **Styling**: CSS custom properties + plain classes. No Tailwind, no CSS-in-JS. The token block in §2 is the contract.

### 1.1 Files to create

```
frontend/src/
├── App.tsx                         (modify — see §4)
├── api.ts                          (extend — see §7)
├── types.ts                        (extend — see §6)
├── styles.css                      (rewrite — see §2)
├── main.tsx                        (mount <AppStateProvider><Shell/></AppStateProvider>)
│
├── state/
│   └── AppState.tsx                (provider + reducer + selectors — §5)
│
├── hooks/
│   ├── useRoute.ts                 (parse + push routes — §4)
│   ├── useDebounce.ts
│   ├── useHotkey.ts                (`/` for search, ⌘K for palette, Esc for close)
│   ├── usePoll.ts                  (interval, pauses on `visibilitychange`)
│   └── useMapCenter.ts             (event bus, §9)
│
├── components/
│   ├── Shell.tsx                   (replaces existing Shell — §8.1)
│   │
│   ├── command-panel/
│   │   ├── CommandPanel.tsx
│   │   ├── BrandHeader.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── PrimaryNav.tsx
│   │   ├── MapFilters.tsx
│   │   ├── SourceRefreshControls.tsx
│   │   ├── KeyStatsStrip.tsx
│   │   └── FooterStrip.tsx
│   │
│   ├── map/
│   │   ├── MapCanvas.tsx
│   │   ├── VesselLayer.ts          (MapLibre layer config + GeoJSON update)
│   │   ├── GeoOverlayLayer.ts
│   │   ├── PortActivityLayer.ts
│   │   ├── VesselPopover.tsx
│   │   ├── MapUtilityBar.tsx
│   │   ├── MapStatusStrip.tsx
│   │   └── ScaleBar.tsx
│   │
│   ├── inspector/
│   │   ├── InspectorShell.tsx      (header + tabs + scrolling body + footer + resize)
│   │   ├── VesselListInspector.tsx
│   │   ├── VesselDetailInspector.tsx
│   │   ├── EntityListInspector.tsx
│   │   ├── EntityDetailInspector.tsx
│   │   ├── PortsInspector.tsx
│   │   ├── RiskFeedInspector.tsx
│   │   ├── NewsInspector.tsx
│   │   ├── SanctionsInspector.tsx
│   │   └── EvidenceInspector.tsx
│   │
│   ├── canvas/
│   │   ├── GraphCanvas.tsx
│   │   ├── SchemaCanvas.tsx
│   │   └── OpsConsole.tsx
│   │
│   ├── pages/
│   │   └── RoadmapPage.tsx         (restyle only)
│   │
│   └── primitives/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── MultiSelect.tsx
│       ├── Pill.tsx
│       ├── Chip.tsx
│       ├── Tabs.tsx
│       ├── Tooltip.tsx
│       ├── Toast.tsx               (single toast)
│       ├── ToastViewport.tsx       (stack, bottom-right)
│       ├── Modal.tsx
│       ├── EmptyState.tsx
│       ├── Skeleton.tsx
│       ├── ErrorState.tsx
│       ├── Avatar.tsx
│       ├── JsonViewer.tsx          (collapsible nodes, copy, search)
│       └── CommandPalette.tsx
```

### 1.2 Files to delete (after migration)

These are replaced by the new structure and must be removed at the cleanup PR:

- `components/DevPage.tsx`              → replaced by `canvas/OpsConsole.tsx`
- `components/MapPage.tsx`               → absorbed into `Shell.tsx` + `map/MapCanvas.tsx`
- `components/PlaceholderPage.tsx`       → not needed (every route resolves to an inspector or canvas)
- `components/VesselSearchPage.tsx`      → replaced by `inspector/VesselListInspector.tsx`
- `components/VesselDetailPage.tsx`      → replaced by `inspector/VesselDetailInspector.tsx`
- `components/EntityPage.tsx`            → split into `EntityListInspector` + `EntityDetailInspector`
- `components/GraphPage.tsx`             → replaced by `canvas/GraphCanvas.tsx`
- `components/SchemaPage.tsx`            → replaced by `canvas/SchemaCanvas.tsx`

Keep the old files mounted in the SPA during the transition; do the deletes in a single cleanup PR after every new component is wired.

---

## 2. Design tokens — drop into `styles.css`

The hi-fi mockups in `hifi/styles.css` already use these. Lift them verbatim — do not rename. Remove every reference to the old teal/petroleum palette (`#006d77`, `#83c5be`, `#d66a2d`).

```css
:root {
  /* Ocean — primary surfaces & accent */
  --ocean-50:  #F2F7FB;
  --ocean-100: #E5EFF6;
  --ocean-200: #D2E4F0;
  --ocean-500: #3A7FB8;
  --ocean-600: #2C669A;
  --cyan-400:  #3FB6C9;

  /* Navy / text */
  --navy-900:  #0E2235;
  --navy-700:  #274C6E;
  --slate-500: #5F7184;
  --slate-400: #8392A1;

  /* Land */
  --land-100:  #F2EEE5;
  --land-200:  #E6E0D2;
  --land-300:  #D9D0B8;

  /* Surfaces */
  --gray-50:   #F8F9FB;
  --gray-100:  #F4F5F7;
  --gray-200:  #E6E9EE;
  --gray-300:  #D1D6DE;
  --white:     #FFFFFF;

  /* Risk — semantic only, never decorative */
  --risk-critical: #C62828;
  --risk-high:     #E04A1F;
  --risk-medium:   #E59413;
  --risk-low:      #E5C100;
  --risk-none:     #9AA7B4;

  /* Health (source status) */
  --health-ok:     #2E8F5B;
  --health-stale:  #E59413;
  --health-fail:   #C62828;
  --info-ingesting:#3A7FB8;

  /* Elevation */
  --shadow-card:    0 6px 24px rgba(14,34,53,.08), 0 1px 2px rgba(14,34,53,.04);
  --shadow-popover: 0 12px 32px rgba(14,34,53,.14);
  --shadow-modal:   0 24px 64px rgba(14,34,53,.22);

  /* Radii */
  --r-panel: 14px;
  --r-card:  10px;
  --r-btn:   8px;
  --r-pill:  999px;
  --r-badge: 6px;
  --r-chip:  4px;

  /* Spacing (4-based) */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px;
  --s-4: 16px; --s-5: 24px; --s-6: 32px;

  /* Fonts */
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

**Floating panel base** — every panel in the design uses this:

```css
.panel {
  background: rgba(255,255,255, 0.88);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid var(--gray-200);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow-card);
}
.panel--solid { background: var(--white); backdrop-filter: none; }
```

**Live-ingestion shimmer** — applied to a job card whose `status === "running"`:

```css
.shimmer { position: relative; overflow: hidden; }
.shimmer::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--info-ingesting) 30%, var(--info-ingesting) 70%, transparent);
  background-size: 40% 100%; background-repeat: no-repeat;
  animation: shimmer-sweep 1.5s linear infinite;
}
@keyframes shimmer-sweep { from { background-position: -40% 0 } to { background-position: 140% 0 } }
```

**Focus ring** — non-negotiable accessibility floor:

```css
*:focus-visible { outline: 2px solid var(--ocean-500); outline-offset: 2px; border-radius: var(--r-btn); }
```

Reference for shape, density, and exact paddings: `hifi/styles.css` and `hifi/parts.jsx` in this folder.

---

## 3. Typography & icon system

### 3.1 Type scale

| Class       | Size / line-height | Weight | Use |
|-------------|--------------------|--------|-----|
| `display`   | 28 / 36            | 700    | Page H1 when no map context (`/ops`, `/roadmap`) |
| `h1-panel`  | 18 / 24            | 600    | Floating panel section titles, inspector titles |
| `h2-card`   | 15 / 20            | 600    | Card titles inside a panel |
| `body`      | 14 / 20            | 400    | Default |
| `body-sm`   | 13 / 18            | 400    | Metadata, table cells |
| `caption`   | 11 / 14            | 500 + uppercase + 0.06em tracking | Eyebrow labels, axis labels, "last updated" |
| `num`       | (variable)         | 700, -0.02em       | Metric tiles, counts |
| `mono`      | (variable)         | JetBrains Mono     | IMOs, MMSI, lat/lon, evidence #, hashes, log lines, code |

### 3.2 Icon set (lucide-react)

The design intentionally limits itself to these icons. Do not introduce new ones without listing them here:

`Anchor` (brand), `Ship`, `Building2` (entity), `MapPin` (port), `Radar` (map / live), `ShieldAlert` (risk), `Newspaper` (news), `Scale` (sanctions), `Database` (source / evidence), `Activity` (health), `Network` (graph), `TableProperties` (schema), `Filter`, `Search`, `RefreshCw`, `Play`, `Layers`, `Eye`, `EyeOff`, `ChevronRight`, `ChevronLeft`, `ChevronDown`, `ChevronUp`, `ExternalLink`, `X`, `Plus`, `Minus`, `Maximize`, `Ruler`, `Upload`, `Download`, `Copy`, `Command`, `User`, `Settings`, `Bell`, `AlertTriangle`, `Check`, `ArrowRight`, `ArrowLeft`, `History`, `StickyNote`, `Flag`, `GripVertical`.

---

## 4. Routing

The map + command panel are persistent on **every route except** `/graph`, `/schema`, `/ops`, `/roadmap`. The route only chooses which inspector to mount on the left (next to the collapsed rail). The right side of the viewport stays as map throughout the inspector routes.

> **Layout note**: the hi-fi puts inspectors on the **left**, not the right. The command panel collapses to a 64-pixel icon rail whenever an inspector is open. This matches the user's stated preference and the latest design files. If you've read the older `design.md` that placed inspectors on the right — defer to this document and the hi-fi.

### 4.1 `RouteState`

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
  | { name: "graph"; subject?: { type: "vessel" | "entity"; id: number } }
  | { name: "schema" }
  | { name: "ops" }
  | { name: "roadmap" };
```

### 4.2 Path table

| Path                                  | RouteState                              |
|---------------------------------------|------------------------------------------|
| `/`, `/map`                           | `{ name: "map" }`                        |
| `/vessels`                            | `{ name: "vessels-list" }`               |
| `/vessels/:id`                        | `{ name: "vessel-detail", id }`          |
| `/entities`                           | `{ name: "entities-list" }`              |
| `/entities/:id`                       | `{ name: "entity-detail", id }`          |
| `/ports`                              | `{ name: "ports" }`                      |
| `/risk`                               | `{ name: "risk" }`                       |
| `/news`                               | `{ name: "news" }`                       |
| `/sanctions`                          | `{ name: "sanctions" }`                  |
| `/evidence/:id`                       | `{ name: "evidence", id }`               |
| `/graph` (+ `?subject=vessel&id=…`)   | `{ name: "graph", subject? }`            |
| `/schema`                             | `{ name: "schema" }`                     |
| `/ops`, `/dev` (alias for back-compat)| `{ name: "ops" }`                        |
| `/roadmap`                            | `{ name: "roadmap" }`                    |

`isFullCanvas(route)` returns true for `graph | schema | ops | roadmap`. Used by `Shell` to decide whether to render the `MapCanvas`.

### 4.3 `Shell` render order

```tsx
<Shell>
  <CommandPanel collapsed={isInspectorOpen || isFullCanvas} />
  {!isFullCanvas && <MapCanvas />}                {/* persistent map */}
  {isFullCanvas
    ? renderFullCanvas(route)                     {/* Graph | Schema | Ops | Roadmap */}
    : isInspectorOpen && renderInspector(route)}  {/* left-side, next to rail */}
  <CommandPalette />                              {/* ⌘K, lazy-mounted */}
  <ToastViewport />
</Shell>
```

Layout math:
- Command panel expanded: `left:16, top:16, bottom:16, width:320`.
- Command panel collapsed (rail): `left:16, top:16, bottom:16, width:64`.
- Inspector: `left:96 (16+64+16), top:16, bottom:16, width:480 or 720`.
- Map utility bar: `top:16, right:16`.
- Map status strip: bottom-center of the visible-map area (account for inspector width when computing center).
- Scale bar: `left:104, bottom:24` when an inspector is open, else `left:352` when the panel is expanded.

---

## 5. Global app state — `state/AppState.tsx`

One context provider mounted in `main.tsx`. State shape:

```ts
type AppState = {
  filters: MapFilters;
  selected: SelectedSubject;
  isPanelCollapsed: boolean;          // expanded panel ↔ icon rail
  isInspectorOpen: boolean;
  inspectorWidth: 480 | 720;
  toasts: Toast[];
  runningJobs: Record<string, true>;  // slug → true; drives shimmer + disabled
  vessels: VesselMapFeature[];
  health: SourceHealth[];
  jobs: IngestionJob[];
  riskByVessel: Record<number, RiskFlag[]>;   // lazy cache (§10)
  riskByEntity: Record<number, RiskFlag[]>;
  tableCounts: Record<string, number> | null;
};
```

Actions:

```
SET_FILTERS, RESET_FILTERS
SELECT_SUBJECT, CLEAR_SELECTION
TOGGLE_PANEL, OPEN_INSPECTOR, CLOSE_INSPECTOR, RESIZE_INSPECTOR
PUSH_TOAST, DISMISS_TOAST
JOB_STARTED, JOB_FINISHED
SET_VESSELS, SET_HEALTH, SET_JOBS, SET_TABLE_COUNTS
CACHE_VESSEL_RISK, CACHE_ENTITY_RISK
```

Convenience hooks: `useFilters()`, `useSelection()`, `useToasts()`, `useRunningJobs()`, `useVessels()`, `usePanelState()`.

Persisted to `localStorage`:
- `seam:panel-collapsed` (boolean)
- `seam:inspector-width` (480 | 720)
- `seam:recent-vessels` (array of IDs, max 8 — fed to the command palette)

---

## 6. Shared UI types — extend `types.ts`

Append; do not rename existing exports.

```ts
export type RiskSeverity = "critical" | "high" | "medium" | "low" | "none";
export type HealthStatus = "ok" | "stale" | "fail";
export type JobStatusUi = "queued" | "running" | "success" | "failure";
export type TimeWindow = "live" | "1h" | "6h" | "24h" | "7d";

export type MapFilters = {
  riskSeverities: Set<RiskSeverity>;          // empty = all
  vesselTypes: Set<string>;                   // empty = all
  flagStates: Set<string>;                    // empty = all
  hasSanctions: boolean;
  hasOpenRiskFlag: boolean;
  portActivityKind: null | "due-arrive" | "due-depart";
  timeWindow: TimeWindow;
  enabledGeoLayers: Set<string>;              // names from /api/geo/layers
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
export type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  tag?: string;               // e.g. "#J2341"
  ttl?: number;               // ms; defaults below
};
export const TOAST_TTL: Record<ToastVariant, number | null> = {
  success: 4000, info: 4000, warning: 6000, error: null /* sticky */,
};

export type SelectedSubject =
  | { kind: "vessel"; id: number }
  | { kind: "entity"; id: number }
  | { kind: "port"; code: string }
  | { kind: "evidence"; id: number }
  | null;
```

---

## 7. API surface

`apiBaseUrl`, `getJson`, and `postJson` already exist in `frontend/src/api.ts`. Reuse them; do not introduce a new HTTP layer.

### 7.1 Already exists — reuse verbatim

| Function | Endpoint | Used by |
|---|---|---|
| `loadDevState()` | `GET /api/dev/ingestion/jobs`, `/logs`, `/api/dev/source-health`, `/api/map/vessels?limit=5000&scope=latest-snapshot` | `OpsConsole`, `FooterStrip`, initial map cache |
| `browseDevVessels(q, limit)` | `GET /api/dev/vessels?q=&limit=` | `OpsConsole` vessel browser |
| `runTestJob()` | `POST /api/dev/ingestion/test` | `OpsConsole` |
| `runPositionsSnapshot()` | `POST /api/dev/ingestion/positions-snapshot?mode=live` | `SourceRefreshControls`, `OpsConsole`, map empty state |
| `runParticulars(id)` | `POST /api/dev/ingestion/vessel-particulars/{id}?mode=live` | `VesselDetailInspector`, `SourceRefreshControls` |
| `runMovements(id)` | `POST /api/dev/ingestion/vessel-movements/{id}?mode=live` | `VesselDetailInspector`, `SourceRefreshControls` |
| `runPortActivity(kind, date?)` | `POST /api/dev/ingestion/port-activity?kind={due-arrive|due-depart}&mode=live[&date=YYYY-MM-DD]` | `PortsInspector`, `SourceRefreshControls`, `OpsConsole` |
| `runRefreshLive()` | `POST /api/dev/ingestion/refresh-live` | `SourceRefreshControls`, `OpsConsole` header |
| `runGeoLive()` | `POST /api/dev/ingestion/geo-layers` | `SourceRefreshControls`, `OpsConsole` |
| `runSanctionsLive()` | `POST /api/dev/ingestion/sanctions?confirm_live=true` | `SanctionsInspector` (via confirm modal), `OpsConsole` |
| `runNewsLive()` | `POST /api/dev/ingestion/news` | `NewsInspector`, `SourceRefreshControls` |
| `runRiskRecompute(vesselId?)` | `POST /api/dev/risk/recompute[?vessel_id=]` | `RiskFeedInspector`, `VesselDetailInspector`, `OpsConsole` |
| `loadMapVessels(limit)` | `GET /api/map/vessels?limit=&scope=latest-snapshot` | `MapCanvas`, `KeyStatsStrip` |
| `searchVessels(q, limit)` | `GET /api/vessels/search?q=&limit=` | `GlobalSearch`, `VesselListInspector`, command palette |
| `getVessel(id)` | `GET /api/vessels/{id}` | `VesselDetailInspector` |
| `getVesselObservations(id)` | `GET /api/vessels/{id}/observations?limit=20` | `VesselDetailInspector` → Evidence tab |
| `getVesselEvents(id)` | `GET /api/vessels/{id}/events?limit=20` | `VesselDetailInspector` → Port calls tab |
| `getVesselRiskFlags(id)` | `GET /api/vessels/{id}/risk-flags` | `VesselDetailInspector` → Risk tab; populates map halos |
| `getVesselGraph(id)` | `GET /api/graph/vessels/{id}` | `VesselDetailInspector` Graph tab; `GraphCanvas` |
| `searchEntities(q, limit)` | `GET /api/entities/search?q=&limit=` | `GlobalSearch`, `EntityListInspector`, command palette |
| `getEntity(id)` | `GET /api/entities/{id}` | `EntityDetailInspector` |
| `getEntityVessels(id)` | `GET /api/entities/{id}/vessels` | `EntityDetailInspector` → Vessels tab |
| `getEntityRelationships(id)` | `GET /api/entities/{id}/relationships` | `EntityDetailInspector` → Relationships tab |
| `getEntityRiskFlags(id)` | `GET /api/entities/{id}/risk-flags` | `EntityDetailInspector` → Risk tab |
| `getRiskFeed(limit, includeResolved?, flagTypes?)` | `GET /api/risk/feed?limit=&include_resolved=&flag_types=` | `RiskFeedInspector`, `SanctionsInspector` |
| `getEntityGraph(id)` | `GET /api/graph/entities/{id}` | `EntityDetailInspector` Graph tab; `GraphCanvas` |
| `getSchemaGraph()` | `GET /api/meta/schema-graph` | `SchemaCanvas` |
| `getGeoLayers()` | `GET /api/geo/layers` | `MapFilters`, `GeoOverlayLayer` |
| `getGeoLayer(name)` | `GET /api/geo/layers/{name}` | `GeoOverlayLayer` |
| `getDevTableCounts()` | `GET /api/dev/table-counts` | `OpsConsole`, `KeyStatsStrip` |
| `getRecentObservations()` | `GET /api/dev/observations?limit=20` | `OpsConsole`, `NewsInspector` (fallback), `EvidenceInspector` |

### 7.2 New helpers to ADD to `api.ts`

```ts
// Health & meta -----------------------------------------------------
export const getHealth = () =>
  getJson<{ status: string; database: boolean }>("/api/health");

// Port activity feed ------------------------------------------------
// Already callable today as POST trigger; here we read it.
export const getPortActivity = (kind: "due-arrive" | "due-depart", limit = 100) =>
  getJson<VesselEvent[]>(`/api/ports/activity?kind=${kind}&limit=${limit}`);

// Reference data ---------------------------------------------------
export const getReferenceDomain = (domain: string) =>
  getJson<{ code: string; label: string }[]>(`/api/reference/${domain}`);

export const getReferenceSummary = () =>
  getJson<Record<string, number>>("/api/dev/reference/summary");

// Evidence ---------------------------------------------------------
export type EvidenceDetail = {
  id: number;
  source: string;
  observation_type: string;
  observed_at: string | null;
  fetched_at: string;
  source_record_id: string | null;
  payload_hash: string;
  raw_payload: Record<string, unknown>;
};
export const getEvidence = (id: number) =>
  getJson<EvidenceDetail>(`/api/evidence/${id}`);

// Sanctions CSV variants -------------------------------------------
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

If `/api/health`, `/api/ports/activity` (GET), or `/api/reference/{domain}` are not yet exposed by the backend, **stub** them with `TODO(api):` comments and degrade to a static placeholder rather than swallowing the error. List them under §14.

### 7.3 Polling cadence

Implement with `usePoll(fn, intervalMs, { paused })`. **Pause every poller** when `document.visibilityState === "hidden"`.

| Where | What | Interval |
|---|---|---|
| `MapCanvas` | `loadMapVessels(5000)` while `timeWindow === "live"` on a map route | 30 s |
| `OpsConsole` | `loadDevState()` | 10 s |
| `FooterStrip` | `loadDevState()` (lighter; just for the OK dot) | 60 s |
| Global | `getHealth()` (drives backend-unreachable state) | 15 s |
| `RiskFeedInspector` | refresh while open | 60 s |

Stop polling on route changes that no longer need the data. Never poll a full-canvas surface for map vessels.

---

## 8. Component-by-component wiring

### 8.1 `Shell.tsx`

Responsibilities:

- Mount `<AppStateProvider>` (done in `main.tsx`, not here).
- Read `route = useRoute()`.
- Render `<CommandPanel collapsed={shouldCollapse} />` where `shouldCollapse = state.isInspectorOpen || isFullCanvas(route)`.
- Render `<MapCanvas/>` when `!isFullCanvas(route)`.
- Render full-canvas surface OR left-side inspector (see §4.3).
- Mount `<CommandPalette/>` lazily (`useState(false)` for visibility; only render contents when opening).
- Mount `<ToastViewport/>`.
- Register global hotkeys via `useHotkey`:
  - `/` → focus `GlobalSearch` (no-op if any text input has focus).
  - `mod+k` → open command palette.
  - `Escape` → close inspector OR close modal OR close palette (most-stacked wins).

### 8.2 `command-panel/CommandPanel.tsx`

Composes (top to bottom): `BrandHeader`, `GlobalSearch`, `PrimaryNav`, `MapFilters`, `SourceRefreshControls`, `KeyStatsStrip`, `FooterStrip`.

- Width 320px expanded, 64px collapsed. The collapsed rail keeps `BrandHeader` (icon only), `PrimaryNav` (icons only with `title=`), `Operations`, and the user avatar dot — every other section hides.
- The chevron in the upper-right toggles collapse and persists via `localStorage["seam:panel-collapsed"]`.
- When `isInspectorOpen` becomes true, the panel auto-collapses **only if it wasn't manually expanded by the user during the same session** (track a transient flag).

#### `BrandHeader`
Static. Click → navigate to `/`.

#### `GlobalSearch`
- Single input, debounced 200ms.
- On change, call `Promise.all([searchVessels(q, 5), searchEntities(q, 5)])`.
- If `q` matches `/^#?\d+$/`, also attempt `getEvidence(Number(q.replace('#','')))` and surface it as the first result.
- Render results in a popover. Click navigates to:
  - Vessel result → `/vessels/{id}`.
  - Entity result → `/entities/{id}`.
  - Port result (from text match against cached ports) → `/ports` and pan map (`requestMapCenter`).
  - Evidence result → `/evidence/{id}`.
- `/` focuses the input. Esc clears and closes the popover.

#### `PrimaryNav`
Active item determined by `route.name`. The `Operations` row is **below a divider** with a Database icon, indicating "dev tools". Same for Roadmap. The active row uses `--ocean-50` background + a 3px left bar in `--ocean-500`.

#### `MapFilters`
- Reads/writes via `useFilters()`.
- Geo layers: `useEffect(() => { getGeoLayers().then(setLayers); }, [])`. Each toggle mutates `filters.enabledGeoLayers`.
- Risk severity chips: multi-select; selected chips fill with the risk color.
- Vessel type: `getReferenceDomain("vessel_type")`. Fallback: `["Cargo","Tanker","Bulker","Container","Passenger","Fishing","Other"]`.
- Flag state: `getReferenceDomain("flag_state")`. Fallback: distinct `flag_country_code` from `state.vessels`.
- `hasSanctions` / `hasOpenRiskFlag`: toggle switches.
- Port activity overlay (radio: None / Due-arrive / Due-depart): writes `filters.portActivityKind` and triggers `getPortActivity(kind)` cached in component state. Map renders `<PortActivityLayer/>` when set.
- Time window segmented (Live / 1h / 6h / 24h / 7d): writes `filters.timeWindow`. Only `live` enables the 30s map poll.
- "Reset filters" link visible iff `!isEqual(filters, DEFAULT_FILTERS)`; dispatches `RESET_FILTERS`.

#### `SourceRefreshControls`
- Collapsed by default. Each row: control button + health pill + last-success timestamp.
- Calling pattern (every refresh row):

```tsx
const slug = "positions-snapshot";
dispatch({ type: "JOB_STARTED", slug });
try {
  const job = await runPositionsSnapshot();
  toast({ variant: "success", title: "Positions snapshot complete", body: `${job.summary}`, tag: `#${job.id}` });
} catch (e) {
  toast({ variant: "error", title: "Positions snapshot failed", body: String(e) });
} finally {
  dispatch({ type: "JOB_FINISHED", slug });
}
```

- **Refresh sanctions API** opens a `<Modal/>` with the "1 quota request will be consumed" copy before calling `runSanctionsLive()`.
- Per-vessel refresh buttons (particulars / movements) are disabled unless `state.selected?.kind === "vessel"`.

#### `KeyStatsStrip`
Four tiles, sticky to the panel bottom. Pure computed values:

```ts
const tracked  = state.vessels.length;
const ports    = new Set([...portArriveCache, ...portDepartCache].map(e => e.port_code)).size;
const sanctions = state.tableCounts?.sanctions_risk_flags ?? "—";
const openRisk  = state.tableCounts?.risk_flags ?? "—";
```

- Each tile is clickable:
  - Tracked → set risk filter `all` and go to `/vessels`.
  - Active ports → `/ports`.
  - Sanctions → `/sanctions`.
  - Open risk flags → `/risk` with the mini-bar showing severity distribution.

#### `FooterStrip`
- `getHealth()` poller drives the dot color: ok → green, anything else → red ("Backend unreachable").
- Click anywhere on the strip → `/ops`.
- The user-avatar circle is a placeholder for now (initials "EM"); designed for, but not bound to, an auth system.

### 8.3 `map/MapCanvas.tsx`

Owns one MapLibre `Map` instance, persisted across route changes via a module-level ref. Re-render must never re-create the map.

```ts
const mapRef = useRef<maplibregl.Map | null>(null);
useEffect(() => {
  if (mapRef.current) return;
  mapRef.current = new maplibregl.Map({ container: el, style: BUILT_IN_STYLE, ... });
  /* add sources/layers once */
}, []);
```

**Style** — no remote tile fetch. Inline:

```ts
const BUILT_IN_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#E5EFF6" } }],
};
```

Add a static land GeoJSON as a source (`frontend/public/basemap/land.json` — Natural Earth 1:110m countries, simplified). Apply the design colors:

- ocean fill: `--ocean-100`
- land fill: `--land-100`, border `--land-200` 0.5px
- coastline overlay: `--navy-700` 0.5px
- bathymetry source (optional, toggleable via filters): `--ocean-200` at 5% opacity

**Vessel layer**
- Single GeoJSON source `"vessels"`. Update via `(map.getSource("vessels") as GeoJSONSource).setData(...)` on every filter change.
- Cluster: `cluster: true, clusterMaxZoom: 6, clusterRadius: 40`.
- Three paint layers:
  - `vessels-halo` — 22px circle, color = `case` on `severity`, opacity 0.6, pulse via tick.
  - `vessels-point` — 6px (default) / 10px (selected) circle, color cyan for default, ocean-500 for selected, severity color when severity > none.
  - `vessels-cluster` and `vessels-cluster-count`.
- Hover cursor toggles to `pointer` on `mouseenter` / back to `""` on `mouseleave`.

**Click semantics**
- Click a vessel: `dispatch SELECT_SUBJECT { kind: "vessel", id }` AND show `<VesselPopover/>` at the click coordinates AND navigate to `/vessels/{id}`.
- Click a cluster: zoom to its bounds via `getClusterExpansionZoom`.
- Click background: `dispatch CLEAR_SELECTION`, hide popover, do **not** change route.

**Geo overlay**
- For each name in `filters.enabledGeoLayers`, lazily `getGeoLayer(name)` and add as a separate source/layer. Cache responses in a module-level `Map<string, GeoJSON>` so toggling off/on doesn't re-fetch.
- Layer style by name suffix:
  - `_p` (point) → diamond markers in `--risk-medium`, label at zoom ≥ 7.
  - `_l` (line) → 1.5px `--navy-700`.
  - `_a` (polygon) → `--cyan-400` fill at 0.18, 1px border.

**Port activity overlay**
- When `filters.portActivityKind` is set, fetch `getPortActivity(kind)`, group by `port_code`, render a single marker per port with a small chevron indicator and a count badge. Clicking opens `/ports` pre-filtered to that port.

**Map ↔ inspector sync**
- Inspectors call `requestMapCenter({ lng, lat, zoom: 8 })` when loading a subject.
- `MapCanvas` subscribes once: `onMapCenter(ev => map.flyTo({ center: [ev.lng, ev.lat], zoom: ev.zoom ?? map.getZoom(), duration: 400 }))`.

### 8.4 `inspector/InspectorShell.tsx`

Props:

```ts
type InspectorShellProps = {
  title: string;
  breadcrumb?: string;
  tabs?: Array<string | [label: string, count: number]>;
  activeTab?: number;
  onTabChange?: (index: number) => void;
  footer?: ReactNode;
  onClose: () => void;
  width?: 480 | 720;
  onResize?: (w: 480 | 720) => void;
  children: ReactNode;
};
```

- Header: breadcrumb (uppercase 11px), title (18/24, 600), action row (resize toggle, pop-out icon, close X).
- Tabs row immediately under header when `tabs` provided. Active tab gets a 2px `--ocean-500` underline; count badge uses `--ocean-50` background.
- Body: `overflow:auto`, custom scrollbar (`.hifi-scroll` in `hifi/styles.css`).
- Sticky footer rendered if `footer` is non-null. Use `--gray-50` background, 1px top border.
- Resize handle on the right edge (8px wide hot strip) toggles between 480 and 720. Persist to `localStorage["seam:inspector-width"]`.
- The close X dispatches `CLOSE_INSPECTOR` and navigates back to `/map` (or `/{parent}` if known).

### 8.5 `inspector/VesselListInspector.tsx`

```ts
const [query, setQuery] = useState("");
const debounced = useDebounce(query, 250);
const [results, setResults] = useState<VesselSearchResult[] | null>(null);

useEffect(() => {
  let cancelled = false;
  if (!debounced.trim()) {
    setResults(null);
    return;
  }
  searchVessels(debounced).then(r => { if (!cancelled) setResults(r); });
  return () => { cancelled = true; };
}, [debounced]);

const visibleVessels = useMemo(() => {
  if (results) return results;
  return state.vessels.filter(v => matchesFilters(v, state.riskByVessel, filters));
}, [results, state.vessels, state.riskByVessel, filters]);
```

Each row is the card pattern from `hifi/screens-map.jsx` (avatar circle ringed in the risk color, name + flag, IMO/MMSI mono row, risk pill + relative timestamp). Click → `/vessels/{id}`.

Pagination: 25 per page client-side until backend pagination is added (§14.5).

### 8.6 `inspector/VesselDetailInspector.tsx`

```ts
useEffect(() => {
  let cancelled = false;
  setLoading(true);
  Promise.all([
    getVessel(id),
    getVesselObservations(id),
    getVesselEvents(id),
    getVesselRiskFlags(id),
  ]).then(([v, obs, ev, risk]) => {
    if (cancelled) return;
    setData({ v, obs, ev, risk });
    dispatch({ type: "CACHE_VESSEL_RISK", id, flags: risk });
    if (v.latest_position) {
      requestMapCenter({ lng: v.latest_position.lon, lat: v.latest_position.lat, zoom: 8 });
    }
  }).finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [id]);
```

Tabs:

| Tab | Source | Notes |
|---|---|---|
| Overview | `data.v` + `data.risk` (top 3 flags) + `data.ev` (top 4 events) | Sticky footer with `Refresh particulars`, `Refresh movements`, `Open in graph`, `Note (disabled)`. |
| Position history | (no endpoint today — see §14.7) embedded mini-map + table of last 50 positions | Stub with last-position-only until endpoint exists. |
| Port calls | `data.ev` filtered to arrival/departure types | Each row → evidence link. |
| Evidence | `data.obs` | Click row → `/evidence/{id}`. |
| Risk | `data.risk` grouped by severity desc | Footer: `Recompute risk for this vessel` (calls `runRiskRecompute(id)`). |
| Graph | `getVesselGraph(id)` | Embedded React Flow; "Open in full graph" → `/graph?subject=vessel&id={id}`. |

### 8.7 `inspector/EntityListInspector.tsx`

Same shell pattern as Vessel list but with `searchEntities` and `Building2` avatars.

### 8.8 `inspector/EntityDetailInspector.tsx`

```ts
Promise.all([
  getEntity(id),
  getEntityVessels(id),
  getEntityRelationships(id),
  getEntityRiskFlags(id),
])
```

Tabs: Overview / Vessels / Relationships / Risk / Graph (lazy, calls `getEntityGraph(id)`).

The Vessels tab rows link to `/vessels/{id}`; each shows the same risk-ringed avatar.

### 8.9 `inspector/PortsInspector.tsx`

- Tabs: **Due to arrive** / **Due to depart** / **All ports**.
- On tab change, fetch `getPortActivity("due-arrive" | "due-depart")` (cached per tab).
- For "All ports", merge both lists.
- Group events by `port_code`. Top-level row shows port name, UN/LOCODE, country, in-port count (derived from vessel positions inside a small bbox of the port — for now stub with 0 and add per §14.4), and a count of upcoming events.
- Expandable row reveals the per-vessel events table.
- Sticky footer: `Pull due-arrive` / `Pull due-depart` calling the respective `runPortActivity(kind)`.

### 8.10 `inspector/RiskFeedInspector.tsx`

Today there is **no** aggregated risk-feed endpoint. Build client-side until §14.1 is added.

```ts
// On open:
const candidates = state.vessels
  .filter(v => v.highest_risk_severity && v.highest_risk_severity !== "none")
  .slice(0, 100);

await Promise.all(
  candidates.map(v =>
    getVesselRiskFlags(v.vessel_id).then(f =>
      dispatch({ type: "CACHE_VESSEL_RISK", id: v.vessel_id, flags: f }),
    ),
  ),
);
```

Aggregate from `state.riskByVessel` + `state.riskByEntity`. Filter chips: by `flag_type` and by status (open/resolved). Selecting a row calls `requestMapCenter(...)` with the subject's latest known position.

Sticky footer: `Recompute risk flags` → `runRiskRecompute()`. Toast on completion.

### 8.11 `inspector/NewsInspector.tsx`

No dedicated news endpoint yet. Use `getRecentObservations()` and filter `observation.source` for known RSS identifiers (e.g. `news.reuters`, `news.tradewinds`, `rss.lloydslist`).

Each row: headline from `raw_payload.title`, source label, published time (`observed_at`), linked subject chips (derive from `raw_payload.entities[]` / `raw_payload.vessels[]`).

`View original` → opens `raw_payload.url` in a new tab (`rel="noopener noreferrer"`).

Sticky footer: `Refresh RSS` → `runNewsLive()`.

### 8.12 `inspector/SanctionsInspector.tsx`

**CSV upload lives only in the Operations Console** (§8.16). The Sanctions inspector is read-only.

- Top metrics: total matches, last refresh time, quota usage (read from a `runSanctionsLive` response cache or via `getReferenceSummary`).
- Source filter chips: All / OpenSanctions / OFAC SDN / EU Consolidated / UK HM Treasury.
- Rows: filter `state.riskByVessel` and `state.riskByEntity` for `flag_type === "sanctions"`. Each row shows subject (vessel or entity), source list (joined `flag_type_sources`), confidence (`flag_confidence`), evidence #.
- Sticky footer: `Refresh from API` → confirm modal → `runSanctionsLive()` (danger button).
- Inline help note pointing to "Operations → Sanctions CSV" for uploads (see hi-fi artboard 07).

### 8.13 `inspector/EvidenceInspector.tsx`

- Fetch via `getEvidence(id)`.
- Metadata header (6 fields in a 3-column grid): Source, Observation type, Source record ID, Observed at, Fetched at, Payload hash (copyable).
- `<JsonViewer/>` for `raw_payload`. Collapsible nodes, syntax-highlighted (navy bg, cyan/orange/green tokens — see `hifi/screens-fullcanvas.jsx` for the exact palette). Copy-to-clipboard button on the top-right.
- If `raw_payload` contains `vessel_id` or `entity_id`, surface `Open subject vessel` / `Open subject entity` buttons.

### 8.14 `canvas/GraphCanvas.tsx`

- Toolbar (floating, 16px from top inside the canvas):
  - Segmented control: `Vessel` / `Entity`.
  - Numeric subject ID input.
  - `Load` primary button → `getVesselGraph` or `getEntityGraph` depending on segmented choice.
  - Depth selector (1 / 2 / 3 hop). The backend may only support 1; pass the value as a query string (`?depth=2`) and let the API ignore it gracefully — add §14.8 to formalize.
  - Layout selector: `Force` / `Hierarchical` / `Radial`. Implement Hierarchical and Radial in JS (no extra deps); Force uses React Flow's built-in.
  - `Export PNG` / `Export JSON`. PNG via `html-to-image` if already installed; otherwise label as "coming soon" and skip.
- Canvas: React Flow with the four node kinds — `vessel` (cyan stripe), `entity` (navy stripe), `risk` (severity-colored stripe), `evidence` (slate stripe). Edge stroke encodes confidence: high = solid 1.5px `--ocean-500`, medium = solid 1px `--slate-500`, low = 1px dashed `--slate-500`. Hover an edge → tooltip with relationship type + evidence # + confidence.
- Right inspector panel (480px, the same `<InspectorShell/>` as elsewhere) shows the selected node's details and a "View JSON" link to the evidence inspector.

### 8.15 `canvas/SchemaCanvas.tsx`

- Toolbar: domain filter dropdown (populated from distinct `domain` values in the graph), `Fit view`, `Export SVG`.
- Calls `getSchemaGraph()` once on mount.
- Node = table; header shows table name (mono) + a colored dot keyed to the domain. Body lists columns with type (truncate long type names; show full on hover).
- Edges = foreign keys; label is the FK column name.
- Right inspector: selected table's columns (full list) + the API routes that touch it (compute via name match: `vessels` → `/api/vessels/*`, `risk_flags` → `/api/risk/*`, etc.).

### 8.16 `canvas/OpsConsole.tsx`

Replaces `components/DevPage.tsx` entirely. Layout: 3-column grid at ≥ 1280px, stacked below.

**Column 1 — Source health + Jobs + Logs**
- Source health rows from `state.health`. Each row: name, colored health dot, last-success relative time, retry icon button.
- Jobs panel (with `.shimmer` border when any job is running): table of last 50 from `state.jobs`. Click row → expanded JSON panel below (`raw_parameters`).
- Logs panel: virtualized list with level chip filters (ALL / INFO / WARN / ERROR), level color comes from the same risk/health tokens.

**Column 2 — DB state**
- Table counts: 4-up grid from `getDevTableCounts()`.
- Recent observations: rows from `getRecentObservations()`. Click → `/evidence/{id}`.
- Reference data summary: rows from `getReferenceSummary()` with a `Browse` link per domain.

**Column 3 — Ingestion controls**
- Buttons for every action listed in §7.1, grouped as Live ingestion / Sanctions CSV / Manual vessel actions / Port activity.
- The **Sanctions CSV panel is the only place to upload CSVs**:
  - File drop zone (accept `text/csv`).
  - URL input + `Pull` button → `runSanctionsCsvUrl()`.
  - Paste textarea → on `Submit` calls `runSanctionsCsv(text)`.
- Manual vessel actions: a vessel autocomplete (uses `searchVessels`), then `Refresh particulars` / `Refresh movements` buttons that pass the selected vessel ID.

**Bottom row — Vessel browser**
- Reproduces the existing `DevPage` browse table (search, risk severity dropdown, paginated table). Columns: Vessel (link), IMO/MMSI/Call (mono), Flag, Type, Lat/Lon (mono), Risk pill, Flag chips, Last update, `Open in map` icon.
- Sticky column header, `Export CSV` button.

**Below the browser** — a 240-tall `VesselMapPreview` strip showing all loaded vessels for context (no command panel, no inspectors).

### 8.17 `pages/RoadmapPage.tsx`

Same content as today, restyled per the hi-fi: centered 720px column, stage cards with a number circle, status pill, body copy, and a `Docs / Tests` link row. Use the tokens from §2.

---

## 9. MapLibre integration details

- One `Map` instance. **Never** re-create on filter or selection change.
- Module-level WeakMap of source IDs to cached GeoJSON to avoid re-fetching geo overlays.
- Use `map.once("load", ...)` to register layers; everything else updates via `setData` / `setPaintProperty` / `setFilter`.
- For the selected vessel ring, add a separate `vessels-selected` layer with `filter: ["==", ["get", "id"], selectedId]`. Update the filter via `setFilter`; do not rebuild the source.
- Halo pulse: there is no built-in MapLibre keyframe. Either:
  1. Run a `requestAnimationFrame` loop that sets `circle-opacity` and `circle-radius` on `vessels-halo` between bounds, or
  2. Render halos as React DOM elements positioned via `map.project(lngLat)` (preferred — the design's pulse uses CSS keyframes already).
- Cursor: `mouseenter` on `vessels-point` → `map.getCanvas().style.cursor = "pointer"`; `mouseleave` → `""`.
- Click delegation:

```ts
map.on("click", "vessels-point", (e) => {
  const f = e.features?.[0];
  if (!f) return;
  const id = f.properties?.vessel_id as number;
  dispatch({ type: "SELECT_SUBJECT", subject: { kind: "vessel", id } });
  navigate(`/vessels/${id}`);
});
map.on("click", "vessels-cluster", (e) => {
  const cluster = e.features?.[0];
  const src = map.getSource("vessels") as GeoJSONSource;
  src.getClusterExpansionZoom(cluster.properties.cluster_id, (err, zoom) => {
    if (err || zoom == null) return;
    map.easeTo({ center: (cluster.geometry as Point).coordinates as [number,number], zoom });
  });
});
map.on("click", (e) => {
  const hits = map.queryRenderedFeatures(e.point, { layers: ["vessels-point","vessels-cluster"] });
  if (hits.length === 0) dispatch({ type: "CLEAR_SELECTION" });
});
```

- **Map ↔ inspector** sync via the event bus in §11.

---

## 10. Filter predicate (single source of truth)

Define once and reuse in `VesselListInspector` and the map vessel layer GeoJSON computation.

```ts
import type { MapFilters, RiskFlag, VesselMapFeature, RiskSeverity } from "../types";

const SEVERITY_ORDER: RiskSeverity[] = ["critical","high","medium","low","none"];

export function highestSeverity(flags: RiskFlag[]): RiskSeverity {
  for (const s of SEVERITY_ORDER) {
    if (flags.some(f => f.severity === s && f.status !== "resolved")) return s;
  }
  return "none";
}

const TIME_WINDOW_MS: Record<MapFilters["timeWindow"], number> = {
  live: Infinity, "1h": 3_600_000, "6h": 21_600_000, "24h": 86_400_000, "7d": 604_800_000,
};

export function matchesFilters(
  v: VesselMapFeature,
  riskByVessel: Record<number, RiskFlag[]>,
  filters: MapFilters,
): boolean {
  const flags = riskByVessel[v.vessel_id] ?? [];
  const highest = highestSeverity(flags);
  if (filters.riskSeverities.size && !filters.riskSeverities.has(highest)) return false;
  if (filters.vesselTypes.size && (!v.vessel_type_code || !filters.vesselTypes.has(v.vessel_type_code))) return false;
  if (filters.flagStates.size && (!v.flag_country_code || !filters.flagStates.has(v.flag_country_code))) return false;
  if (filters.hasSanctions && !flags.some(f => f.flag_type === "sanctions")) return false;
  if (filters.hasOpenRiskFlag && !flags.some(f => f.status === "open")) return false;
  if (filters.timeWindow !== "live" && v.position_timestamp) {
    const cutoff = Date.now() - TIME_WINDOW_MS[filters.timeWindow];
    if (new Date(v.position_timestamp).getTime() < cutoff) return false;
  }
  return true;
}
```

`riskByVessel` is populated lazily as inspectors load each vessel's flags. For unloaded vessels, `highest = "none"` — which means `hasOpenRiskFlag` and any specific severity filter will exclude them.

---

## 11. Hooks

### 11.1 `useDebounce(value, ms)`
Standard implementation. Cleanup on unmount.

### 11.2 `useHotkey(combo, handler, deps)`
- Supports `mod+k` (mod = ⌘ on Mac, Ctrl elsewhere), single keys like `/`, and `Escape`.
- Skips when `event.target` is an `<input>`, `<textarea>`, or `[contenteditable=true]` — unless the combo is `Escape`.
- Cleans up the event listener on unmount.

### 11.3 `usePoll(fn, intervalMs, options?)`
```ts
function usePoll(fn: () => Promise<unknown> | void, intervalMs: number, opts?: { paused?: boolean }) {
  useEffect(() => {
    if (opts?.paused) return;
    let cancelled = false;
    let id: number | undefined;
    const tick = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      try { await fn(); } catch { /* swallow; toasts surface elsewhere */ }
    };
    tick();
    id = window.setInterval(tick, intervalMs);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; if (id) clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [fn, intervalMs, opts?.paused]);
}
```

### 11.4 `useMapCenter` event bus

```ts
type CenterEvent = { lng: number; lat: number; zoom?: number };
const channel = new EventTarget();

export function requestMapCenter(ev: CenterEvent) {
  channel.dispatchEvent(new CustomEvent("center", { detail: ev }));
}
export function onMapCenter(handler: (ev: CenterEvent) => void): () => void {
  const wrap = (e: Event) => handler((e as CustomEvent<CenterEvent>).detail);
  channel.addEventListener("center", wrap);
  return () => channel.removeEventListener("center", wrap);
}
```

---

## 12. Command palette (`primitives/CommandPalette.tsx`)

- Open on `mod+k`. Close on `Escape` or click outside.
- Centered modal, 640px wide, `--shadow-modal`, the search row uses a 1px bottom border.
- Sections rendered in this order:
  1. **Search results** (live, debounced 200ms) — vessels (first), entities, ports (text match against cached ports), evidence (if `q` matches `/^#?\d+$/`).
  2. **Go to** — every primary route from §4.
  3. **Recently viewed vessels** — last 8 from `localStorage["seam:recent-vessels"]`.
  4. **Ingestion actions** — every entry from §8.2.SourceRefreshControls. Selecting opens the same modal/confirmation as the in-panel control (for sanctions).
- Keyboard: ↑/↓ navigate, `Enter` activates, `Esc` closes.
- Each row shows a leading icon (lucide), a label, and a trailing `command/route hint` in mono `--slate-400`.
- The currently-highlighted row shows the `↵` glyph (right-aligned in a tiny `<kbd>` styled element).

---

## 13. Toasts, modals, error & empty states

### 13.1 Toasts
- `<ToastViewport/>` is positioned bottom-right with stacked toasts (gap 10px, max 4 visible — older fade out).
- Variants colored by left border + icon background tint:
  - success → `--health-ok`
  - info → `--ocean-500`
  - warning → `--risk-medium`
  - error → `--risk-critical`
- Default TTLs from `TOAST_TTL` in §6. Error toasts are sticky until the user dismisses.
- Surface a toast for every:
  - Ingestion job completion (success or failure).
  - Risk recompute completion (include changed-flag count).
  - Unrecoverable API error (HTTP 5xx, timeouts).
  - Quota crossing 80% / 90% / 100% on OpenSanctions.

### 13.2 Modals
- `<Modal/>` is a centered max-480px card. Always renders with a dim backdrop and traps focus.
- The "Refresh sanctions from API" modal is the canonical confirm modal — see hi-fi artboard 15 for visuals. Copy:
  > **Refresh sanctions from API?**  
  > This will consume 1 OpenSanctions quota request. You have **N of 100** remaining this month.
- Show a quota progress bar (red transition from `--health-ok` → `--risk-medium` as fill approaches 100%).

### 13.3 Error state (`<ErrorState/>`)
- Used inside inspectors and full-canvas surfaces when a fetch fails.
- Anatomy: 72px red-tinted icon square (`<AlertTriangle/>`), title, sub-copy, `Retry` primary + secondary action.
- For top-level backend-unreachable: also render the layout in hi-fi artboard 17 — red dot on the command panel, "Reconnecting…" pill above the map, inspector replaced with the same error component, faint greyscale wash over the cached map.

### 13.4 Empty state (`<EmptyState/>`)
- Centered card on the map for the first-run "no vessels loaded" case (hi-fi artboard 01).
- Anatomy: 56px iconography slot, title, sub-copy, primary action button. Use minimal line-art (anchor / ship / port silhouette) in `--navy-700`; do not invent illustrative artwork.

### 13.5 Skeleton (`<Skeleton/>`)
- Shimmer between `--gray-100` → `--gray-200`. Use inside inspectors only — **never as a full-page loader** (per the spec).

---

## 14. Backend endpoint backlog

These are the remaining endpoint gaps or expansion points. Implemented items are listed for historical context.

1. **Implemented: `GET /api/risk/feed?limit=250&include_resolved=false&flag_types=...`** — aggregated risk flags across vessels and entities. Used by `RiskFeedInspector` and `SanctionsInspector`.
2. **Implemented: `GET /api/news?limit=50`** — RSS-derived news rows as their own collection.
3. **Covered by risk feed: sanctions matches** — `SanctionsInspector` filters `/api/risk/feed` with `flag_types=sanctions_match`.
4. **`GET /api/ports`** — distinct ports referenced by stored events with counts of due-arrive / due-depart. Would power a richer **All ports** tab and command-palette port search.
5. **`GET /api/vessels?filters=&limit=&offset=`** — server-side filtered and paginated list for the `VesselListInspector`. The current client-side filter scales to ~5k vessels; past that, push to the backend.
6. **`GET /api/reference/flag_state` and `GET /api/reference/vessel_type`** — keep these populated for filter labels.
7. **`GET /api/vessels/{id}/positions?since=`** — historical AIS breadcrumb for a future Position history tab.
8. **`GET /api/graph/vessels/{id}?depth=N` and same for entities** — formalize the depth parameter.
9. **`GET /api/sanctions/quota`** — current OpenSanctions quota usage; powers the FooterStrip warning and confirm modal copy.
10. **`POST /api/dev/ingestion/sanctions-csv`** (already used in §7.2 `runSanctionsCsv`) — confirm it accepts `text/csv` POST bodies.

If anything in §7.1 isn't actually live in `backend/app/api/routes/`, **stop and surface the conflict** rather than improvising.

---

## 15. Migration order (suggested PR slicing)

Eight PRs, each independently shippable.

1. **Tokens + primitives** — rewrite `styles.css` with §2 tokens; add every component in `primitives/`. No behavior change yet; wrap existing pages with the new primitives.
2. **State + routing skeleton** — introduce `AppStateContext`, `useRoute`, the new `RouteState` shape, and the `Shell` that mounts the map behind every non-full-canvas route. Keep old pages as the right-side content temporarily.
3. **Command panel** — build the left floating panel (Brand, Search, Nav, Filters, Refresh, Stats, Footer). Remove the topbar from `Shell`. The collapsed rail comes for free since the inspector isn't wired yet.
4. **Map canvas refactor** — extract map logic out of `MapPage` into `MapCanvas`, wire filters from `AppState`, port the geo overlay logic, add halos and clustering. Add the map utility bar, scale bar, and status strip.
5. **Inspectors** — convert each existing page into an inspector and add the new ones (ports, risk, news, sanctions, evidence). Wire the inspector ↔ map event bus.
6. **Full-canvas surfaces** — rewrite `OpsConsole` from `DevPage` (3-column grid + vessel browser + map strip). Restyle `GraphCanvas`, `SchemaCanvas`, `RoadmapPage`.
7. **Polish** — command palette, hotkeys, toast wiring, polling, persisted preferences (`seam:panel-collapsed`, `seam:inspector-width`, `seam:recent-vessels`), error/empty/loading states everywhere.
8. **Cleanup** — delete the old `DevPage.tsx`, `MapPage.tsx`, `VesselSearchPage.tsx`, `VesselDetailPage.tsx`, `EntityPage.tsx`, `GraphPage.tsx`, `SchemaPage.tsx`, `PlaceholderPage.tsx`. Search the codebase for any remaining references to the old palette and the old route names.

---

## 16. Acceptance checklist

- [ ] `npm run build` passes (`tsc -b && vite build`).
- [ ] No new dependencies beyond what's already in `frontend/package.json`. Acceptable additions only if justified in the PR description: `html-to-image` (for graph PNG export).
- [ ] The map is visible on every route except `graph`, `schema`, `ops`, `roadmap`.
- [ ] The command panel is reachable on every route; collapse/expand state persists.
- [ ] Every entry in `design.md` §9 ("buttons that MUST appear") has a wired handler.
- [ ] Every existing route still resolves; old anchors (`/dev`, `/vessels/:id`, `/entities/:id`, `/graph`, `/schema`, `/roadmap`) do not 404.
- [ ] Risk severity, health status, and job status are conveyed by **both** color and text/icon — never color alone.
- [ ] Inspectors appear on the **left** (next to the collapsed rail). The Sanctions inspector has **no** CSV upload UI.
- [ ] Operations Console **is** the only place to upload sanctions CSV.
- [ ] All forms keyboard-operable. `/` focuses search, `⌘K` opens the palette, `Esc` closes inspector / modal / palette in that priority order.
- [ ] Sanctions API button triggers a confirm modal before calling.
- [ ] Polling pauses when the tab is hidden (use the `usePoll` hook).
- [ ] Map style uses only inline colors and a local land GeoJSON; no console errors from missing tile servers.
- [ ] No leftover references to the old palette (`#006d77`, `#83c5be`, `#d66a2d`) in `styles.css` or component files.
- [ ] `*:focus-visible` shows the 2px `--ocean-500` ring with 2px offset.
- [ ] Inspector resizes between 480 and 720; width persists.
- [ ] Live-ingestion shimmer animates on running job cards in the Ops Console and in the Command Panel's Source Refresh section.
- [ ] Backend-unreachable state matches hi-fi artboard 17 (red dot on panel, reconnecting pill, error component in inspector slot, greyscale map).

---

## 17. Out of scope

- Authentication / user management (designed for, but no API).
- Real-time websockets (backend is REST only today).
- Saving filter presets server-side (use `localStorage`).
- Internationalization.
- Numerical risk scoring (v1 is categorical only).
- Dark basemap and Satellite basemap (rendered as "Coming soon" pills in the utility bar).
- Mobile / tablet polish (the hi-fi targets desktop 1440px; responsive degradation is a future pass).

---

> Treat this document as the contract. If a backend behavior contradicts what's written here, **stop and surface the conflict** — the wiring assumptions must stay in sync with the routes in `backend/app/api/routes/`.
