import { Building2, Network, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { getEntity, getEntityGraph, getEntityRelationships, getEntityRiskFlags, getEntityVessels } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { useApp } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { ErrorState } from "../primitives/ErrorState";
import { RiskPill } from "../primitives/Pill";
import { Skeleton } from "../primitives/Skeleton";
import type { Entity, EntityRelationship, GraphRead, RiskFlag, VesselSummary } from "../../types";
import { InspectorShell } from "./InspectorShell";

type Loaded = {
  entity: Entity;
  vessels: VesselSummary[];
  relationships: EntityRelationship[];
  risk: RiskFlag[];
};

export function EntityDetailInspector({ id }: { id: number }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [graph, setGraph] = useState<GraphRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const { dispatch } = useApp();

  function load() {
    setError(null);
    Promise.all([getEntity(id), getEntityVessels(id), getEntityRelationships(id), getEntityRiskFlags(id)])
      .then(([entity, vessels, relationships, risk]) => {
        setData({ entity, vessels, relationships, risk });
        dispatch({ type: "CACHE_ENTITY_RISK", id, flags: risk });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab !== 4 || graph) return;
    getEntityGraph(id).then(setGraph).catch(() => setGraph({ nodes: [], edges: [] }));
  }, [tab, graph, id]);

  if (error) {
    return (
      <InspectorShell breadcrumb="Entity" title="Could not load" onClose={() => window.history.back()}>
        <ErrorState body={error} onRetry={load} />
      </InspectorShell>
    );
  }
  if (!data) {
    return (
      <InspectorShell breadcrumb="Entity" title="Loading…" onClose={() => window.history.back()}>
        <Skeleton height={80} />
      </InspectorShell>
    );
  }
  const e = data.entity;
  const tabItems = [
    { label: "Overview" },
    { label: "Vessels", count: data.vessels.length },
    { label: "Relationships", count: data.relationships.length },
    { label: "Risk", count: data.risk.length },
    { label: "Graph" },
  ];

  return (
    <InspectorShell
      breadcrumb="Entity"
      title={e.name}
      tabs={tabItems}
      activeTab={tab}
      onTabChange={setTab}
      onClose={() => window.history.back()}
      footer={
        <Button size="sm" leadingIcon={<Network size={12} />} onClick={() => navigateTo(`/graph?subject=entity&id=${id}`)}>
          Open in graph
        </Button>
      }
    >
      {tab === 0 && (
        <div className="col" style={{ gap: 14 }}>
          <div className="t-muted">{e.entity_type}{e.country_code ? ` · ${e.country_code}` : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Metric icon={<Ship size={14} />} label="Related vessels" value={data.vessels.length} />
            <Metric icon={<Network size={14} />} label="Relationships" value={data.relationships.length} />
            <Metric icon={<Building2 size={14} />} label="Risk flags" value={data.risk.length} />
            <Metric label="External ID" value={e.external_id ?? "—"} />
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="col" style={{ gap: 6 }}>
          {data.vessels.length === 0 ? <EmptyState icon={<Ship size={18} />} title="No related vessels" /> : data.vessels.map((v) => (
            <a key={v.id} href={`/vessels/${v.id}`} className="card row" style={{ padding: "10px 12px", textDecoration: "none", color: "inherit" }}>
              <Ship size={14} color="var(--ocean-500)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{v.name}</strong>
                <div className="mono t-faded" style={{ fontSize: 11 }}>{v.imo ? `IMO ${v.imo}` : v.mmsi ? `MMSI ${v.mmsi}` : "—"}</div>
              </div>
              {v.flag_country_code && <span className="pill">{v.flag_country_code}</span>}
            </a>
          ))}
        </div>
      )}
      {tab === 2 && (
        <div className="col" style={{ gap: 6 }}>
          {data.relationships.length === 0 ? <EmptyState title="No relationships" /> : data.relationships.map((r) => (
            <a key={r.id} href={r.vessel ? `/vessels/${r.vessel.id}` : "#"} className="card" style={{ padding: "10px 12px", display: "block", textDecoration: "none", color: "inherit" }}>
              <div className="row">
                <span className="pill">{r.relationship_type}</span>
                <span className="t-muted" style={{ fontSize: 11 }}>confidence: {r.confidence}</span>
              </div>
              <div className="t-sm" style={{ marginTop: 4 }}>{r.vessel?.name ?? "—"}</div>
              {r.evidence_summary && <div className="t-faded" style={{ fontSize: 11 }}>{r.evidence_summary}</div>}
            </a>
          ))}
        </div>
      )}
      {tab === 3 && (
        <div className="col" style={{ gap: 6 }}>
          {data.risk.length === 0 ? <EmptyState title="No risk flags" /> : data.risk.map((flag) => (
            <div key={flag.id} className="card" style={{ padding: "10px 12px" }}>
              <div className="row">
                <RiskPill severity={flag.severity as never} />
                <strong style={{ flex: 1, marginLeft: 6 }}>{flag.flag_type}</strong>
              </div>
              <div className="t-sm" style={{ marginTop: 4 }}>{flag.summary}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 4 && (
        <div>
          {!graph ? (
            <Skeleton height={120} />
          ) : graph.nodes.length === 0 ? (
            <EmptyState title="No graph data" />
          ) : (
            <Button leadingIcon={<Network size={14} />} onClick={() => navigateTo(`/graph?subject=entity&id=${id}`)}>
              Open full graph ({graph.nodes.length} nodes)
            </Button>
          )}
        </div>
      )}
    </InspectorShell>
  );
}

function Metric({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-label row" style={{ gap: 4 }}>{icon}{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
