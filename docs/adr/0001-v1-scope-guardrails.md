# ADR 0001: V1 Scope Guardrails

## Status

Accepted

## Context

The rebuild plan defines SEAM as portfolio-first, evidence-driven, and intentionally narrower than the previous implementation. The first stable version must prioritize boot reliability, transparent source evidence, and a coherent demo path.

## Decision

V1 will exclude authentication, AI-generated risk decisions, numeric risk scoring, TimescaleDB, and background scheduling. Runtime services are limited to frontend, backend, and PostgreSQL/PostGIS until the core data contracts and ingestion surfaces are stable.

Optional AI news summarization may be enabled later only when it remains evidence-bound, backend-owned, and separate from deterministic risk generation.

## Consequences

This keeps the initial rebuild understandable and testable. Features that need scheduled work, AI-generated risk explanations, or commercial-grade account boundaries must wait until the evidence layer and core UI are working.
