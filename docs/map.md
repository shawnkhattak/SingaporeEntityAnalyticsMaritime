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
- Opening a vessel recenters the map into the free space beside the side menus without changing the user's current zoom level.
- Closing the inspector clears selection and returns the map to normal opacity.
- Inspector fly-to requests include left padding so selected vessels are centered in the free map area, not under side panels.

## Geo Layers

OCEANS-X geo layers can be toggled from map filters. The current visible product toggle is OCEANS-X ports. If a layer is not cached, the backend attempts a live fetch through the configured OCEANS-X client.

On `/ports`, the ports layer is enabled automatically. Vessel markers are still visible as muted context, but vessel clicks and cluster clicks are disabled on that route so the map behaves like a port-inspection surface.

If OCEANS-X does not return a usable layer for the configured key/subscription, the map fails quietly instead of breaking the demo.

## Port Proximity

SEAM tracks a lightweight "current port" signal by comparing latest vessel positions against named OCEANS-X port/service points. A vessel is considered near a port when it is within the configured radius and, when speed is available, moving slowly enough to be plausibly at or near the port.

This is not a formal arrival/departure declaration. It is a map-derived proximity signal used to help analysts see which port a vessel is probably associated with right now.

## Important Notes

- The map should stay fresh while visible.
- Duplicate vessel snapshot fetches should be avoided.
- Operations/dev polling should not run globally on `/map` unless a visible component needs it.
