# Stage 10 Port Activity

Port activity stays manual-first and evidence-backed.

> Current status: arrival/departure ingestion is paused for the demo because source behavior is not reliable enough yet. Current port proximity is active and uses latest vessel positions plus named OCEANS-X port/service points.

## Source

- Live endpoints:
  - `/api/v1/vessel/movements/imonumber/{imo}`
  - `/api/v1/vessel/duetoarrive/date/{date}/hours/{hours}`
  - `/api/v1/vessel/duetodepart/date/{date}/hours/{hours}`
  - `/api/v1/gssdataset/mpa/portsandservicesp-zip`

The `date` value sent to OCEANS-X is formatted as `YYYYMMDD`; SEAM's public dev trigger accepts an ISO date query value and normalizes it before calling the client.

## Dev Triggers

- `POST /api/dev/ingestion/vessel-movements/{vessel_id}?mode=live`
- `POST /api/dev/ingestion/port-activity?kind=due-arrive|due-depart&mode=live&date=YYYY-MM-DD`

When arrival/departure ingestion is re-enabled, the Ports inspector can load the selected/current local date and refresh arrivals and departures through the same trigger. The read API is:

- `GET /api/ports/activity?kind=due-arrive|due-depart&date=YYYY-MM-DD&limit=100`

## Storage

Each raw event row is stored as a `source_observations` record. `port_events` links back with `evidence_id` and stores vessel, port code/name, event type, and event time. Repeated live refreshes reuse observations and events by payload hash and evidence ID.

Current port proximity is stored on the vessel row and in `port_events` as `port_proximity` events with distance in meters. It should be read as a proximity signal, not a formal port call declaration.
