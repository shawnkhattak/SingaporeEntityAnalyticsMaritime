# SEAM V2

SEAM V2 is a portfolio-first maritime intelligence rebuild focused on evidence-backed vessel, entity, risk flag, and source provenance workflows.

The V1 release includes manual live OCEANS-X vessel ingestion, database-backed map vessels, MapLibre geospatial overlays, vessel and entity workflows, evidence lookup, particulars and port activity enrichment, live OpenSanctions/RSS enrichment, deterministic categorical risk flags, React Flow relationship and schema graphs, and release documentation. Runtime ingestion is live-only; fixture fallback and fixture replay have been removed.

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

Engineering practices are documented in [docs/best-practices.md](docs/best-practices.md).

## Guardrails

V1 has no auth, no AI, no TimescaleDB, no numeric risk score, and no background scheduler. Write routes belong under `/api/dev/*` and should remain development-only.

## API Examples

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/positions-snapshot?mode=live"
curl "http://localhost:8000/api/vessels/search?q=EVER&limit=5"
curl "http://localhost:8000/api/vessels/1"
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-particulars/1?mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-movements/1?mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/port-activity?kind=due-arrive&mode=live"
curl -X POST "http://localhost:8000/api/dev/ingestion/refresh-live"
curl -X POST "http://localhost:8000/api/dev/ingestion/news"
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions?confirm_live=true"
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv" -H "Content-Type: text/csv" --data-binary @opensanctions-maritime.csv
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv-url"
curl "http://localhost:8000/api/ports/activity?kind=due-arrive"
curl "http://localhost:8000/api/entities/search?q=EVERGREEN"
curl "http://localhost:8000/api/graph/vessels/1"
curl "http://localhost:8000/api/evidence/1"
curl "http://localhost:8000/api/meta/schema-graph"
```

## Frontend Surfaces

- `/dev`: manual ingestion controls, source health, logs, and recent map vessels
- `/map`: MapLibre vessel and geo-layer view
- `/vessels`: search by IMO, MMSI, call sign, or vessel name
- `/vessels/:id`: vessel identity, latest position, evidence observations, and particulars refresh
- `/entities`: entity search and detail
- `/graph`: evidence relationship graph
- `/schema`: architecture atlas
- `/roadmap`: V1 release roadmap
