# Risk Flags

V1 risk is deterministic and categorical. There is no numeric score.

Rules:

- `unknown_ownership`: no registered owner relationship is available.
- `high_risk_flag_country`: vessel flag country is configured as high risk.
- `conflicting_identity`: source observations contain conflicting identity values.
- `sanctions_match`: exact or strong sanctions match.
- `negative_news_mention`: deterministic news mention.

Recompute with `POST /api/dev/risk/recompute?vessel_id=...`.
