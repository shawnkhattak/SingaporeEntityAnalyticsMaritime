# SEAM Documentation

This directory documents the current SEAM V2 implementation and demo journey. The docs are organized so a reviewer can understand the product first, then inspect the data model, source integrations, operations workflow, and engineering guardrails.

## Product And Journey

- [Charter](charter-v2.md) — product scope, non-goals, and build rules.
- [Demo Script](demo-script.md) — recommended desktop demo path.
- [Demo Data](demo-data.md) — how to populate a useful demo dataset.
- [Data Catalog](data-catalog.md) — compact inventory of data points available for stats/analytics pages.
- [Known Limitations](known-limitations.md) — current caveats and source reliability notes.

## System

- [Architecture](architecture.md) — backend, frontend, state, refresh model, configuration.
- [UI Overview](ui-overview.md) — shell layout, map, inspectors, navigation, motion/accessibility.
- [Map](map.md) — vessel snapshot loading, rendering order, focus behavior, and geo layers.
- [Evidence Model](evidence-model.md) — source observation spine and evidence-backed read models.
- [Schema Atlas](schema-atlas.md) — metadata graph for database/schema understanding.

## Operations

- [Operations Center](dev-console.md) — `/operations` ingestion and source-health control surface.
- [Testing](testing.md) — validation commands and smoke-check expectations.
- [Best Practices](best-practices.md) — project conventions.

## Data Sources And Risk

- [Risk Flags](risk-flags.md) — deterministic categorical risk model and unified feed endpoint.
- [News Sources](sources/news.md) — RSS.app bundle structure and source badges.
- [Sanctions Source](sources/sanctions.md) — OpenSanctions API/CSV ingestion and dataset labels.
- [Stage 08 Particulars](implementation/stage-08-particulars.md) — OCEANS-X particulars enrichment.
- [Stage 10 Port Activity](implementation/stage-10-port-activity.md) — OCEANS-X movements and paused port-activity notes.

## Design Records

- [ADR Index](adr/README.md) — accepted architectural decisions.
- [Archive](archive/README.md) — obsolete docs retained for reference.

## Historical Design Package

`frontend/design/` contains early design/wiring notes. Treat it as historical reference, not the current source of truth. Current behavior is documented in the files above.
