# Evidence Model

`source_observations` is the audit spine for V1. Ingested source payloads are stored with source name, observation type, source record ID, observed/fetched timestamps, payload hash, and raw payload.

Read models link back to observations through evidence IDs:

- `vessel_positions_latest.evidence_id`
- `relationships.evidence_id`
- `risk_flags.evidence_id`
- `sanctions_records.evidence_id`
- `port_events.evidence_id`
- `news_links.evidence_id`

`vessel_positions_latest.snapshot_job_id` is not evidence; it is snapshot membership metadata used by `/api/map/vessels?scope=latest-snapshot`.

Relationship, risk, sanctions, news, movement, and position views should all resolve evidence through `GET /api/evidence/{observation_id}`. SEAM does not infer hidden ownership; it only renders relationships derived from stored particulars, source observations, sanctions/news matches, or explicit deterministic rules.
