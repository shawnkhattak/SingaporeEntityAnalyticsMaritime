# Operations Center

`/operations` is the canonical operational control surface. `/ops` and `/dev` remain aliases.

The page is for demo readiness and internal operation, not end-user maritime analysis. Write actions remain under `/api/dev/*`.

## What It Shows

- System status.
- Source health and active issues.
- Action Center for source refreshes and ingestion jobs.
- Data Overview table counts.
- Operations timeline.
- Recent jobs.
- Recent logs.
- Vessel browser with filters and CSV export.
- Advanced/Developer section for lower-level actions.

## Common Actions

- Refresh live sources.
- Run OCEANS-X positions snapshot.
- Refresh RSS/news.
- Refresh OpenSanctions through CSV/API flows.
- Recompute risk flags.
- Fetch particulars for every current map vessel with an IMO.
- Refresh a selected vessel's particulars or movements.
- Inspect recent source observations.

## Bulk Vessel Particulars

The map-vessel particulars action fetches particulars for every vessel currently represented on the map that has an IMO. It is no longer limited to Singapore-flagged vessels.

The Operations button itself becomes the animated progress bar while a run is active. It shows:

- Completed / total vessels.
- Success/failure/skipped counts.
- Live estimated time remaining.
- Cancel behavior when clicked again during an active run.
- Done state that can be closed/reset.

Endpoint:

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-particulars-map?delay_seconds=0.1"
```

Progress is stored on the ingestion job `parameters` as:

- `total`
- `completed`
- `succeeded`
- `failed`
- `skipped`
- cancellation/progress metadata when available

## Source Freshness

- OCEANS-X is considered stale after 15 minutes.
- RSS/news refreshes hourly.
- Operations polling should run while `/operations` is visible, not globally on the map route.

## Paused Areas

Port activity ingestion is paused because the current source behavior is not reliable enough for the demo. OCEANS-X movement observations may still contain raw location codes for future port analytics.
