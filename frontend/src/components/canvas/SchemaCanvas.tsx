import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import { getSchemaGraph } from "../../api";
import type { SchemaGraph } from "../../types";
import { EmptyState } from "../primitives/EmptyState";

const DOMAIN_COLOR: Record<string, string> = {
  maritime: "var(--ocean-500)",
  evidence: "var(--cyan-400)",
  ingestion: "var(--navy-700)",
  risk: "var(--risk-critical)",
  reference: "var(--slate-500)",
};

function routesForTable(name: string): string[] {
  const map: Record<string, string[]> = {
    vessels: ["/api/vessels/*", "/api/map/vessels"],
    vessel_positions: ["/api/map/vessels", "/api/vessels/{id}"],
    entities: ["/api/entities/*"],
    entity_relationships: ["/api/entities/{id}/relationships"],
    risk_flags: ["/api/vessels/{id}/risk-flags", "/api/entities/{id}/risk-flags"],
    evidence_observations: ["/api/evidence/{id}", "/api/dev/observations"],
    vessel_events: ["/api/vessels/{id}/events", "/api/ports/activity"],
    ingestion_jobs: ["/api/dev/ingestion/jobs"],
    ingestion_logs: ["/api/dev/ingestion/logs"],
    source_health: ["/api/dev/source-health"],
    geo_layers: ["/api/geo/layers"],
    reference_data: ["/api/reference/{domain}"],
  };
  return map[name] ?? [];
}

export function SchemaCanvas() {
  const [schema, setSchema] = useState<SchemaGraph | null>(null);
  const [domain, setDomain] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getSchemaGraph()
      .then(setSchema)
      .catch(() => setSchema({ nodes: [], edges: [] }));
  }, []);

  const domains = useMemo(() => Array.from(new Set((schema?.nodes ?? []).map((n) => n.domain))).sort(), [schema]);
  const visible = (schema?.nodes ?? []).filter((n) => domain === "all" || n.domain === domain);
  const visibleIds = new Set(visible.map((n) => n.id));

  const nodes: Node[] = visible.map((node, index) => ({
    id: node.id,
    position: { x: (index % 4) * 240, y: Math.floor(index / 4) * 180 },
    data: { label: `${node.label}\n${node.domain}` },
    style: {
      background: "var(--white)",
      border: "1px solid var(--gray-200)",
      borderLeft: `4px solid ${DOMAIN_COLOR[node.domain] ?? "var(--slate-500)"}`,
      borderRadius: 8,
      padding: 10,
      fontSize: 12,
      whiteSpace: "pre-line",
      width: 200,
    },
  }));

  const edges: Edge[] = (schema?.edges ?? [])
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((e, i) => ({
      id: `${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      style: { stroke: "var(--slate-500)" },
    }));

  const selectedNode = useMemo(() => schema?.nodes.find((n) => n.id === selected), [schema, selected]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="panel-solid row" style={{ padding: 12 }}>
        <span className="t-caption">Domain</span>
        <select className="select" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="all">All</option>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="spacer" />
        <span className="t-faded" style={{ fontSize: 11 }}>{visible.length} tables</span>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, minHeight: 0 }}>
        <div className="panel-solid" style={{ overflow: "hidden" }}>
          {nodes.length === 0 ? (
            <EmptyState title="Schema graph empty" body="The backend returned no tables for this domain." />
          ) : (
            <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={(_, n) => setSelected(n.id)}>
              <Background gap={20} color="#E6E9EE" />
              <Controls />
            </ReactFlow>
          )}
        </div>
        <aside className="panel-solid scroll" style={{ padding: 14, overflow: "auto" }}>
          <div className="t-caption">Selected table</div>
          {selectedNode ? (
            <div className="col" style={{ marginTop: 6, gap: 10 }}>
              <div className="t-h1">{selectedNode.label}</div>
              <span className="pill">{selectedNode.domain}</span>
              <div className="t-caption">Columns</div>
              <ul className="mono" style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--navy-700)" }}>
                {selectedNode.columns.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <div className="t-caption" style={{ marginTop: 6 }}>API routes</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                {routesForTable(selectedNode.id.toLowerCase()).map((r) => <li key={r} className="mono">{r}</li>)}
                {routesForTable(selectedNode.id.toLowerCase()).length === 0 && <li className="t-faded">No direct API routes.</li>}
              </ul>
            </div>
          ) : (
            <div className="t-faded" style={{ marginTop: 6, fontSize: 12 }}>Click a table node.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
