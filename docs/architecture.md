# Architecture

SEAM V2 runs three services: a React (Vite 6) frontend, a FastAPI backend, and PostgreSQL/PostGIS. All compose nodes are described in `docker-compose.yml`.

## Backend

- **Routing**: `app/api/routes/*.py` — thin handlers calling services. Write/mutation routes are under `/api/dev/*` and gated behind `feature_mutations` (development-only).
- **Services**: `app/services/*.py` own queries and workflow logic — `ingestion` (OCEANS-X positions/particulars/movements/port-activity + OpenSanctions + RSS news), `risk` (deterministic recompute), `map`, `vessels`, `entities`, `graph`, `geo`, `dev_console`.
- **Clients**: `app/clients/oceansx.py` is the only file that calls OCEANS-X. The frontend never reaches out to maritime providers directly.
- **Evidence spine**: `source_observations` stores every ingested payload with source, observation type, source record ID, observed/fetched timestamps, payload hash (`stable_payload_hash` — sorted-keys + ASCII-safe JSON), and the raw JSON.
- **Read models** (`vessel_positions_latest`, `port_events`, `relationships`, `risk_flags`, `sanctions_records`, `news_articles`) carry `evidence_id` foreign keys back to `source_observations`.
- **IMO 0 filtering**: `_clean_identifier` in `ingestion.py` treats "0" / "00" / "n/a" / "null" as missing so AIS contacts without an IMO don't dedupe into a single ghost vessel. Read services (`map`, `vessels`, `dev_console`) also `WHERE imo IS NULL OR imo NOT IN ('0','00','000','0000')` as defense-in-depth.

## Frontend

A hand-rolled SPA over a fixed-position layout. See `frontend/src/`:

- **Shell** (`components/Shell.tsx`) owns the persistent map + command-panel layout. Routing uses `hooks/useRoute.ts` (pushState + a custom `seam:navigate` event so every `useRoute` instance stays in sync).
- **State** (`state/AppState.tsx`) — single context/reducer for filters, selection, panel collapse, inspector width, toasts, running jobs, vessels cache, source health, jobs, lazy risk caches, table counts. Exposes `useStatsSnapshot()` as the canonical count selector so every dashboard tile reads the same backend keys.
- **Command panel** (`components/command-panel/`) — Brand · Global search · Primary nav · Map filters · Source refresh controls · Key stats strip · Footer.
- **Map canvas** (`components/map/MapCanvas.tsx`) — one MapLibre instance for the SPA lifetime. CartoDB Positron no-labels basemap, AIS-style vessel triangle icons (pre-colored per severity, rotated by `heading_degrees` → `course_degrees` → 0), clustered at low zoom. Click → fly to a center padded by the panel + inspector geometry.
- **Inspectors** (`components/inspector/`) — share `InspectorShell` with tabs and resize handle. Vessels / Entities / Ports / Risk / News / Sanctions / Evidence. `RiskCard.tsx` is the canonical 3-row risk row used in the risk feed and vessel detail.
- **Full-canvas surfaces** (`components/canvas/`) — `GraphCanvas` (React Flow with legend; auto-loads from `?subject=…&id=…`), `SchemaCanvas` (domain-color legend in toolbar), `OpsConsole` (ingestion console).
- **Primitives** (`components/primitives/`) — Button, Input, Pill family, Chip, Tabs, Tooltip, Modal, Toast, EmptyState (compact + standard variants), Skeleton, ErrorState, ErrorBoundary, JsonViewer, `EvidenceLink` (inline/chip/button), CommandPalette.
- **Labels** (`labels.ts`) — `countryName`, `flagEmoji` (Unicode regional indicator codepoints), `vesselTypeLabel` for MPA 2–3 letter codes, `riskLabel` for human-readable risk titles + bodies + semantic kinds (sanctioned, detained, watchlist, adverse news, high-risk flag, identity conflict).
- **Format** (`format.ts`) — `parseBackendDate` treats naive UTC backend timestamps as UTC; `formatDate` and `formatRelative` render in `APP_TIME_ZONE = "America/Chicago"`.

## Auto-refresh model

SEAM has no backend scheduler. Auto-refresh is a frontend `usePoll` cadence anchored in `App.tsx`:

- OCEANS-X positions snapshot every 10 min.
- Backend health every 15 s.
- Map vessel list every 30 s while the time-window filter is `live`.
- `loadDevState()` every 60 s outside `/operations`, every 10 s inside.

`usePoll` pauses on `document.visibilitychange === "hidden"` and skips if a snapshot is already in flight.

## Configuration

`.env` reads:

- `MAX_REQUESTS_PER_RUN` — OCEANS-X snapshot row cap (default raised to 5000).
- `OCEANSX_API_KEY`, `OCEANSX_BASE_URL`.
- `OPENSANCTIONS_*` for sanctions API access and maritime CSV URL.
- `NEWS_RSS_URLS` comma-separated.

The frontend reads `VITE_API_BASE_URL` (default `http://localhost:8000`).
