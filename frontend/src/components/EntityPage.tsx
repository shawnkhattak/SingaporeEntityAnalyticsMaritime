import { Building2, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { getEntity, getEntityRelationships, getEntityRiskFlags, getEntityVessels, searchEntities } from "../api";
import { formatDate } from "../format";
import type { Entity, EntityRelationship, RiskFlag, VesselSummary } from "../types";

export function EntityPage({ entityId }: { entityId?: number }) {
  return entityId ? <EntityDetail entityId={entityId} /> : <EntitySearch />;
}

function EntitySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entity[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    try {
      setResults(await searchEntities(query.trim()));
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to search entities.");
    }
  }

  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Entities</p>
        <h1>Entity intelligence</h1>
        <p className="lede">Search organizations, flag states, classification societies, and other entities created from evidence-backed ingestion.</p>
      </section>
      <form className="search-bar" onSubmit={(event) => void submit(event)}>
        <label htmlFor="entity-query">Entity search</label>
        <div>
          <input id="entity-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or type" />
          <button type="submit"><Search aria-hidden="true" />Search</button>
        </div>
      </form>
      {error ? <p className="status-message status-message--error">{error}</p> : null}
      <section className="results-grid">
        {results.length === 0 ? <div className="empty-row">Run particulars enrichment, then search for an owner or manager.</div> : results.map((entity) => (
          <a className="result-card" href={`/entities/${entity.id}`} key={entity.id}>
            <Building2 aria-hidden="true" />
            <div>
              <h2>{entity.name}</h2>
              <p>{entity.entity_type}{entity.country_code ? ` · ${entity.country_code}` : ""}</p>
              <span>Updated {formatDate(entity.updated_at)}</span>
            </div>
          </a>
        ))}
      </section>
    </>
  );
}

function EntityDetail({ entityId }: { entityId: number }) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEntity(entityId), getEntityVessels(entityId), getEntityRelationships(entityId), getEntityRiskFlags(entityId)])
      .then(([nextEntity, nextVessels, nextRelationships, nextRiskFlags]) => {
        setEntity(nextEntity);
        setVessels(nextVessels);
        setRelationships(nextRelationships);
        setRiskFlags(nextRiskFlags);
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "Unable to load entity."));
  }, [entityId]);

  if (!entity) return <div className="empty-row">{error ?? "Loading entity."}</div>;

  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Entity detail</p>
        <h1>{entity.name}</h1>
        <p className="lede">{entity.entity_type}{entity.country_code ? ` · ${entity.country_code}` : ""}</p>
      </section>
      <section className="detail-grid">
        <article className="metric-card"><Building2 /><span>Related vessels</span><strong>{vessels.length}</strong><p>{vessels.map((vessel) => vessel.name).join(", ") || "No related vessels."}</p></article>
        <article className="metric-card"><Building2 /><span>Risk flags</span><strong>{riskFlags.length}</strong><p>{riskFlags.map((flag) => flag.flag_type).join(", ") || "No active risk flags."}</p></article>
      </section>
      <section className="logs-section">
        <h3>Relationships</h3>
        <div className="log-list">
          {relationships.length === 0 ? <div className="empty-row">No relationships found.</div> : relationships.map((relationship) => (
            <a className="log-row linked-row" href={relationship.vessel ? `/vessels/${relationship.vessel.id}` : "#"} key={relationship.id}>
              <span>{relationship.relationship_type} · {relationship.confidence}</span>
              <p>{relationship.vessel?.name ?? "Entity relationship"} · Evidence {relationship.evidence_id ?? "-"}</p>
              <time>{relationship.evidence_summary ?? "Observed relationship"}</time>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
