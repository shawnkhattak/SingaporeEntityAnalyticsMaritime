# Risk Flags

SEAM risk is deterministic and categorical. There is no numeric composite score.

## Active Risk Kinds

- `sanctions_match` — exact or strong OpenSanctions maritime match.
- `maritime_watchlist` — OpenSanctions maritime watchlist or related maritime topic.
- `detained` / detention-like topics — maritime detention records when mapped from source topics.
- `high_risk_flag_country` — vessel flag country is configured as high risk.
- `conflicting_identity` — meaningful identity fields disagree across source observations.
- `negative_news_mention` — deterministic news mention.

The historical `unknown_ownership` rule is retired. OCEANS-X ownership coverage is uneven and mostly Singapore-focused, so missing ownership data is not treated as risk.

Identity conflict is treated as low risk unless combined with stronger signals. Vessel type and slight dimension differences are not included as source-mismatch conflicts.

## Unified Feed

Risk and sanctions are shown together at:

```text
GET /api/risk/feed?limit=250
```

Useful variants:

```text
GET /api/risk/feed?limit=500&flag_types=sanctions_match
GET /api/risk/feed?limit=500&include_resolved=true
```

`flag_types` can be repeated for OR semantics.

The frontend groups connected alerts so one vessel appears once in the Risk & Sanctions panel. Each card can contain sanctions, watchlist, identity, high-risk flag, adverse news, and detention rows.

## Recompute

Recompute all risk:

```text
POST /api/dev/risk/recompute
```

Recompute one vessel:

```text
POST /api/dev/risk/recompute?vessel_id=123
```

## Sanctions Source Labels

Sanctions cards should display human-readable OpenSanctions dataset labels, for example:

- `ca_dfatd_sema_sanctions` → Canada SEMA Sanctions List.
- `us_ofac_sdn` → U.S. OFAC SDN List.
- `eu_fsf` → EU Financial Sanctions List.

If a dataset is unknown, SEAM converts snake_case into readable title case instead of showing raw technical IDs when possible.
