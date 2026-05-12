import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Building2, Database, Network, Search, ShieldAlert, Ship } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { getEntityGraph, getVesselGraph } from "../../api";
import type { GraphRead } from "../../types";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";

type GraphCanvasProps = {
  subject?: { type: "vessel" | "entity"; id: number };
};

type LayoutMode = "force" | "hierarchical" | "radial";

const NODE_STYLES: Record<string, { stripe: string; icon: typeof Ship }> = {
  vessel: { stripe: "var(--cyan-400)", icon: Ship },
  entity: { stripe: "var(--ocean-500)", icon: Building2 },
  risk: { stripe: "var(--risk-critical)", icon: ShieldAlert },
  evidence: { stripe: "var(--slate-500)", icon: Database },
};

function layout(graph: GraphRead, mode: LayoutMode): { x: number; y: number }[] {
  const n = graph.nodes.length;
  if (n === 0) return [];
  switch (mode) {
    case "radial": {
      return graph.nodes.map((_, i) => {
        const angle = (i / n) * Math.PI * 2;
        const radius = 220 + Math.min(180, n * 6);
        return { x: 400 + Math.cos(angle) * radius, y: 280 + Math.sin(angle) * radius };
      });
    }
    case "hierarchical": {
      const byType: Record<string, number[]> = {};
      graph.nodes.forEach((node, idx) => {
        byType[node.type] ??= [];
        byType[node.type].push(idx);
      });
      const types = Object.keys(byType);
      const out: { x: number; y: number }[] = new Array(n);
      types.forEach((t, row) => {
        byType[t].forEach((idx, col) => {
          out[idx] = { x: 120 + col * 200, y: 100 + row * 160 };
        });
      });
      return out;
    }
    case "force":
    default:
      return graph.nodes.map((_, i) => ({ x: (i % 4) * 220, y: Math.floor(i / 4) * 150 }));
  }
}

export function GraphCanvas({ subject }: GraphCanvasProps) {
  const [type, setType] = useState<"vessel" | "entity">(subject?.type ?? "vessel");
  const [idInput, setIdInput] = useState<string>(subject ? String(subject.id) : "");
  const [graph, setGraph] = useState<GraphRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LayoutMode>("force");
  const [selected, setSelected] = useState<{ id: string; type: string; label: string } | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const id = Number(idInput);
    if (!Number.isInteger(id) || id <= 0) {
      setError("Provide a numeric subject ID.");
      return;
    }
    try {
      const next = type === "vessel" ? await getVesselGraph(id) : await getEntityGraph(id);
      setGraph(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const positions = useMemo(() => (graph ? layout(graph, mode) : []), [graph, mode]);

  const nodes: Node[] = useMemo(
    () =>
      graph?.nodes.map((node, idx) => {
        const style = NODE_STYLES[node.type] ?? { stripe: "var(--slate-500)", icon: Network };
        return {
          id: node.id,
          position: positions[idx] ?? { x: 0, y: 0 },
          data: { label: `${node.label}\n${node.type}` },
          style: {
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderLeft: `4px solid ${style.stripe}`,
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            color: "var(--navy-900)",
            width: 170,
            whiteSpace: "pre-line",
          },
        } satisfies Node;
      }) ?? [],
    [graph, positions],
  );

  const edges: Edge[] = useMemo(
    () =>
      graph?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        animated: edge.confidence === "high",
        style: {
          stroke: edge.confidence === "high" ? "var(--ocean-500)" : "var(--slate-500)",
          strokeWidth: edge.confidence === "high" ? 1.6 : 1,
          strokeDasharray: edge.confidence === "low" ? "4 3" : undefined,
        },
        data: { evidence_id: edge.evidence_id },
      })) ?? [],
    [graph],
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <form className="panel-solid" style={{ padding: 12 }} onSubmit={(e) => void load(e)}>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className={`btn ${type === "vessel" ? "primary" : ""}`} onClick={() => setType("vessel")}>Vessel</button>
            <button type="button" className={`btn ${type === "entity" ? "primary" : ""}`} onClick={() => setType("entity")}>Entity</button>
          </div>
          <label className="input" style={{ width: 140 }}>
            <input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="Subject ID"
              type="number"
              inputMode="numeric"
            />
          </label>
          <Button type="submit" variant="primary" leadingIcon={<Search size={14} />}>Load</Button>
          <div className="t-caption">Layout</div>
          <select className="select" value={mode} onChange={(e) => setMode(e.target.value as LayoutMode)}>
            <option value="force">Force</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="radial">Radial</option>
          </select>
          <span className="spacer" />
          <Button size="sm" onClick={() => exportGraph(graph)}>Export JSON</Button>
        </div>
        {error && <div className="t-sm" style={{ color: "var(--risk-critical)", marginTop: 8 }}>{error}</div>}
      </form>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, minHeight: 0 }}>
        <div className="panel-solid" style={{ overflow: "hidden" }}>
          {graph && graph.nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_, node) => {
                const found = graph.nodes.find((n) => n.id === node.id);
                if (found) setSelected({ id: found.id, type: found.type, label: found.label });
              }}
            >
              <Background gap={20} color="#E6E9EE" />
              <Controls />
            </ReactFlow>
          ) : (
            <EmptyState
              icon={<Network size={22} />}
              title="Load a subgraph"
              body="Pick Vessel or Entity, enter the numeric ID, and press Load."
            />
          )}
        </div>
        <aside className="panel-solid" style={{ padding: 14 }}>
          <div className="t-caption">Selection</div>
          {selected ? (
            <div className="col" style={{ marginTop: 6, gap: 8 }}>
              <div className="t-h1">{selected.label}</div>
              <span className="pill info">{selected.type}</span>
              <a className="mono" style={{ fontSize: 12 }} href={`/evidence/${selected.id}`}>{selected.id}</a>
            </div>
          ) : (
            <div className="t-faded" style={{ fontSize: 12, marginTop: 6 }}>Click a node to inspect.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function exportGraph(graph: GraphRead | null) {
  if (!graph) return;
  const json = JSON.stringify(graph, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "seam-graph.json";
  link.click();
  URL.revokeObjectURL(url);
}
