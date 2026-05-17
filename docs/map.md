# Map

`/map` renders live database-backed vessel positions and OCEANS-X geospatial overlays. The frontend reads only SEAM APIs: `/api/map/vessels`, `/api/geo/layers`, and `/api/geo/layers/{layer_name}`.

## Vessel Snapshot

The default map request is:

```text
GET /api/map/vessels?limit=5000&scope=latest-snapshot
```

`scope=latest-snapshot` filters `vessel_positions_latest` by the latest successful `oceansx.positions_snapshot` ingestion job via `snapshot_job_id`. This keeps the map and Live vessels stat aligned with the latest upstream OCEANS-X response instead of showing every vessel accumulated in the database. `scope=all` is available for diagnostics.

The map response also includes each vessel's active risk flags and highest severity. Initial vessel colors are therefore available on first load from `/api/map/vessels`; users do not need to open the Risk inspector before high-risk vessels render in their risk colors.

## Rendering Behavior

- Vessel symbols are AIS-style triangles, rotated by heading, then course, then north.
- Severity colors are `critical`, `high`, `medium`, `low`, and `none`.
- Risky vessels sort above lower-risk vessels by default.
- The selected vessel sorts above every other vessel.
- When a vessel is selected, non-focused vessels fade while the selected vessel and its halo remain prominent.
- Low zoom uses MapLibre clustering; cluster clicks expand to the cluster expansion zoom.

## Geo Layers

Geo layers are populated from live OCEANS-X geo endpoints through `/api/dev/ingestion/geo-layers`. If the layer has not been refreshed yet, the map shows an empty layer state rather than local sample data.
