# Map

`/map` is the core SEAM operating picture. The frontend reads SEAM APIs only: `/api/map/vessels`, `/api/geo/layers`, and `/api/geo/layers/{layer_name}`.

## Vessel Snapshot

The normal map request is:

```text
GET /api/map/vessels?limit=5000&scope=latest-snapshot
```

`scope=latest-snapshot` filters latest vessel positions by the latest successful OCEANS-X positions snapshot. This keeps the visible map count aligned with the newest upstream response instead of showing every vessel accumulated in the database.

The response includes active risk flags and highest severity, so markers are colored by risk immediately on first load.

## Rendering Behavior

- Vessel symbols are AIS-style triangles.
- Rotation uses heading, then course, then north.
- Severity colors are critical, high, medium, low, and none.
- Risky vessels sort above lower-risk vessels.
- Low zoom clusters vessels with MapLibre clustering.
- Cluster clicks expand to the cluster expansion zoom.

## Focus Behavior

- Selecting a vessel keeps that vessel fully visible, adds a blue focus ring, and fades unrelated vessels.
- Selecting an entity loads the entity's related vessels, highlights all of them, labels only those focused vessels, and fades unrelated vessels.
- Closing the inspector clears selection and returns the map to normal opacity.
- Inspector fly-to requests include left padding so selected vessels are centered in the free map area, not under side panels.

## Geo Layers

OCEANS-X geo layers can be toggled from map filters. The current visible product toggle is OCEANS-X ports. If a layer is not cached, the backend attempts a live fetch through the configured OCEANS-X client.

If OCEANS-X does not return a usable layer for the configured key/subscription, the map fails quietly instead of breaking the demo.

## Important Notes

- The map should stay fresh while visible.
- Duplicate vessel snapshot fetches should be avoided.
- Operations/dev polling should not run globally on `/map` unless a visible component needs it.
