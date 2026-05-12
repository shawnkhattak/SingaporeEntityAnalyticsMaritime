import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { getSchemaGraph } from "../api";
import type { SchemaGraph } from "../types";

export function SchemaPage() {
  const [schema, setSchema] = useState<SchemaGraph | null>(null);
  const [domain, setDomain] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getSchemaGraph().then(setSchema).catch(() => setSchema({ nodes: [], edges: [] }));
  }, []);

  const domains = Array.from(new Set((schema?.nodes ?? []).map((node) => node.domain))).sort();
  const visible = (schema?.nodes ?? []).filter((node) => domain === "all" || node.domain === domain);
  const visibleIds = new Set(visible.map((node) => node.id));
  const nodes: Node[] = visible.map((node, index) => ({
    id: node.id,
    data: { label: `${node.label}\n${node.domain}` },
    position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 130 },
  }));
  const edges: Edge[] = (schema?.edges ?? [])
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .map((edge, index) => ({ id: `${edge.source}-${edge.target}-${index}`, source: edge.source, target: edge.target, label: edge.label }));
  const selectedNode = useMemo(() => schema?.nodes.find((node) => node.id === selected), [schema, selected]);

  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Schema</p>
        <h1>Architecture atlas</h1>
        <p className="lede">SQLAlchemy metadata rendered as table domains and foreign-key edges.</p>
      </section>
      <div className="actions detail-actions">
        <select value={domain} onChange={(event) => setDomain(event.target.value)}>
          <option value="all">All domains</option>
          {domains.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </div>
      <section className="flow-layout">
        <div className="flow-canvas">
          <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={(_, node) => setSelected(node.id)}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="flow-panel">
          <h3>{selectedNode?.label ?? "Table detail"}</h3>
          <p>{selectedNode ? `${selectedNode.domain} domain` : "Select a table node."}</p>
          <p>{selectedNode?.columns.join(", ")}</p>
        </aside>
      </section>
    </>
  );
}
