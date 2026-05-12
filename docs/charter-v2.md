# SEAM V2 Charter

SEAM V2 is a portfolio-first, evidence-driven maritime intelligence rebuild focused on Singapore maritime activity. Version 1 optimizes for clarity, setup reliability, traceable facts, and interview/demo value rather than commercial hardening.

## V1 Scope

- Backend-owned ingestion from OCEANS-X and supporting reference sources.
- PostgreSQL with PostGIS for canonical vessel, position, event, entity, relationship, risk flag, and evidence data.
- Manual-first ingestion controls under development routes.
- A frontend that exposes `/dev`, vessel search/detail, map, relationship graph, `/roadmap`, and `/schema`.
- Raw source payload retention, payload hashes, source timestamps, and evidence references for generated relationships and flags.

## V1 Non-Goals

- No user authentication.
- No AI features.
- No numeric composite risk score.
- No TimescaleDB.
- No scheduler or background worker in the first clean shell.
- No frontend calls directly to OCEANS-X.
- No fake demo data; use current live source refreshes for demos.

## Build Rules

- Finish one stage before starting the next.
- Do not add a page before its data contract exists.
- Do not add an ingestion job without ingestion logs and source health.
- Keep write actions under `/api/dev/*`.
- Prefer cutting feature breadth before cutting evidence quality or boot reliability.

## Current Workspace Note

This workspace started as a fresh folder containing only planning documents. There is no local Git history or legacy app checkout here, so creating a `legacy-v1` tag and capturing old screenshots are not possible from this directory.
