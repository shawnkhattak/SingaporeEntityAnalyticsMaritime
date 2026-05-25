# Known Limitations

- SEAM is a portfolio/demo project, not a production commercial deployment.
- Desktop-first only. Narrow/mobile screens show a polished desktop-required gate.
- No authentication or user management.
- AI is optional and limited to the News page's evidence-bound Weekly Brief. It does not create risk flags, vessel matches, or sanctions conclusions.
- No numeric composite risk score.
- No production backend scheduler or worker. Refresh is explicit or frontend-controlled.
- Live source availability affects demos and smoke tests because source fallback data is intentionally avoided.
- OCEANS-X endpoint access depends on the configured API key/subscription. Positions, particulars, movements, and geo layers can fail independently.
- Arrival/departure-style port activity ingestion is paused until the source behavior is reliable enough for demo use.
- Current port proximity is approximate. It is derived from latest vessel positions and named OCEANS-X port/service points, not from a formal port-arrival declaration.
- OCEANS-X company/relationship data is strongest for Singapore-linked vessels. Missing ownership/management data is not treated as risk.
- OpenSanctions live API access is quota-sensitive; CSV ingestion is preferred for bulk refreshes.
- Hash verification is best-effort. A mismatch can mean serialization drift, not necessarily tampering.
- Port display depends on the OCEANS-X `portsandservicesp` geo layer and the configured API key/subscription.
- Windows may render flag emoji as country-code text. The UI still includes title/aria labels.
- Graph UI is retired from the product surface for now.
