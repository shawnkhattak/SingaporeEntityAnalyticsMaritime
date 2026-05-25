<p align="center">
  <img src="frontend/public/seam-mark-animated.svg" width="120" height="120" alt="SEAM logo" />
</p>

<h1 align="center">SEAM 🌊</h1>
<p align="center"><strong>Singapore Entity Analytics — Maritime Intelligence 🚢</strong></p>

<p align="center">
  <em>A live maritime intelligence workspace for tracking vessels, understanding ownership networks, monitoring sanctions and risk, and preserving the evidence behind every claim.</em>
</p>

---

## What is SEAM? 🧭

SEAM gives analysts a real-time picture of maritime activity around Singapore. It brings together vessel positions, corporate ownership, sanctions watchlists, and news intelligence into a single map-based workspace — so analysts can investigate faster without switching between spreadsheets, government portals, and open-source data feeds.

## What it does ⚓

| Capability | Description |
| --- | --- |
| **Live vessel map** 🗺️ | Real-time vessel positions with risk-based coloring and heading indicators |
| **Vessel profiles** 🚢 | Identity, movement history, ownership chain, port calls, and risk flags — all in one panel |
| **Entity intelligence** 🏢 | Who owns what? Companies, operators, and ship managers linked to their fleets |
| **Risk & Sanctions** 🚨 | Unified feed of sanctions, detentions, watchlist hits, and identity conflicts |
| **Evidence trail** 🧾 | Every data point traces back to its source observation — verifiable and auditable |
| **News workspace** 📰 | Singapore-focused maritime news, social intel, and optional AI weekly brief |
| **Operations center** 🛠️ | Source health monitoring, ingestion controls, and data quality visibility |

## How it works (high level) ⚙️

```text
     OCEANS-X         OpenSanctions         RSS.app
    (positions)        (sanctions)          (news/intel)
         │                  │                    │
         └──────────────────┼────────────────────┘
                            ▼
                    ┌──────────────┐
                    │   SEAM API   │  ← ingests, stores evidence, builds views
                    │  (FastAPI)   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  PostgreSQL   │  ← canonical data + PostGIS geo
                    │   / PostGIS  │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  SEAM UI     │  ← React map workspace
                    │  (Vite)      │
                    └──────────────┘
```

## Quick start 🚀

```sh
./start.sh
```

Then open **http://localhost:5173** in your browser.

| Service | URL |
| --- | --- |
| Frontend 🖥️ | http://localhost:5173 |
| Backend API 🔌 | http://localhost:8000/api/health |
| Database 🗄️ | localhost:5432 |

To stop everything:

```sh
./stop.sh
```

## Main pages 🧩

| Page | What you'll find |
| --- | --- |
| `/map` 🗺️ | Live vessel map — the main workspace |
| `/vessels` 🚢 | Search and browse vessels |
| `/entities` 🏢 | Companies, owners, and operators |
| `/risk` 🚨 | Risk & Sanctions feed |
| `/news` 📰 | Maritime news and social intel |
| `/ports` ⚓ | Port activity |
| `/operations` 🛠️ | System health and ingestion controls |

## Documentation 📚

Detailed docs live in the [`docs/`](docs/) folder:

- [Architecture](docs/architecture.md) 🏗️
- [UI Overview](docs/ui-overview.md) 🖥️
- [Data Catalog](docs/data-catalog.md) 🗂️
- [Roadmap](docs/roadmap.md) 🛣️
- [Risk Flags](docs/risk-flags.md) 🚩
- [Operations Center](docs/dev-console.md) 🛠️
- [Known Limitations](docs/known-limitations.md) ⚠️

## License 📄

Portfolio/demo project. Add a formal license before commercial reuse or public distribution.
