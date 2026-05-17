# Stage 08 Particulars

Vessel particulars enrichment uses the same live-only manual pattern as positions.

## Source

- Live endpoint: `/api/v1/vessel/particulars/imonumber/{imo}`
- Dev trigger: `POST /api/dev/ingestion/vessel-particulars/{vessel_id}?mode=live`

## Stored Outputs

- `source_observations` with `observation_type="vessel_particulars"`
- Enriched fields on `vessels`: name, IMO, MMSI, call sign, flag, vessel type, source timestamp
- `entities` for company owners, operators, ship managers, and ISM managers only
- `relationships` from vessel to entity with `confidence="observed"` and an evidence ID

Repeated live enrichment reuses matching observations, entities, and relationships rather than creating noisy duplicates.
