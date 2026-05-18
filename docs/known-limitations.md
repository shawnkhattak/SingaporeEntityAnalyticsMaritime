# Known Limitations

- SEAM V2 is a portfolio/demo project, not a production commercial deployment.
- Desktop-first only. Narrow/mobile screens show a polished desktop-required gate.
- No authentication or user management.
- No AI-generated summaries, matching, or risk explanations.
- No numeric composite risk score.
- No production backend scheduler or worker. Refresh is explicit or frontend-controlled.
- Live source availability affects demos and smoke tests because source fallback data is intentionally avoided.
- OCEANS-X endpoint access depends on the configured API key/subscription. Positions, particulars, movements, and geo layers can fail independently.
- Port activity ingestion is paused until the source behavior is reliable enough for demo use.
- OCEANS-X company/relationship data is strongest for Singapore-linked vessels. Missing ownership/management data is not treated as risk.
- OpenSanctions live API access is quota-sensitive; CSV ingestion is preferred for bulk refreshes.
- Hash verification is best-effort. A mismatch can mean serialization drift, not necessarily tampering.
- Port search is currently in-memory through available port activity data.
- Windows may render flag emoji as country-code text. The UI still includes title/aria labels.
- Graph UI is retired from the product surface for now.
