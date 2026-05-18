# Demo Script

Use this path for a desktop demo. Keep the story focused on source-backed maritime intelligence rather than feature breadth.

## 1. Operations Readiness

1. Start with `./start.sh`.
2. Open `/operations`.
3. Show source health, active issues, recent jobs/logs, and table counts.
4. Run or confirm an OCEANS-X positions snapshot.
5. If needed, run the all-map-vessels particulars refresh to enrich vessel profiles and entity relationships.

Talking point: SEAM is honest about source freshness and ingestion state before it presents analysis.

## 2. Live Map

1. Open `/map`.
2. Show AIS-style vessel markers colored by current risk severity.
3. Click a vessel and point out the padded map centering, selected marker focus, and faded surrounding vessels.
4. Toggle OCEANS-X ports if the live geo endpoint is available.

Talking point: the map is the operating picture, not a static dashboard widget.

## 3. Risk & Sanctions

1. Open `/risk`.
2. Show the unified feed: one grouped card per vessel.
3. Use severity and alert-type filters.
4. Open a sanctioned vessel and show the actual sanctions list names and evidence ID.
5. Open an identity-conflict example and show the conflicting fields directly on the card.

Talking point: sanctions are treated as one risk signal inside a broader evidence-backed risk workflow.

## 4. Vessel Profile

1. Open a vessel detail panel.
2. Walk through identity, current movement, top risk, particulars, source confidence, and position history.
3. Use refresh actions for particulars/movements/risk when appropriate.
4. Open an evidence link and verify that the raw payload is still available.

Talking point: analysts can move from map contact to source evidence without losing context.

## 5. Entity Intelligence

1. Open `/entities`.
2. Show that entities are sorted by the number of unique vessels tied to them.
3. Open a company/owner/operator/manager.
4. Show unique related vessel count versus relationship record count.
5. Point out relationship role badges such as Owner, Ship Manager, and ISM Manager.
6. Show that selecting an entity focuses all related vessels on the map and labels only those focused vessels.

Talking point: SEAM separates unique vessels from relationship records so ownership/management coverage is not inflated.

## 6. News

1. Open `/news`.
2. Show the All tab and the three short bundle tabs.
3. Point out source badges and original article links.

Talking point: RSS.app feeds provide lightweight external intelligence without AI summarization.

## 7. Roadmap

1. Open `/roadmap`.
2. Explain the current product posture: desktop-first, evidence-first, deterministic risk.
3. Close with known guardrails: no auth, no AI, no numeric risk score, no commercial hardening yet.
