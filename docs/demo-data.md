# Demo Data

The demo bootstrap path is:

```text
POST /api/dev/ingestion/refresh-live
```

Use it to refresh the main live sources that are safe for a demo run. It does not spend OpenSanctions live API quota automatically; use sanctions CSV import or the explicitly confirmed OpenSanctions action when needed.

## Recommended Demo Prep

1. Run an OCEANS-X positions snapshot.
2. Run map-vessel particulars enrichment for all current map vessels with IMO numbers.
3. Import OpenSanctions maritime CSV or run the confirmed API action.
4. Refresh RSS/news.
5. Recompute risk flags.
6. Open `/map`, `/risk`, `/entities`, `/vessels`, and `/news` once to confirm data appears.

## Notes

- The map reads the latest successful positions snapshot through `/api/map/vessels?scope=latest-snapshot`.
- The accumulated vessel table can be larger than the live map count.
- Entity coverage improves after particulars enrichment because owners/operators/managers come from vessel particulars.
- Port activity ingestion is paused; do not rely on it for a clean demo story.
