# Dev Console

`/operations` is the canonical operational control surface for V1. `/ops` and `/dev` remain aliases for compatibility. Write actions remain under `/api/dev/*`.

It exposes source health, live ingestion controls, table counts, recent observations, jobs, logs, database table summaries, and a full-width vessel browser.

Common operations:

- Run OCEANS-X positions snapshots, particulars, movements, port activity, and geo-layer ingestion.
- Run **SG map vessel particulars** to fetch and save OCEANS-X particulars for every current Singapore-flagged map vessel with an IMO. This starts a background `oceansx.vessel_particulars_bulk` job, spaces requests by the configured delay, and shows progress as completed / total vessels. Starting a new bulk run supersedes any stale queued/running bulk particulars job.
- Refresh OpenSanctions and RSS news sources.
- Upload or fetch OpenSanctions maritime CSV data.
- Recompute deterministic risk flags.
- Inspect recent ingestion jobs/logs and source health.
- Browse vessels with latest position and risk metadata.

Bulk particulars endpoint:

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/vessel-particulars-map?delay_seconds=0.1"
```

Progress is stored on the ingestion job `parameters` as `total`, `completed`, `succeeded`, `failed`, and `skipped`, so the Operations page can poll `/api/dev/ingestion/jobs` and render a progress bar without holding the HTTP request open.
