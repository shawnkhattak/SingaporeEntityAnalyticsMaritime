# Stage 06 Baseline

Stage 06 cleans the Stage 5 baseline into a shape that can carry the rest of V1:

- Frontend code is split into app, shell, page components, API helpers, types, and formatting helpers.
- Backend read behavior is organized behind service modules for vessels, evidence, graph, reference, matching, and risk.
- New read endpoints follow a lightweight contract: Pydantic schema, service method, route, database-backed source, and smoke assertion.
- Current OCEANS-X ingestion remains manual-first and live-only. It requires `OCEANSX_API_KEY`.

The baseline intentionally keeps V1 guardrails intact: no auth, no AI, no TimescaleDB, no scheduler, no numeric risk score, and no frontend calls to OCEANS-X.
