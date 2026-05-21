# ADR 0002: V1 Core Schema

## Status

Accepted

## Context

SEAM V2 needs a database contract before ingestion and UI work. The V1 charter requires PostgreSQL/PostGIS, latest-position workflows, traceable source evidence, manual ingestion, and transparent risk flags without TimescaleDB, AI-generated risk decisions, or numeric scoring.

## Decision

The initial migration creates the V1 tables for vessels, latest vessel positions, port events, entities, relationships, risk flags, sanctions records, news articles, reference data, ingestion jobs, ingestion logs, source health, and source observations.

`source_observations` is the provenance backbone. It stores source, observation type, source record identifiers, fetch/observation timestamps, raw JSON payloads, and a payload hash for deduplication. Downstream position, event, relationship, flag, and sanctions rows can link back to this evidence.

V1 stores only `vessel_positions_latest`; it does not create a historical position archive, Timescale hypertable, scheduler table, user table, or AI risk output table.

Later migrations may add cached AI news brief tables as read-only summaries of stored RSS evidence. Those tables are not part of risk generation.

## Consequences

The next implementation stage can build ingestion services against stable tables. Future historical tracking should be added as a separate migration only when the product needs position history, and should start with native PostgreSQL partitioning before reconsidering TimescaleDB.
