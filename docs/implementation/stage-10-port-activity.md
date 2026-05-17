# Stage 10 Port Activity

Port activity stays manual-first and evidence-backed.

## Source

- Live endpoints:
  - `/api/v1/vessel/movements/imonumber/{imo}`
  - `/api/v1/vessel/duetoarrive/date/{date}/hours/{hours}`
  - `/api/v1/vessel/duetodepart/date/{date}/hours/{hours}`

The `date` value sent to OCEANS-X is formatted as `YYYYMMDD`; SEAM's public dev trigger accepts an ISO date query value and normalizes it before calling the client.

## Dev Triggers

- `POST /api/dev/ingestion/vessel-movements/{vessel_id}?mode=live`
- `POST /api/dev/ingestion/port-activity?kind=due-arrive|due-depart&mode=live&date=YYYY-MM-DD`

The Ports inspector loads the selected/current local date and refreshes arrivals and departures through the same trigger. The read API is:

- `GET /api/ports/activity?kind=due-arrive|due-depart&date=YYYY-MM-DD&limit=100`

## Storage

Each raw event row is stored as a `source_observations` record. `port_events` links back with `evidence_id` and stores vessel, port code/name, event type, and event time. Repeated live refreshes reuse observations and events by payload hash and evidence ID.
