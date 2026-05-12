# SEAM V2 Best Practices

These practices keep the rebuild aligned with the V1 charter and make each stage easy to verify.

## Scope Control

- Keep V1 portfolio-first and evidence-driven.
- Do not add auth, AI, TimescaleDB, a scheduler, or numeric risk scoring in V1.
- Keep all write or mutation routes under `/api/dev/*`.
- Do not add a frontend page before the backend data contract exists.
- Prefer cutting feature breadth before weakening provenance, boot reliability, or schema clarity.

## Backend

- Route modules should stay thin: validate inputs, call a service, and return typed schemas.
- Services own database queries and workflow logic.
- Store raw source payloads, payload hashes, fetch timestamps, and evidence references before deriving relationships or flags.
- Ingestion jobs must write `ingestion_jobs`, `ingestion_logs`, and `source_health` rows.
- Keep OCEANS-X access backend-owned; the frontend must only call SEAM API routes.
- Use conservative request budgets even if a source appears unlimited.

## Database

- Use PostgreSQL/PostGIS only for V1.
- Avoid historical position storage until the product explicitly needs history.
- Keep migrations deterministic and runnable from a fresh database.
- Add indexes with the query path in mind, especially identity lookup and latest-position reads.
- Use nullable source fields where external feeds are incomplete, but enforce at least one vessel identity.

## Frontend

- Treat `/dev` as the operational control surface for stage work.
- Fetch only from the SEAM backend, never external maritime APIs.
- Show empty, loading, and error states for every API-backed surface.
- Keep the interface dense, scannable, and operational rather than marketing-like.
- Use icon buttons and compact controls where the action is familiar.

## Testing

- Run `scripts/test-stages.sh` after changing routes, migrations, startup scripts, or stage-critical UI.
- Run `npm run build` after frontend changes.
- Run `../.venv312/bin/python -m compileall app` from `backend/` after backend changes when no fuller test suite exists yet.
- Verify the Docker stack with `docker compose ps`; V1 should have only `db`, `backend`, and `frontend`.
- Do not use `killall npm`; stop only the specific process you started if a command hangs.

## Documentation

- Update ADRs for durable architecture decisions.
- Update the charter only when scope rules intentionally change.
- Keep README commands runnable from a fresh clone.
- Document limitations honestly instead of hiding missing stages behind placeholder UI.
