import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { getEntityGraph, getVesselGraph } from "../api";
import type { GraphRead } from "../types";

export function GraphPage() {
  const [subjectType, setSubjectType] = useState<"vessel" | "entity">("vessel");
  const [subjectId, setSubjectId] = useState("");
  const [graph, setGraph] = useState<GraphRead | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const id = Number(subjectId);
    if (!Number.isInteger(id)) return;
    try {
      setGraph(subjectType === "vessel" ? await getVesselGraph(id) : await getEntityGraph(id));
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load graph.");
    }
  }

  const nodes: Node[] = (graph?.nodes ?? []).map((node, index) => ({
    id: node.id,
    position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 130 },
    data: { label: `${node.label}\n${node.type}` },
    className: node.type === "risk" ? "flow-node-risk" : "flow-node",
  }));
  const edges: Edge[] = (graph?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.type,
    data: { evidenceId: edge.evidence_id },
  }));

  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Graph</p>
        <h1>Evidence relationship graph</h1>
        <p className="lede">Explore stored vessel, entity, evidence, and risk relationships from backend graph APIs.</p>
      </section>
      <form className="search-bar" onSubmit={(event) => void submit(event)}>
        <label htmlFor="graph-subject">Graph subject</label>
        <div>
          <select value={subjectType} onChange={(event) => setSubjectType(event.target.value as "vessel" | "entity")}>
            <option value="vessel">Vessel</option>
            <option value="entity">Entity</option>
          </select>
          <input id="graph-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} placeholder="ID" />
          <button type="submit"><Search aria-hidden="true" />Load</button>
        </div>
      </form>
      {error ? <p className="status-message status-message--error">{error}</p> : null}
      <section className="flow-layout">
        <div className="flow-canvas">
          <ReactFlow nodes={nodes} edges={edges} fitView onEdgeClick={(_, edge) => setSelectedEvidence(edge.data?.evidenceId as number | null)}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="flow-panel">
          <h3>Evidence</h3>
          <p>{selectedEvidence ? `Evidence #${selectedEvidence}` : "Select an edge to inspect its evidence ID."}</p>
          {selectedEvidence ? <a className="button-link" href={`/api/evidence/${selectedEvidence}`}>Open evidence JSON</a> : null}
        </aside>
      </section>
    </>
  );
}
