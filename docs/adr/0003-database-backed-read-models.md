# ADR 0003: Database-Backed Read Models Before Frontend Pages

## Status

Accepted.

## Context

SEAM is evidence-driven and manual-first. The frontend must not call OCEANS-X or other source APIs directly, because that would bypass source observations, dedupe behavior, and evidence links.

## Decision

Frontend pages read only from SEAM API read models backed by the database. Source refreshes are explicit write actions under `/api/dev/*`.

For each new read endpoint, add:

- A Pydantic response schema.
- A backend service method.
- A route under the public read API.
- Live ingestion when source data is needed.
- A smoke assertion in `scripts/test-stages.sh`.

## Consequences

Analyst-facing pages may show empty states until live ingestion has been manually run. This is acceptable for V1 because it keeps provenance clear and avoids stale sample data.
