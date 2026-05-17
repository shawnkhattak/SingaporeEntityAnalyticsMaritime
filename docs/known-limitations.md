# Known Limitations

- V1 is portfolio / non-commercial and manual-first.
- No auth or user management.
- No AI summaries or generated risk explanations.
- No numeric composite risk score — risk is categorical only (severity × semantic kind).
- Live source availability affects demos and smoke tests because fixture fallback has been removed.
- No backend scheduler or worker. Auto-refresh is a frontend `usePoll` cadence (10 min for OCEANS-X snapshot, 60 min for RSS/news) that pauses when the tab is hidden.
- **OCEANS-X endpoint scope**: endpoint access still depends on the configured API key/subscription. Positions, particulars, movements, port activity, and geo layers are wired as live calls, but source-side authorization or parameter validation can still fail independently per endpoint.
- **Hash verification is best-effort**: the Evidence inspector recomputes SHA-256 over a canonical JSON encoding designed to match the backend `stable_payload_hash`. If a row was re-serialized after ingestion (key order, whitespace), Verify will say "Hash differs" — that should be treated as inconclusive, not as evidence of tampering. The UI says so.
- **Owner / operator / manager data is mostly Singapore-flagged**: OCEANS-X exposes company relationships primarily for SG-flagged vessels. The risk model intentionally does *not* flag "unknown ownership" — absence of ownership data is uninformative.
- **Port search is in-memory only**: the command palette does not have a dedicated `/api/ports/search` endpoint yet. Port activity is available through `/api/ports/activity`.
- **Windows flag emoji**: emoji flags render as country-code text on Windows (OS limitation — no built-in regional indicator glyphs). The aria-label / title still carry the full country name.
