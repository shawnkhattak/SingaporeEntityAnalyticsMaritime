# Architecture

SEAM V2 runs as three local services: a React/Vite frontend, a FastAPI backend, and PostgreSQL/PostGIS. Docker Compose wires the services for local development and demo use.

## Backend

- **Routes**: `backend/app/api/routes/*.py` are thin FastAPI handlers. Development write actions live under `/api/dev/*` and are gated by environment/feature settings.
- **Services**: `backend/app/services/*.py` owns workflow logic for ingestion, risk, map reads, vessels, entities, geo layers, ports, evidence, metadata, and operations.
- **Clients**: `backend/app/clients/oceansx.py` is the only OCEANS-X client. The frontend never calls maritime providers directly.
- **Evidence spine**: `source_observations` stores source, observation type, source record ID, observed/fetched timestamps, raw JSON payload, and a stable payload hash.
- **Read models**: latest positions, port events, entity relationships, sanctions records, risk flags, news articles, jobs, logs, source health, and table counts are derived from stored source data.
- **Latest map snapshot**: `vessel_positions_latest.snapshot_job_id` lets `/api/map/vessels?scope=latest-snapshot` show the latest upstream snapshot instead of every vessel ever accumulated.
- **Entity relationship model**: entities currently focus on companies, owners, operators, ship managers, and ISM managers. Vessel counts are deduped by IMO.

## Frontend

- **Shell**: `frontend/src/components/Shell.tsx` owns the persistent map, command panel, inspector/full-canvas switching, boot animation, and desktop-only gate.
- **Routing**: `frontend/src/hooks/useRoute.ts` uses `pushState` and a custom `seam:navigate` event. It also tracks in-app route depth so inspector back buttons can use real history with safe fallbacks.
- **State**: `frontend/src/state/AppState.tsx` stores filters, selection, panel state, inspector width, toasts, running jobs, vessel cache, source health, jobs, risk caches, and table counts.
- **Map**: `frontend/src/components/map/MapCanvas.tsx` owns one MapLibre instance. It renders vessel triangles, risk halos, clusters, selected-vessel focus, entity multi-vessel focus, entity-only labels, and optional geo layers.
- **Inspectors**: `frontend/src/components/inspector/` contains vessel, entity, ports, Risk & Sanctions, news, evidence, and list panels. All use `InspectorShell`.
- **Operations**: `frontend/src/components/canvas/OpsConsole.tsx` is the operational control surface for source health, ingestion jobs/logs, table counts, and source refresh actions.
- **Primitives**: shared buttons, inputs, pills, chips, tabs, modals, toasts, skeletons, empty states, JSON viewer, and evidence links live under `frontend/src/components/primitives/`.

## Refresh Model

SEAM has no production scheduler. Refresh is explicit or frontend-controlled:

- Map vessel data refreshes while `/map` is visible.
- OCEANS-X source refresh is intentionally controlled from Operations and app-level refresh flows.
- RSS/news refreshes hourly.
- OCEANS-X source health is considered stale after 15 minutes, not one minute.
- Operations/dev polling runs when Operations is visible; it should not globally flood `/map`.
- `usePoll` pauses when the document is hidden.

## Configuration

`.env` and backend settings cover:

- `OCEANSX_API_KEY`, `OCEANSX_BASE_URL`.
- `OPENSANCTIONS_*` API/CSV settings.
- `NEWS_RSS_URLS`, defaulting to the three RSS.app JSON Feed 1.1 bundles in [sources/news.md](sources/news.md).
- `MAX_REQUESTS_PER_RUN` and source-specific request limits.

Frontend configuration:

- `VITE_API_BASE_URL` defaults to `http://localhost:8000`.

## Retired/Paused Areas

- Graph UI is not part of the current product surface.
- Port activity ingestion is paused for now; raw OCEANS-X movements may still contain location codes useful for future port analytics.
