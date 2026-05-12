# Map

`/map` renders live database-backed vessel positions and OCEANS-X geospatial overlays. The app reads only SEAM APIs: `/api/map/vessels`, `/api/geo/layers`, and `/api/geo/layers/{layer_name}`.

Geo layers are populated from live OCEANS-X geo endpoints through `/api/dev/ingestion/geo-layers`. If the layer has not been refreshed yet, the map shows an empty layer state rather than local sample data.
