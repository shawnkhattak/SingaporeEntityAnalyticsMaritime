# SEAM V2

SEAM V2 is a portfolio-first **maritime intelligence platform** built around an evidence-backed analyst workspace. It fuses live OCEANS-X AIS positions, port activity, vessel particulars, OpenSanctions, and RSS news into a map-first SPA — every relationship and risk flag traces back to the source observation that produced it.

> Repo: [shawnkhattak/SingaporeEntityAnalyticsMaritime](https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime)

## Highlights

- **Map-first workspace** — one persistent MapLibre canvas under a floating command panel, inspectors slide in on the left, full-canvas surfaces (Graph / Schema / Operations / Roadmap) replace the map only when chosen. Light analytical basemap (CartoDB Positron no-labels) with AIS-style vessel triangles colored by risk severity and rotated by heading.
- **Evidence is a first-class affordance** — every risk card, sanctions match, port event, vessel-detail observation, and graph node carries an `EvidenceLink` chip. The Evidence inspector has Copy ID, Copy Hash, **Verify Hash** (SubtleCrypto SHA-256 over the canonical JSON), View Raw Source, and Linked-subjects chips derived from the payload.
- **Live OCEANS-X ingestion with auto-refresh** — manual triggers + background `usePoll` snapshot every 10 minutes. Map reads default to `scope=latest-snapshot`, backed by `vessel_positions_latest.snapshot_job_id`, so the live map shows the most recent upstream snapshot rather than every vessel ever accumulated.
- **Categorical risk model with human-readable surfaces** — sanctioned, detained, watchlist, high-risk flag, identity conflict, adverse news. `/api/risk/feed` loads the Risk and Sanctions inspectors in one server-side query instead of discovering flags vessel-by-vessel.
- **Command palette (⌘K)** — searches across vessels, entities, ports, evidence IDs, risk flags, sanctions matches, recent items. Full keyboard navigation, `role="listbox"` with `aria-activedescendant`, footer kbd hints.
- **Times in Houston Central** — `formatDate` and `formatRelative` render every timestamp in `America/Chicago` regardless of the device's clock.

## Quick Start

```sh
./start.sh
```

The shell starts three services:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/api/health
- PostgreSQL/PostGIS: localhost:5432

Stop services with:

```sh
./stop.sh
```

The backend container applies Alembic migrations before starting the API. For local backend checks, use Python 3.12 to match the container runtime:

```sh
cd backend
../.venv312/bin/alembic upgrade head
```

Run implemented-stage smoke checks with:

```sh
scripts/test-stages.sh
```

Frontend dev: source is bind-mounted into the Docker container, so `vite` HMR picks up host edits without rebuilding. If you need a host dev server instead, stop the frontend container and run `cd frontend && npm run dev`.

Documentation starts at [docs/README.md](docs/README.md). Engineering practices are documented in [docs/best-practices.md](docs/best-practices.md).

## Guardrails

V1 has no auth, no AI, no TimescaleDB, no numeric risk score, and no backend scheduler — auto-refresh is a frontend `usePoll` cadence. Write routes belong under `/api/dev/*` and remain development-only. OCEANS-X endpoint availability can still depend on the configured API key/subscription.

## API Examples

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/positions-snapshot?mode=live"
curl "http://localhost:8000/api/vessels/search?q=EVER&limit=5"
curl "http://localhost:8000/api/vessels/1"
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-particulars/1?mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-particulars-map?delay_seconds=0.5"
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-movements/1?mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/port-activity?kind=due-arrive&mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/refresh-live"
curl -X POST "http://localhost:8000/api/dev/ingestion/news"
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions?confirm_live=true"
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv" -H "Content-Type: text/csv" --data-binary @opensanctions-maritime.csv
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv-url"
curl "http://localhost:8000/api/ports/activity?kind=due-arrive"
curl "http://localhost:8000/api/map/vessels?limit=5000&scope=latest-snapshot"
curl "http://localhost:8000/api/risk/feed?limit=250"
curl "http://localhost:8000/api/entities/search?q=EVERGREEN"
curl "http://localhost:8000/api/graph/vessels/1"
curl "http://localhost:8000/api/evidence/1"
curl "http://localhost:8000/api/meta/schema-graph"
```

## Frontend Surfaces

The SPA reuses one URL space. The map and command panel are persistent on every inspector route; full-canvas surfaces replace the map only when chosen.

- `/` and `/map` — Map workspace. Click a vessel triangle to open its detail inspector with a padded fly-to.
- `/vessels` — Vessel list inspector with severity-ringed avatars, type chips, source badge, relative last-seen.
- `/vessels/:id` — Vessel detail (Overview / Port calls / Evidence / Risk / Graph). Overview has metric tiles, top risk cards, source-confidence matrix, recent-movement strip.
- `/entities` and `/entities/:id` — Entity list + detail (Overview / Vessels / Relationships / Risk / Graph).
- `/ports` — Port activity inspector (Due to arrive / Due to depart / All ports) for the selected/current local date.
- `/risk` — Server-loaded risk feed with semantic kind chips (Sanctioned · Detained · Watchlist · Adverse news · High-risk flag · Identity conflict) and the standard `RiskCard` layout.
- `/news` — RSS.app-derived stories with source badges for social, government, search-feed, and maritime publication sources.
- `/sanctions` — Read-only sanctions matches (CSV upload lives in Operations).
- `/evidence/:id` — Evidence inspector with Copy ID, Copy Hash, Verify Hash, View Raw Source, Linked subjects, raw JSON viewer.
- `/graph` — React Flow subgraph with legend (node colors + edge confidence). Auto-loads from `?subject=vessel&id=N`.
- `/schema` — Architecture atlas with domain-color legend.
- `/operations` — Ingestion console (canonical path; `/ops` and `/dev` are aliases). Three-column grid: source health + jobs + logs, DB state, ingestion controls, plus full-width vessel browser.
- `/roadmap` — Stage timeline.

## Layout & motion

- Floating command panel (12 px insets, 296 ↔ 60 px) over the map. Auto-collapses when an inspector opens; inspector shifts to `left: 320 px` when the panel is manually expanded.
- Inspector close buttons replace the current inspector URL with `/map`; closing a vessel, port, risk, or evidence pullout does not navigate back through previous pullouts.
- ⌘K command palette with multi-collection search and keyboard hints.
- Reduced-motion respected via `prefers-reduced-motion: reduce`.
