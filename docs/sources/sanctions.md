# Sanctions Source

V1 sanctions uses the OpenSanctions Maritime dataset: `https://www.opensanctions.org/datasets/maritime/`.

Live API calls are intentionally protected because the configured plan is quota-limited. `POST /api/dev/ingestion/sanctions` returns `428` unless `confirm_live=true` is supplied. A confirmed run uses one batched `/match/maritime` request by default:

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions?confirm_live=true"
```

Preferred bulk path:

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv" \
  -H "Content-Type: text/csv" \
  --data-binary @opensanctions-maritime.csv
```

Configured URL path:

```sh
curl -X POST "http://localhost:8000/api/dev/ingestion/sanctions-csv-url"
```

The configured URL is `https://data.opensanctions.org/datasets/20260510/maritime/maritime.csv`.

CSV columns used:

- `type`: `VESSEL` or `ORGANIZATION`.
- `caption`: preferred display name selected by OpenSanctions from available names.
- `imo`: preferred exact match key for vessels and organizations.
- `mmsi`: secondary exact match key for vessels.
- `risk`: semicolon-separated topic IDs.
- `countries`, `flag`, `id`, `url`, `datasets`, `aliases`: retained in evidence payloads.

Matching order:

- Vessels: IMO, then MMSI, then strong/exact caption or alias name fallback.
- Organizations: OpenSanctions ID when already known, then strong/exact caption or alias name fallback.

Risk topic handling:

- `sanction`: critical `sanctions_match`.
- `sanction.linked`: high `sanctions_match`.
- `mare.shadow`: high `maritime_watchlist`.
- `mare.detained`, `mare.sts`, `reg.action`, `reg.warn`, `debarment`, `sanction.counter`: medium categorical flags.
- Unknown maritime topics are retained in evidence and mapped to low `maritime_watchlist`.

Configured settings:

- `OPENSANCTIONS_API_URL=https://api.opensanctions.org`
- `OPENSANCTIONS_DATASET=maritime`
- `OPENSANCTIONS_LIVE_CALL_BUDGET=1`
- `OPENSANCTIONS_BATCH_SIZE=50`
- `OPENSANCTIONS_MARITIME_CSV_URL=https://data.opensanctions.org/datasets/20260510/maritime/maritime.csv`

Matches are classified as `exact`, `strong`, `possible`, or `weak`. Only exact and strong OpenSanctions maritime matches create active risk flags automatically.

## UI Display

Sanctions are displayed inside the unified `/risk` Risk & Sanctions feed. The separate sanctions navigation path is retired in favor of one grouped risk workflow.

Risk cards should show the human-readable source list behind the match, not only generic OpenSanctions wording. Dataset labels are derived from `payload.datasets`, then `payload.raw_csv_row.datasets`, then topics/source fallback.
