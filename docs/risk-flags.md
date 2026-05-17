# Risk Flags

V1 risk is deterministic and categorical. There is no numeric score.

## Active Rules And Sources

- `high_risk_flag_country`: vessel flag country is configured as high risk.
- `conflicting_identity`: source observations contain conflicting identity values.
- `sanctions_match`: exact or strong sanctions match.
- `maritime_watchlist`: OpenSanctions maritime watchlist match.
- `negative_news_mention`: deterministic news mention.

The historical `unknown_ownership` rule is retired. OCEANS-X ownership coverage is mostly Singapore-flagged, so absence of an ownership relationship is not treated as a risk signal.

## API

Recompute all risk:

```text
POST /api/dev/risk/recompute
```

Recompute one vessel:

```text
POST /api/dev/risk/recompute?vessel_id=123
```

Load the aggregated feed used by the Risk and Sanctions inspectors:

```text
GET /api/risk/feed?limit=250
GET /api/risk/feed?limit=500&flag_types=sanctions_match
```

`include_resolved=true` includes resolved flags. `flag_types` can be repeated for OR semantics.
