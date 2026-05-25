# Product Roadmap

This is the Markdown companion to the in-app `/roadmap` page. It keeps the repository story aligned with the current SEAM product direction.

## Current Posture

SEAM is a desktop-first Singapore maritime intelligence demo with a working map, vessel/entity profiles, unified Risk & Sanctions feed, RSS news, optional AI Weekly Brief, evidence records, and an Operations Center.

The remaining work is mostly hardening, not a broad redesign.

## What Works Now

- Live OCEANS-X latest-snapshot vessel map.
- Risk-colored AIS-style vessel markers on first load.
- Vessel profiles with identity, position, particulars, movement context, linked entities, current port proximity, risk, and source confidence.
- Entity profiles sorted by unique vessel count with relationship roles grouped by vessel.
- Unified Risk & Sanctions feed grouped by vessel.
- Human-readable sanctions and detention source labels.
- RSS.app news bundles for Social, Watchlist, and Maritime intelligence.
- Optional AI Weekly Brief over stored RSS evidence.
- Operations Center for ingestion jobs, logs, source health, table counts, and bulk particulars refresh.
- Evidence inspector with raw payloads and payload hashes.

## Being Hardened

- Port proximity confidence and wording.
- Operations Center visual density and disabled-action states.
- AI Weekly Brief clarity, source citation UX, and neutral Singapore-focused wording.
- Regression coverage for grouped risk cards, AI cache/recompute, and source integrations.
- Documentation consistency across setup, demo, limits, sources, and roadmap.

## Paused Or Retired

- Graph UI is retired from navigation because it did not improve the current demo workflow.
- Arrival/departure-style port activity ingestion is paused until the upstream source behavior is reliable enough.
- Numeric composite risk scores are intentionally excluded.
- AI does not generate risk flags, vessel matches, sanctions conclusions, or recommendations.
- Authentication and commercial multi-tenant hardening are out of scope for the current demo.

## Release Checks

- `npm run build` passes.
- Backend contract tests pass for core routes and source wiring.
- `/map`, `/ports`, `/risk`, `/vessels`, `/entities`, `/news`, `/operations`, `/evidence/:id`, and `/roadmap` load cleanly.
- Main docs explain setup, source behavior, guardrails, and known limits.
- Demo data can be refreshed without relying on fragile placeholder data.
