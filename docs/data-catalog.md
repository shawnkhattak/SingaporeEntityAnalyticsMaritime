# Data Catalog

This is the compact inventory of data points SEAM currently exposes or stores. It is meant to help design future stats, overview, and analytics pages.

## Vessel Snapshot And Identity

- Vessel count in latest map snapshot.
- Total vessel count in database.
- Vessel name, IMO, MMSI, call sign.
- Flag country code and flag label/emoji.
- Vessel type code and friendly vessel type label.
- Latest latitude/longitude.
- Latest position timestamp and relative age.
- Speed in knots.
- Course and heading.
- Navigational status when available.
- Latest source update timestamp.
- Evidence ID for latest position.

## Vessel Particulars

- Year built.
- Deadweight.
- Gross tonnage.
- Net tonnage.
- Length, breadth, and depth.
- Particulars source timestamp.
- Particulars refresh status per vessel.
- Bulk particulars job total/completed/succeeded/failed/skipped counts.

## Movement And Port Activity

- Vessel movement observations from OCEANS-X.
- Movement type.
- Movement start and end time.
- Raw origin/destination location codes when present.
- Port event count.
- Port code and port name when mapped.
- Current port name/code from latest-position proximity.
- Current port distance in meters and detection timestamp.
- Arrival/departure event type.
- Port proximity event type.
- Event timestamp.
- Port-event evidence ID.

## Entities And Relationships

- Company/entity count.
- Entity name, type, country code, external ID.
- Unique related vessel count, deduped by IMO.
- Relationship record count.
- Relationship role: owner, operator, ship manager, ISM manager.
- Relationship confidence.
- Relationship evidence ID and source summary.
- Related vessel IDs/names/IMO/MMSI/flag/type.

## Risk And Sanctions

- Active risk flag count.
- Risk severity: critical, high, medium, low.
- Risk status: active/resolved/open.
- Risk type: sanctioned, detained, watchlist, identity conflict, high-risk flag, adverse news.
- Highest risk severity per vessel.
- Risk flag created/updated timestamps.
- Risk evidence ID.
- Sanctions source datasets and human-readable labels.
- OpenSanctions topics.
- OpenSanctions entity ID, URL, countries, schema, caption, aliases, raw CSV row.
- Identity conflict fields and conflicting values.
- High-risk flag state/country.
- Risk feed grouped by vessel/entity.

## News And Intelligence

- News article count.
- Article title, URL, summary/snippet, image URL.
- Published timestamp and fetched timestamp.
- Source name and source badge.
- RSS.app bundle name and bundle purpose.
- Feed URL.
- Matched vessel/entity links when exact names match.
- News evidence/source observation payload.
- Optional AI Weekly Brief status, generated timestamp, provider/model, estimated cost, cache/debug metadata.
- Optional AI top developments with article IDs and evidence IDs.
- Optional AI evidence-lens categories for Singapore, oil/gas, legal/regulatory, and confidence basis.

## Evidence And Provenance

- Source observation count.
- Source name.
- Observation type.
- Source record ID.
- Observed timestamp.
- Fetched timestamp.
- Payload hash.
- Raw JSON payload.
- Linked subject IDs: vessel, entity, evidence, port.
- Hash verification result in the Evidence inspector.

## Operations And Source Health

- Backend health status.
- Source health rows by source.
- Last checked timestamp.
- Last success timestamp.
- Stale/healthy/failing source state.
- Ingestion job count and recent job list.
- Job type, status, requester, parameters, created/started/finished timestamps.
- Ingestion logs by level, message, context, timestamp.
- Table counts for core maritime, risk, system, and reference data.
- Operations timeline events.

## Map And UI State

- Current map vessel count after filters.
- Map filters: risk severities, vessel types, flags, geo layers, time window.
- Selected vessel/entity/port/evidence subject.
- Entity-focused vessel ID set.
- Inspector open/closed state and width.
- Panel collapsed/expanded state.
- Running job slugs.
- Toast state.
