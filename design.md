# SEAM V2 — UI Design Prompt (for Claude Design)

You are designing the complete UI for **SEAM V2**, a maritime intelligence platform that fuses live AIS positions, port activity, vessel particulars, sanctions matches, and news enrichment into an evidence-backed analyst workspace.

Design **every screen, every panel, every button, and every state** described in this document. Do not summarize; produce concrete, high-fidelity layouts (desktop-first, 1440px design width with responsive notes down to 1024px). Use light/analytical styling. The map is the canvas, not a feature inside a dashboard.

---

## 1. Product Identity

- **Name**: SEAM V2 (Source-Evidence-Aware Maritime).
- **Audience**: maritime analysts, compliance officers, port operators, sanctions researchers, logistics dispatchers.
- **Mood**: calm, trustworthy, analytical, "Bloomberg terminal meets MarineTraffic" — but cleaner and less dense than either.
- **Voice**: precise, evidentiary, never alarmist. Risk is *signaled*, not shouted.
- **Tagline (used on auth/landing only)**: "Evidence-backed maritime intelligence."

---

## 2. Visual Language — OVERRIDES (these supersede anything currently in `frontend/src/styles.css` or the existing components)

### 2.1 Palette

| Token | Hex | Use |
|---|---|---|
| `--ocean-50` | `#F2F7FB` | App background behind floating panels |
| `--ocean-100` | `#E5EFF6` | Ocean fill on the map base style |
| `--ocean-200` | `#D2E4F0` | Subtle dividers, hover wash |
| `--ocean-500` | `#3A7FB8` | Primary blue accent (active nav, focus ring) |
| `--cyan-400` | `#3FB6C9` | Secondary accent (vessel highlights, chart series) |
| `--navy-900` | `#0E2235` | Primary text, brand wordmark |
| `--navy-700` | `#274C6E` | Secondary text |
| `--slate-500` | `#5F7184` | Tertiary text, metadata |
| `--land-100` | `#F2EEE5` | Landmass fill on the map (soft beige) |
| `--land-200` | `#E6E0D2` | Land borders |
| `--gray-100` | `#F4F5F7` | Card hover, table stripe |
| `--gray-200` | `#E6E9EE` | Borders for panels, table rules |
| `--white` | `#FFFFFF` | Floating panel surface |
| `--shadow-card` | `0 6px 24px rgba(14, 34, 53, 0.08), 0 1px 2px rgba(14, 34, 53, 0.04)` | Floating panel elevation |
| `--shadow-popover` | `0 12px 32px rgba(14, 34, 53, 0.14)` | Popovers, dropdowns, vessel tooltips |

### 2.2 Status colors (risk + health)

| Token | Hex | Use |
|---|---|---|
| `--risk-critical` | `#C62828` | "Critical" pills, map halos, alert borders |
| `--risk-high` | `#E04A1F` | "High" pills, map halos |
| `--risk-medium` | `#E59413` | "Medium" pills (amber) |
| `--risk-low` | `#E5C100` | "Low" pills (mustard) |
| `--risk-none` | `#9AA7B4` | "No risk" muted |
| `--health-ok` | `#2E8F5B` | Source healthy pill |
| `--health-stale` | `#E59413` | Source stale pill |
| `--health-fail` | `#C62828` | Source failing pill |
| `--info-ingesting` | `#3A7FB8` | "Running" / live-ingestion shimmer |

All status colors must pass WCAG AA against `--white` and `--navy-900`.

### 2.3 Typography

- **Primary**: Inter (already loaded).
- **Mono**: JetBrains Mono — for IMO/MMSI, evidence IDs, lat/lon, payload hashes, log lines.
- **Type scale** (px / line-height):
  - `display`: 28 / 36 (page H1 only when no map context)
  - `h1-panel`: 18 / 24 (floating panel section titles)
  - `h2-card`: 15 / 20 (card titles)
  - `body`: 14 / 20 (default)
  - `body-sm`: 13 / 18 (metadata, table cells)
  - `caption`: 11 / 14 (eyebrow labels, axis labels, last-updated)
- Weight defaults: 400 body, 500 metadata, 600 headings, 700 numerics in metric cards.

### 2.4 Surface system

- **Floating panel (the canonical container)**: white background, 1px `--gray-200` border, 14px radius, `--shadow-card`, 16–20px internal padding. **All panels float on top of the map** with a 16px gutter to the viewport edge.
- **Glass option**: for the left command panel only, allow `backdrop-filter: blur(14px)` over a 92%-opacity white. The blur is the *only* place glassmorphism is used.
- **No full-bleed pages**. Even pages without a map (Schema, Roadmap, Settings) render as a centered stack of floating cards over the `--ocean-50` background with a faint ocean texture (5%-opacity wave SVG).
- **Borders**: 1px, never thicker. Use color, not weight.
- **Radii**: 14px panels, 10px cards inside panels, 8px buttons/inputs, 999px pills, 6px badges, 4px tag chips.
- **Spacing**: 4 / 8 / 12 / 16 / 24 / 32 grid.

### 2.5 Iconography

- **Library**: `lucide-react` (already installed). Stroke 1.6px, 18px default size, 16px in dense tables.
- **Reserved icons**: `Anchor` (brand), `Ship` (vessel), `Building2` (entity/owner), `MapPin` (port), `Radar` (live tracking), `ShieldAlert` (risk), `Newspaper` (news), `Scale` (sanctions), `Database` (source), `Activity` (health), `Network` (graph), `TableProperties` (schema), `Filter`, `Search`, `RefreshCw`, `Play`, `Layers`, `Eye`/`EyeOff`, `ChevronRight`, `ExternalLink`.

### 2.6 Motion

- 120ms ease-out for hover/focus, 200ms ease-in-out for panel expand/collapse, 0ms for map pans (MapLibre handles).
- Live-ingestion shimmer: 2px top border animates a 1.5s left-to-right `--info-ingesting` gradient while a job is running.
- Never bounce. Never spin a full-page loader; use skeleton blocks inside panels.

---

## 3. Information Architecture — OVERRIDE

Replace the current top-bar navigation entirely. There is **one persistent surface** (the Floating Command Panel) and **one persistent canvas** (the Map). Other "pages" appear as either:

- **Inspector panels** — slide-in from the right edge over the map (vessel detail, entity detail, evidence JSON, graph subgraph).
- **Full-canvas modals** — replace the map only when the user explicitly chooses Graph, Schema, or Operations Console (these don't make sense over a map).

Routes (preserve URL paths so deep-links keep working):

- `/` and `/map` — Map workspace (default)
- `/vessels` — Map + Vessels list inspector open
- `/vessels/:id` — Map + Vessel detail inspector open, map centered on vessel
- `/entities` — Map + Entities list inspector open
- `/entities/:id` — Map + Entity detail inspector open
- `/ports` — Map + Ports inspector (due-arrive / due-depart)
- `/risk` — Map + Risk feed inspector
- `/news` — Map + News feed inspector
- `/sanctions` — Map + Sanctions matches inspector
- `/graph` — Full-canvas React Flow (map hidden)
- `/schema` — Full-canvas React Flow (map hidden)
- `/ops` — Full-canvas Operations Console (replaces current `/dev`; map hidden)
- `/roadmap` — Centered card stack (map hidden)
- `/evidence/:id` — Inspector with raw JSON viewer

---

## 4. The Floating Command Panel (left side, always-visible)

This **replaces** the current `topbar` in `Shell.tsx`. It is the single source of navigation, search, filtering, and live-state awareness.

- **Position**: fixed, 16px from top/left/bottom of viewport, 320px wide (collapses to 64px icon rail).
- **Shape**: 14px radius, white 92% opacity + 14px blur, 1px `--gray-200` border, `--shadow-card`.
- **Scroll**: vertical scroll inside the panel; the panel itself never scrolls the page.
- **Collapse**: chevron in upper-right of panel toggles to 64px icon rail. Hover on icons reveals labels as tooltips.

### 4.1 Section order (top to bottom)

1. **Brand header** — `Anchor` icon + "SEAM" wordmark in navy. Subtle "V2" subscript in `--slate-500`. Click → `/`.

2. **Global search** — single input with `Search` icon, placeholder *"Search vessels, IMOs, ports, entities, evidence #…"*. Pressing `/` from anywhere focuses it. Results appear in a popover below with grouped sections:
   - Vessels (name / IMO / MMSI / call sign) → links to `/vessels/:id`
   - Entities (owner / manager / flag state) → links to `/entities/:id`
   - Ports (UN/LOCODE or name) → centers map on port
   - Evidence (numeric ID → opens `/evidence/:id`)
   - Each row shows a small badge (V / E / P / #) and the matched substring highlighted in `--ocean-500`.

3. **Primary navigation** — vertical icon+label rows. Active row uses a 3px left bar in `--ocean-500` and a `--ocean-50` background wash.
   - Map (default, no icon highlight when on `/`)
   - Vessels
   - Entities
   - Ports
   - Risk feed
   - News
   - Sanctions
   - Graph
   - Schema
   - Operations *(visually separated below a divider; shown as "dev tools" with `Database` icon)*
   - Roadmap

4. **Map filters** (collapsible section, expanded by default on `/`, `/vessels`, `/ports`):
   - **Geo layers** group — toggle list driven by `GET /api/geo/layers`. Each toggle is a row with a layer name, a `Layers` icon, and an `Eye`/`EyeOff` state. Show "no live data" inline if the layer endpoint returns nothing.
   - **Risk severity** — chip row: All · Critical · High · Medium · Low · None. Multi-select; selected chips are filled in their risk color.
   - **Vessel type** — multi-select dropdown (cargo, tanker, bulker, container, passenger, fishing, other). Counts shown next to each.
   - **Flag state** — searchable multi-select. Source: `GET /api/reference/flag_state` (planned, see wiring doc).
   - **Has sanctions match** — toggle.
   - **Has open risk flag** — toggle.
   - **Port activity overlay** — radio: None · Due to arrive · Due to depart. Drives `/api/ports/activity?kind=…`.
   - **Time window** — segmented control: Live · 1h · 6h · 24h · 7d. Default Live.
   - "Reset filters" link, right-aligned, only visible if filters are non-default.

5. **Source refresh controls** (collapsible, collapsed by default). Each row is a control button + a health pill + a last-success timestamp.
   - Refresh **Positions snapshot** → `POST /api/dev/ingestion/positions-snapshot?mode=live`
   - Refresh **Particulars** (per-vessel; disabled until a vessel is selected) → `POST /api/dev/ingestion/vessel-particulars/{id}`
   - Refresh **Movements** (per-vessel) → `POST /api/dev/ingestion/vessel-movements/{id}`
   - Refresh **Port activity (arrivals)** → `POST /api/dev/ingestion/port-activity?kind=due-arrive`
   - Refresh **Port activity (departures)** → `POST /api/dev/ingestion/port-activity?kind=due-depart`
   - Refresh **Geo layers** → `POST /api/dev/ingestion/geo-layers`
   - Refresh **News (RSS)** → `POST /api/dev/ingestion/news`
   - Refresh **Sanctions (API)** — danger-styled, opens confirmation modal "This consumes 1 OpenSanctions quota request." → `POST /api/dev/ingestion/sanctions?confirm_live=true`
   - **Recompute risk flags** → `POST /api/dev/risk/recompute`
   - "Refresh all live" — primary button at the bottom → `POST /api/dev/ingestion/refresh-live`
   - Each running job shows the shimmer top-border and a small spinner on its row.

6. **Key stats strip** — fixed at the bottom of the panel (sticky). Four-up grid of compact stat tiles, each 132×72px:
   - **Tracked vessels** — count from `GET /api/map/vessels?limit=5000` (or `/api/dev/vessels` count). Sublabel: "+12 since last hr" if delta available.
   - **Active ports** — distinct ports with events in last 24h.
   - **Sanctions matches** — count of vessels/entities with `flag_type=sanctions`.
   - **Open risk flags** — total; with mini stacked bar showing severity distribution underneath.
   - Each tile is clickable and pre-filters the corresponding inspector.

7. **Footer mini-strip** — "Backend OK" green dot + last health check time. Click opens `/ops`. Show user avatar placeholder (initials in a circle) on the far right — even though there is no auth yet, design for it.

---

## 5. The Map Workspace (`/`, `/map`, default for `/vessels`, `/entities`, `/ports`, `/risk`, `/news`, `/sanctions`)

The map fills the entire viewport. The command panel floats on the left. Inspectors slide in from the right.

### 5.1 Map base style

- Use MapLibre with a custom **light analytical style**:
  - Ocean fill `--ocean-100`.
  - Land fill `--land-100`, land border `--land-200` at 0.5px.
  - Coastline `--navy-700` at 0.5px.
  - Bathymetry hidden by default; one toggle in the layers section to enable subtle 5%-opacity `--ocean-200` depth bands.
- Labels: country names in `--slate-500` italic; port names hidden until zoom ≥ 7.
- No Mapbox/Google tiles. The visual is uncluttered.

### 5.2 Vessel rendering

- **Default**: 6px circle, fill `--cyan-400` at 0.85 opacity, 1px `--white` stroke.
- **Selected**: 10px circle, fill `--ocean-500`, 2px `--white` stroke, plus a 22px outer ring in `--ocean-500` at 0.2 opacity.
- **Risk-flagged**: outer halo using the highest severity color, pulsing at 0.6–1.0 opacity over 2s.
- **Clustering**: at zoom < 6, cluster into circles labeled with count. Cluster fill `--ocean-500`, label white. Spider when clicked.
- **Vessel popover** (on click, NOT hover): white floating card, 280px wide, `--shadow-popover`:
  - Top row: vessel name (h2-card, navy-900), pinned IMO/MMSI/CallSign in mono.
  - Latest position chip: lat/lon (mono), speed (knots), course (°), nav status.
  - Risk pill row (one pill per active flag type, color by severity).
  - Owner / Manager / Flag rows if known.
  - "Open vessel" primary button → opens vessel inspector.
  - "Open in graph" secondary button → opens `/graph?subject=vessel&id={id}`.
  - "View evidence" link with `ExternalLink` icon → opens evidence inspector.

### 5.3 Geo overlay rendering (driven by `/api/geo/layers`)

- Ports (`ports_p`): orange diamond markers in `--risk-medium`, 5px, with port name labels at zoom ≥ 7.
- Coastlines (`coastline_l`): 1.5px `--navy-700`.
- Bathymetry / EEZ / shipping lanes (`*_a` polygons): translucent `--cyan-400` fill at 0.18 opacity, 1px border.
- Each layer must be designable as on/off via the command panel.

### 5.4 Port activity overlay

When the user selects Due-arrive or Due-depart in filters, render port markers as larger badges with a count of pending arrivals/departures and a small chevron indicating direction. Clicking opens the Ports inspector pre-filtered to that port.

### 5.5 Map utility bar (top-right of the canvas, floating)

- Zoom in / zoom out / fit-to-data buttons.
- Layer summary chip ("3 layers on").
- Basemap variant toggle (Light · Dark · Satellite — Dark and Satellite can be "Coming soon" placeholders, design them anyway).
- Coordinate readout (lat / lon under the cursor, mono).
- Scale bar (km and nm).
- Measure-distance tool button (toggle; click two points on map to draw a line in `--cyan-400` with distance label).

### 5.6 Map status strip (bottom-center, floating)

A small pill showing: "Showing **N vessels** · last positions refreshed **3 min ago** · 7 with active risk flags." Click "refreshed" to re-run positions snapshot.

---

## 6. Inspector Panels (right-side slide-in)

All inspectors share the same shell: 480px wide (resizable to 720px), full viewport height with 16px gutters, white floating panel, `--shadow-popover`, close `X` top-right, optional "pop out" icon to detach into a centered modal.

Each inspector has a sticky header (title + breadcrumb), a scrollable body, and an optional sticky footer for primary actions.

### 6.1 Vessels list inspector (`/vessels`)

- **Header**: "Vessels" + a count.
- **Search**: input with `Search` icon. Submitting calls `GET /api/vessels/search?q=…`. Debounced 250ms.
- **Filters**: same risk / type / flag chips as the command panel filters; selecting here syncs to the panel.
- **List rows** (each clickable, opens `/vessels/:id`):
  - Avatar: small vessel-type icon in a circle, color by risk severity (or `--slate-500` if none).
  - Title: vessel name (h2-card).
  - Subtitle: `IMO 9876543 · MMSI 987654321 · 🇸🇬` (mono for IDs, flag emoji).
  - Right column: latest-position timestamp (relative, e.g. "3 min ago"), risk pill if any.
  - Hover: row wash `--ocean-50`.
- **Empty state**: "No vessels match these filters. Try clearing risk severity or run a positions snapshot."
- **Pagination**: 25 per page with Previous / Next, plus "Showing 1–25 of 412".

### 6.2 Vessel detail inspector (`/vessels/:id`)

Layout: tabbed inside the inspector (Tabs: **Overview** · **Position history** · **Port calls** · **Evidence** · **Risk** · **Graph**).

**Overview tab**:
- Hero block: vessel name (h1-panel), IMO/MMSI/CallSign (mono row), flag chip with country code, vessel-type chip, "Source updated 12 min ago".
- Two-up metric cards: **Latest position** (lat/lon mono, speed, course, nav status, timestamp, "Center map" link) and **Identity** (gross tonnage, year built, length, beam — pulled from particulars).
- Owner / Manager / Operator block: each entity is a clickable chip → entity inspector.
- Action row (sticky footer for the tab): **Refresh particulars**, **Refresh movements**, **Open in graph**, **Open evidence**, **Add note** (placeholder; designed but disabled).

**Position history tab**: a small embedded map showing the breadcrumb trail of past positions + a table beneath (timestamp, lat/lon, speed, course, nav status, evidence #).

**Port calls tab**: list of events from `GET /api/vessels/:id/events`. Each row: event type (arrival / departure / due-arrive / due-depart), port name + UN/LOCODE, time, evidence #.

**Evidence tab**: list from `GET /api/vessels/:id/observations`. Each row: source name, observation type, observed_at, fetched_at, source record ID, payload hash (mono, truncated). Click → `/evidence/:id` inspector.

**Risk tab**: list from `GET /api/vessels/:id/risk-flags`. Each row: severity pill, flag type, summary, evidence #, created/resolved timestamps. Group by severity descending.

**Graph tab**: an embedded React Flow subgraph for this vessel (smaller version of `/graph`).

### 6.3 Entities list inspector (`/entities`)

Same pattern as vessels list, with `Building2` avatars. Subtitle shows entity type + country.

### 6.4 Entity detail inspector (`/entities/:id`)

Tabs: **Overview** · **Vessels** · **Relationships** · **Risk** · **Graph**.

- **Overview**: name, entity type, country, external ID, created/updated timestamps. Metric tiles: # vessels, # relationships, # risk flags.
- **Vessels**: list of related vessels (`GET /api/entities/:id/vessels`), each row links to vessel inspector.
- **Relationships**: rows from `GET /api/entities/:id/relationships` — relationship type, confidence, evidence summary, linked vessel chip.
- **Risk**: rows from `GET /api/entities/:id/risk-flags`.
- **Graph**: same pattern as vessel graph.

### 6.5 Ports inspector (`/ports`)

- Tabs: **Due to arrive** · **Due to depart** · **All ports**.
- Search by port name or UN/LOCODE.
- Rows: port name, UN/LOCODE chip (mono), country, # vessels currently in port, # due in next 24h.
- Each row expandable to show the actual vessel events from `GET /api/ports/activity?kind=…`.

### 6.6 Risk feed inspector (`/risk`)

- Stacked severity counters at top (Critical / High / Medium / Low) with deltas.
- Filter chips: by flag type (sanctions, dark-AIS, port-state-control, news-event, geofence, etc.), by status (open / resolved).
- Risk flag rows: severity pill, flag type, summary, subject (vessel or entity chip), evidence #, created timestamp.
- Selecting a row centers the map on the subject's last known position.
- Sticky footer: "Recompute risk flags" button.

### 6.7 News inspector (`/news`)

- Source pill (RSS feed name).
- Rows: headline, source, published time, linked entities/vessels chips.
- Each row has a "View original" `ExternalLink`.

### 6.8 Sanctions inspector (`/sanctions`)

- Top: total matches, last refresh time, "Refresh from API" and "Upload CSV" and "Refresh from CSV URL" buttons.
- Upload CSV is a drag-and-drop zone supporting `text/csv`, plus a paste-area for raw CSV.
- Rows: matched entity/vessel, source list (OpenSanctions, OFAC, EU, UK), match confidence, evidence #.

### 6.9 Evidence inspector (`/evidence/:id`)

- Header: "Evidence #1234" + source + observation type + timestamps.
- Body: pretty-printed JSON with collapsible nodes, monospace, syntax-highlighted in subtle navy/cyan. Copy-to-clipboard icon top-right.
- Side metadata: payload hash, source record ID, fetched_at, observed_at.
- "Open subject" buttons if linkable to a vessel or entity.

---

## 7. Full-canvas surfaces

### 7.1 `/graph` — Evidence relationship graph

- Top toolbar (floating, 16px from top):
  - Subject type segmented (Vessel · Entity)
  - Numeric subject ID input
  - "Load" primary button
  - Depth selector (1 hop · 2 hop · 3 hop) — design even if backend only does 1 today
  - Layout selector (Force · Hierarchical · Radial)
  - Export as PNG / JSON
- React Flow canvas covers the rest of the viewport.
- Node styles:
  - Vessel node — rounded rect, `Ship` icon, cyan accent stripe on left, name + IMO.
  - Entity node — rounded rect, `Building2` icon, navy accent stripe.
  - Risk node — `ShieldAlert` icon, severity-colored stripe.
  - Evidence node — `Database` icon, slate stripe, source name.
- Edge styles:
  - Confidence high: solid 1.5px `--ocean-500`.
  - Confidence medium: solid 1px `--slate-500`.
  - Confidence low: 1px dashed `--slate-500`.
  - Hovering an edge surfaces a tooltip: relationship type + evidence # + confidence.
- Right inspector (the same shared inspector shell): selected node's details, including linked evidence with a "View JSON" link.

### 7.2 `/schema` — Architecture atlas

- Same toolbar pattern: domain filter dropdown, "Fit view", "Export SVG".
- Node = table; header shows table name + a colored dot indicating domain (maritime, evidence, ingestion, risk, reference). Body lists columns (mono, truncate long type names).
- Edges = FKs, with FK column label.
- Right inspector: selected table's columns, types, nullability, and the API routes that touch it.

### 7.3 `/ops` — Operations Console (replaces current `/dev`)

This is the **only** screen where the map is intentionally hidden. It is a dense, multi-panel operator dashboard.

Layout: 3-column grid at ≥1280px, stacked below.

**Column 1 — Source health & jobs**:
- "Source health" panel: one row per source (OCEANS-X, OpenSanctions, RSS feeds, geo layers). Each row: source name, health pill (`--health-ok` / stale / fail), last-checked, last-success, retry button.
- "Recent ingestion jobs" panel: table — Job ID, type, status pill (queued / running / success / failure), mode, started_at, finished_at, parameters summary. Row click → expands raw JSON of parameters.
- "Recent logs" panel: virtualized log list — level chip (INFO / WARN / ERROR), message, job_id link, timestamp. Filter by level.

**Column 2 — Database state**:
- "Table counts" panel: 4-up grid of stat tiles per persisted table (`vessels`, `entities`, `risk_flags`, `evidence_observations`, `vessel_events`, etc.) driven by `GET /api/dev/table-counts`.
- "Recent observations" panel: rows of evidence observations (source + type + ID + hash + timestamp). Click → evidence inspector.
- "Reference data summary" panel: counts per reference domain (`GET /api/dev/reference/summary`), each with a "Browse" link.

**Column 3 — Ingestion controls**:
- "Live ingestion" panel: big buttons (Positions snapshot, Refresh all live, Geo layers, News RSS, Sanctions API, Risk recompute). Each button shows last-run timestamp and last-status pill below it.
- "Sanctions CSV ingestion" panel: file upload + URL textbox + paste area.
- "Manual vessel actions" panel: a search-and-pick autocomplete (vessel) followed by buttons "Refresh particulars" and "Refresh movements".
- "Port activity" panel: two big buttons "Pull due-arrive" and "Pull due-depart" with timestamps.

**Vessel browser panel** (full width below the 3-column grid):
- Reproduces the existing rich browse table (search, risk severity dropdown, paginated table).
- Columns: Vessel (link), IMO/MMSI/CallSign (mono), Flag, Type, Lat/Lon (mono), Risk pill, Flags (chip list), Last update.
- Sticky column header. CSV export button.
- "Open in map" link per row centers the main map on that vessel.

**Vessel map preview** strip at the very bottom (smaller, 240px tall): the standard `VesselMapPreview` showing all loaded vessels — provides context without leaving the console.

### 7.4 `/roadmap`

A center-aligned 720px column of stage cards. Each card: stage number circle, title, status pill (Completed / In progress / Final), body copy, "Docs" / "Tests" link row.

---

## 8. Global components to design explicitly

For each, produce focused, isolated specs (and at least one stateful variant):

1. **Button**
   - Primary (filled `--ocean-500` → hover `--navy-700`, white text)
   - Secondary (white, `--gray-200` border, navy text)
   - Tertiary / link
   - Danger (red border + red text, filled on hover)
   - Icon-only (square, 36px)
   - With loading spinner replacing the icon
   - Disabled state
2. **Input** — text, search (with leading icon and clear `X`), numeric (with stepper), textarea, with helper text and error state.
3. **Select / Dropdown** — single, multi (with chips), searchable.
4. **Pill / Badge** — risk severity, health, count badge, status (running / queued / success / failure), filter chip.
5. **Table** — sticky header, zebra rows (`--gray-100`), sort indicators, row hover, selected row, expandable row, dense vs comfortable density, empty state, loading skeleton.
6. **Card** (`metric-card`, `result-card`) — with optional sparkline, with optional risk severity stripe on the left.
7. **Tabs** — underline style, with optional count badge per tab.
8. **Tooltip** — small navy-900 background, white text, 8px radius, 6px padding.
9. **Toast / Notification** — bottom-right, slide-in. Variants: success, info, warning, error. Used for "Ingestion job complete" / "OpenSanctions quota at 87%" / "Risk recompute finished — 14 flags changed".
10. **Modal** — confirmation (used for Sanctions API quota warning), centered, max 480px wide.
11. **Empty state** — illustration slot (line art, navy-700, very minimal — anchor, ship outline, port silhouette), one-line description, primary action.
12. **Loading skeleton** — shimmer using `--gray-100` → `--gray-200` gradient.
13. **Error state** — red border, `AlertTriangle` icon, message, "Retry" button.
14. **Avatar** — initials circle (used for entities, sources, the placeholder user).
15. **Code / JSON viewer** — for evidence payloads, with copy, collapse, search.
16. **Command-K palette** — invoked by `⌘K` or `Ctrl+K`. Same content as the global search popover but as a centered modal with keyboard navigation. Sections: Go to (pages), Recently viewed vessels, Ingestion actions.

---

## 9. Specific buttons and actions that MUST appear somewhere (checklist)

Use this as a coverage checklist. Every item below must have a clear home in the design:

- [ ] Run positions snapshot (live)
- [ ] Refresh all live sources
- [ ] Refresh geo layers
- [ ] Refresh news (RSS)
- [ ] Refresh sanctions from OpenSanctions API (with confirm modal)
- [ ] Upload sanctions CSV (file)
- [ ] Ingest sanctions from CSV URL
- [ ] Recompute risk flags
- [ ] Recompute risk for a single vessel
- [ ] Refresh particulars (per vessel)
- [ ] Refresh movements (per vessel)
- [ ] Pull due-arrive port activity
- [ ] Pull due-depart port activity
- [ ] Run test job
- [ ] Toggle each geo layer
- [ ] Filter map vessels by risk severity (chips)
- [ ] Filter map vessels by vessel type
- [ ] Filter map vessels by flag state
- [ ] Toggle "has sanctions match" filter
- [ ] Toggle "has open risk flag" filter
- [ ] Time-window selector (Live / 1h / 6h / 24h / 7d)
- [ ] Reset filters
- [ ] Global search (`/`)
- [ ] Command palette (`⌘K`)
- [ ] Center map on a subject
- [ ] Fit map to current vessels
- [ ] Switch basemap (Light / Dark / Satellite)
- [ ] Measure distance on map
- [ ] Open vessel inspector
- [ ] Open entity inspector
- [ ] Open port inspector
- [ ] Open evidence inspector
- [ ] Open subject in graph
- [ ] Open subject in schema (for engineers)
- [ ] Export graph as PNG / JSON
- [ ] Export schema as SVG
- [ ] Export vessel browser CSV
- [ ] Copy IMO / MMSI / lat-lon / evidence hash
- [ ] Retry failing source
- [ ] View raw job parameters JSON
- [ ] Pop out an inspector into a modal
- [ ] Resize an inspector (480 ↔ 720)
- [ ] Collapse / expand the command panel
- [ ] Show / hide map utility bar
- [ ] View backend health
- [ ] Open API docs (footer)

---

## 10. Layout states to deliver (deliverables)

For each, produce a fully-rendered frame:

1. **Map workspace — default empty state** (no vessels yet, no jobs run): command panel calls the user to run a positions snapshot; map shows a faint "Run positions snapshot to load vessels" overlay with a button.
2. **Map workspace — loaded** (250+ vessels, several risk halos, one selected vessel with popover open).
3. **Map workspace — vessel inspector open** at `/vessels/123`, Overview tab.
4. **Map workspace — entity inspector open** at `/entities/42`, Relationships tab.
5. **Map workspace — risk feed inspector** at `/risk` with severity filter set to Critical+High.
6. **Map workspace — ports inspector** at `/ports`, Due-arrive tab.
7. **Map workspace — sanctions inspector** with CSV drag-over highlight active.
8. **Map workspace — global search popover** open with results across all subject types.
9. **Command palette** open.
10. **Graph page** with a 12-node, 18-edge subgraph and a node selected.
11. **Schema page** with one domain filtered and a table selected.
12. **Operations Console** with one job running (shimmer top-border), one source failing, vessel browser scrolled to page 3.
13. **Evidence JSON inspector** with a deeply nested payload, one node collapsed, copy button hovered.
14. **Roadmap page**.
15. **Toast stack** showing success + warning + error simultaneously.
16. **Confirm modal** for "Refresh sanctions from API".
17. **Tablet (1024px)** version of the map workspace: command panel collapsed to icon rail by default.
18. **Mobile (375px)** version: command panel becomes a bottom sheet; inspectors take full screen; map remains primary. (No need to design every page; just the map and one inspector.)
19. **Dark map basemap** preview of the workspace (the panels and inspectors stay light — only the basemap changes).
20. **Error state**: backend unreachable. Command panel shows a red dot, map shows a "Reconnecting…" pill, inspector shows the standard error component.

---

## 11. Non-goals / explicit don'ts

- No full-height left sidebar that pushes the map into a narrow column.
- No tab bars across the top of the page (the command panel is the navigation).
- No multi-color gradients on buttons or cards. Flat surfaces with one accent color per state.
- No dashboards that hide the map behind charts on `/`. Charts live inside `/ops` and inside inspector tabs.
- No emoji except optional flag emojis in vessel/entity rows.
- No teal/petroleum tones (current site uses `#006d77` — replace it with `--ocean-500`).
- No `Anchor` icon as the only brand element on every page — the wordmark is the brand, the icon is supporting.
- No skeuomorphic compass roses, knot-rope textures, "vintage map" parchment effects.

---

## 12. Accessibility & quality bar

- All interactive elements have a visible 2px `--ocean-500` focus ring with 2px white offset.
- Color is never the sole signal: risk pills always carry text ("Critical", "High", …) and an icon; map halos always have a corresponding pill in the vessel popover.
- Minimum hit target 36×36 except for table-cell action icons (28×28 with 8px padding).
- All forms keyboard-operable; Tab order matches visual order.
- The command panel is announced as a `<nav>` landmark; inspectors are `<aside role="complementary">` with a sticky close button focusable first.

---

## 13. What to hand back

Produce a single design file (Figma or equivalent) with:

1. A **Foundations** page: palette, typography scale, spacing, radii, shadows, motion tokens.
2. A **Components** page: every component in section 8 with all states.
3. A **Map workspace** page: the 20 deliverable frames in section 10.
4. A **Full-canvas surfaces** page: Graph, Schema, Operations Console, Roadmap.
5. An **Inspectors** page: every inspector from section 6 in its expanded form.
6. A **Specs** page: redlines on the command panel, the map utility bar, and one inspector, showing exact spacing, sizes, and tokens used.

When in doubt: **the map is the workspace; floating panels reveal intelligence; risk is restrained but unmistakable; nothing is decorative.**
