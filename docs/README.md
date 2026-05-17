# SEAM Documentation

This directory documents the current SEAM V2 implementation. Start with the product and system overview, then drop into source-specific or implementation notes as needed.

## Core

- [Architecture](architecture.md) — backend, frontend, state, refresh model, configuration.
- [UI Overview](ui-overview.md) — shell layout, map, inspectors, command palette, motion/accessibility.
- [Map](map.md) — live vessel snapshot, rendering order, focus behavior, geo layers.
- [Evidence Model](evidence-model.md) — observation spine and evidence-backed read models.
- [Schema Atlas](schema-atlas.md) — `/schema` and metadata graph.

## Operations

- [Dev Console](dev-console.md) — `/operations` ingestion and database control surface.
- [Testing](testing.md) — release gate commands and smoke checks.
- [Demo Data](demo-data.md) and [Demo Script](demo-script.md) — demo flow.
- [Known Limitations](known-limitations.md) — current guardrails and caveats.
- [Best Practices](best-practices.md) — project conventions.

## Data Sources And Risk

- [Risk Flags](risk-flags.md) — deterministic categorical risk model and feed endpoint.
- [News Source](sources/news.md) — RSS ingestion.
- [Sanctions Source](sources/sanctions.md) — OpenSanctions API and CSV ingestion.
- [Stage 10 Port Activity](implementation/stage-10-port-activity.md) — OCEANS-X movements and due-arrive/due-depart ingestion.

## Design Records

- [ADR Index](adr/README.md) — accepted architectural decisions.
- [Charter](charter-v2.md) — scope guardrails.
- [Archive](archive/README.md) — obsolete docs retained for reference.
