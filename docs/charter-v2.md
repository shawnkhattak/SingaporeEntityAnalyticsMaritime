# SEAM V2 Charter

SEAM V2 is a desktop-first, evidence-driven maritime intelligence platform focused on Singapore maritime activity. It prioritizes a polished analyst demo, source traceability, operational clarity, and a coherent product story over commercial hardening.

## Product Promise

SEAM helps an analyst answer:

- What vessels are active on the map right now?
- Which vessels carry sanctions, detention, watchlist, identity, flag, or adverse-news risk?
- Which companies, owners, operators, ship managers, and ISM managers are tied to those vessels?
- What source payload produced each claim?
- How fresh and reliable are the underlying data sources?

## Current Scope

- Live OCEANS-X positions, particulars, movements, and available geo layers.
- OpenSanctions maritime ingestion through protected API and CSV paths.
- RSS.app maritime/social/search intelligence bundles.
- Optional AI Weekly Brief over stored RSS evidence.
- PostgreSQL/PostGIS canonical storage for vessels, latest positions, events, entities, relationships, risk flags, news, jobs, logs, source health, and evidence observations.
- Map-first React workspace with inspectors for vessels, entities, ports, Risk & Sanctions, news, evidence, and operations.
- Deterministic categorical risk flags with human-readable UI.
- Evidence retention with raw payloads and payload hashes.
- Development-only ingestion actions under `/api/dev/*`.

## Non-Goals

- No user authentication or authorization.
- No AI-generated risk flags, vessel matches, sanctions conclusions, or operational recommendations.
- No numeric composite risk score.
- No production scheduler or background worker.
- No direct frontend calls to OCEANS-X.
- No full mobile workflow; narrow screens show a desktop-required gate.
- No commercial multi-tenant hardening.

## Product Guardrails

- Do not show analysis that cannot be traced to a source observation.
- Keep AI evidence-bound and limited to organizing stored news when enabled.
- Do not add a page before its data contract exists.
- Prefer clear categorical risk over pseudo-precise scoring.
- Keep Operations honest: stale/failing sources should be visible.
- Keep write actions development-gated.
- Prefer cutting feature breadth before weakening evidence quality, boot reliability, or map clarity.

## Current Retired/Paused Areas

- Graph UI is retired from the product surface for now because it was not useful enough for the demo workflow. Backend code may remain, but docs and navigation should not position it as a primary feature.
- Arrival/departure-style port activity ingestion is paused until OCEANS-X port/movement behavior is reliable enough to demo cleanly. Current port proximity remains active as an approximate map-derived signal.
