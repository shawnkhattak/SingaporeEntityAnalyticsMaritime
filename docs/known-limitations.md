# Known Limitations

- V1 is portfolio / non-commercial and manual-first.
- No auth or user management.
- No AI summaries or generated risk explanations.
- No numeric composite risk score — risk is categorical only (severity × semantic kind).
- Live source availability affects demos and smoke tests because fixture fallback has been removed.
- No backend scheduler or worker. Auto-refresh is a frontend `usePoll` cadence (10 min for OCEANS-X snapshot) that pauses when the tab is hidden.
- **MPA OCEANS-X port-activity scope**: with our current API key, `/api/v1/vessel/duetoarrive` and `/duetodepart` return HTTP 400 ("Invalid or missing request parameters") for every date / hours combination tested. Positions, particulars, and movements work fine with the same key — this is a per-endpoint subscription limit, not a bug. The Operations console shows an explanatory note.
- **Hash verification is best-effort**: the Evidence inspector recomputes SHA-256 over a canonical JSON encoding designed to match the backend `stable_payload_hash`. If a row was re-serialized after ingestion (key order, whitespace), Verify will say "Hash differs" — that should be treated as inconclusive, not as evidence of tampering. The UI says so.
- **Owner / manager data is mostly Singapore-flagged**: OCEANS-X exposes registered-owner relationships primarily for SG-flagged vessels. The risk model intentionally does *not* flag "unknown ownership" — absence of ownership data is uninformative.
- **Port search is in-memory only**: the command palette can't search ports because there's no `/api/ports` endpoint yet. Port activity is derivable from the cached events list when the inspector is open.
- **Windows flag emoji**: emoji flags render as country-code text on Windows (OS limitation — no built-in regional indicator glyphs). The aria-label / title still carry the full country name.
