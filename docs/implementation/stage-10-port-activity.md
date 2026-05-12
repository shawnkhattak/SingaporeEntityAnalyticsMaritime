# Stage 10 Port Activity

Port activity stays manual-first and evidence-backed.

## Source

- Live endpoints:
  - `/api/v1/vessel/movements/imonumber/{imo}`
  - `/api/v1/vessel/duetoarrive/date/{date}/hours/{hours}`
  - `/api/v1/vessel/duetodepart/date/{date}/hours/{hours}`

## Dev Triggers

- `POST /api/dev/ingestion/vessel-movements/{vessel_id}?mode=live`
- `POST /api/dev/ingestion/port-activity?kind=due-arrive|due-depart&mode=live`

## Storage

Each raw event row is stored as a `source_observations` record. `port_events` links back with `evidence_id` and stores vessel, port code/name, event type, and event time. Repeated live refreshes reuse observations and events by payload hash and evidence ID.
