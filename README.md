# SEAM V2

SEAM V2 is a desktop-first maritime intelligence workspace for tracking vessels, understanding ownership/operator networks, monitoring sanctions and risk signals, and preserving the evidence behind every claim.

The app is built around a live map of Singapore-area vessel activity. OCEANS-X supplies positions, particulars, movements, and available geospatial context; OpenSanctions supplies maritime sanctions/watchlist evidence; RSS.app supplies maritime news and social/search intelligence. SEAM stores each source payload as evidence, then builds analyst-friendly map, vessel, entity, risk, news, and operations views on top.

> Repository: [shawnkhattak/SingaporeEntityAnalyticsMaritime](https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime)

## What SEAM Shows

- **Live vessel map** with AIS-style vessel markers, heading/course rotation, risk coloring on first load, entity multi-select focus, and OCEANS-X geo overlays.
- **Premium vessel profile panel** with identity, current position, movement state, particulars, risk flags, evidence, source confidence, port calls, and refresh actions.
- **Entity intelligence** for companies, owners, operators, ship managers, and ISM managers, sorted by unique vessel count and deduped by IMO.
- **Unified Risk & Sanctions feed** that groups vessel alerts into one card per vessel, including sanctions, detentions, watchlist signals, high-risk flags, identity conflicts, and adverse news.
- **Evidence-first workflows** where source observations, hashes, evidence IDs, and raw payloads remain inspectable.
- **Operations Center** for source health, ingestion jobs/logs, table counts, source refresh actions, bulk vessel particulars enrichment, and vessel browsing.
- **RSS news workspace** organized by the configured RSS.app bundles, with source badges and original links.
- **AI Weekly Brief** that can summarize stored RSS evidence into Singapore-focused top developments and neutral evidence lenses when `FEATURE_AI=true`.

## Core Data Sources

| Source | Used For |
| --- | --- |
| OCEANS-X | Vessel positions, particulars, movements, selected geo layers, source health |
| OpenSanctions Maritime | Sanctions, detention, watchlist, source dataset labels, evidence payloads |
| RSS.app JSON Feed 1.1 | Singapore social media intel, entity watchlist terms, maritime news |
| PostgreSQL/PostGIS | Canonical vessels, latest positions, entities, relationships, evidence, risk flags, news, jobs, logs |

See [docs/data-catalog.md](docs/data-catalog.md) for the compact list of all data points available for future stats pages.

## Quick Start

```sh
./start.sh
```

Services:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/api/health
- PostgreSQL/PostGIS: localhost:5432

Stop services:

```sh
./stop.sh
```

Frontend-only development:

```sh
cd frontend
npm run dev
```

Production build check:

```sh
cd frontend
npm run build
```

Backend checks should use Python 3.12 to match the container runtime:

```sh
.venv312/bin/pytest backend/app/tests/test_project_contracts.py
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/map` | Main map workspace |
| `/vessels` and `/vessels/:id` | Vessel search/list and vessel profile |
| `/entities` and `/entities/:id` | Company/owner/operator/manager list and unified entity detail |
| `/risk` | Unified Risk & Sanctions feed |
| `/news` | RSS.app maritime/social/search intelligence |
| `/ports` | Port activity inspector |
| `/evidence/:id` | Raw evidence record and payload hash verification |
| `/operations` | Operations Center and ingestion controls |
| `/roadmap` | Current product roadmap, hardening plan, and release checks |

`/sanctions` redirects into the unified Risk & Sanctions flow. Graph functionality is intentionally retired from the UI for now; backend graph code is retained but not presented as a primary user workflow.

## Demo Journey

1. Open `/operations` and confirm source health, table counts, recent jobs, and logs.
2. Run or confirm an OCEANS-X positions snapshot.
3. Open `/map` and show vessels colored by risk immediately on load.
4. Open `/risk` and review grouped Risk & Sanctions cards.
5. Open a sanctioned vessel and inspect the source list and evidence.
6. Open `/entities`, sort by unique vessels, select a company, and show its vessels focused on the map.
7. Open a related vessel profile and review particulars, movements, current port proximity, risk, and source confidence.
8. Open `/ports` to show OCEANS-X ports over the map with vessels muted for context.
9. Open `/news` and show the three RSS.app bundles plus the optional AI Weekly Brief when enabled.
10. Close with `/roadmap` to explain current scope, hardening work, paused areas, and release checks.

## Development Guardrails

- Desktop-first; narrow/mobile screens show a desktop-required gate.
- No authentication, no AI-generated risk flags, no numeric composite risk score.
- All write/mutation routes live under `/api/dev/*` and are development-only.
- The frontend never calls OCEANS-X directly.
- Every generated relationship/risk/news/sanctions fact should trace back to a `source_observations` evidence row.
- Arrival/departure-style port activity ingestion is paused until the source behavior is reliable enough for demos. Port proximity is tracked from OCEANS-X port geometry plus latest vessel positions.

## Documentation

Start at [docs/README.md](docs/README.md). Key docs:

- [Architecture](docs/architecture.md)
- [UI Overview](docs/ui-overview.md)
- [Data Catalog](docs/data-catalog.md)
- [Product Roadmap](docs/roadmap.md)
- [Map](docs/map.md)
- [Risk Flags](docs/risk-flags.md)
- [Operations Center](docs/dev-console.md)
- [Demo Script](docs/demo-script.md)
- [Known Limitations](docs/known-limitations.md)

## License

Portfolio/demo project. Add a formal license before commercial reuse or public distribution.
