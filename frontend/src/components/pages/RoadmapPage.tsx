import { Check, Circle } from "lucide-react";

const STAGES: { title: string; body: string; status: "Completed" | "In progress" | "Final" }[] = [
  { title: "Live ingestion", body: "OCEANS-X positions, particulars, movements, and port activity.", status: "Completed" },
  { title: "Evidence model", body: "Source observations, evidence links, graph APIs, risk flag reads.", status: "Completed" },
  { title: "Geo layers", body: "MapLibre vessel view with OCEANS-X layer toggles.", status: "Completed" },
  { title: "Risk & enrichment", body: "Live sanctions, RSS news, deterministic risk recompute.", status: "Completed" },
  { title: "UI redesign", body: "Map-as-canvas workspace, floating command panel, inspector pattern.", status: "In progress" },
  { title: "Release polish", body: "Docs, demo script, testing guide, known limitations.", status: "Final" },
];

export function RoadmapPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 0" }}>
      <div className="t-caption">Roadmap</div>
      <h1 className="t-display" style={{ margin: "4px 0 4px" }}>V1 release path</h1>
      <p className="t-muted" style={{ marginTop: 0 }}>Completed and remaining work for the manual-first evidence workspace.</p>
      <div className="col" style={{ marginTop: 24, gap: 12 }}>
        {STAGES.map((stage, index) => (
          <article key={stage.title} className="panel-solid row" style={{ padding: 16, gap: 14, alignItems: "flex-start" }}>
            <div className="avatar lg" style={{ background: stage.status === "Completed" ? "var(--ocean-50)" : "var(--white)", color: stage.status === "Completed" ? "var(--ocean-600)" : "var(--slate-500)" }}>
              {stage.status === "Completed" ? <Check size={16} /> : <span>{index + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="row">
                <strong style={{ flex: 1, fontSize: 15 }}>{stage.title}</strong>
                <span className={`pill ${stage.status === "Completed" ? "ok" : stage.status === "In progress" ? "info" : ""}`}>{stage.status}</span>
              </div>
              <p className="t-sm" style={{ margin: "6px 0 0" }}>{stage.body}</p>
              <div className="row" style={{ marginTop: 8, gap: 10, fontSize: 11 }}>
                <a href="https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime" target="_blank" rel="noopener noreferrer">Docs</a>
                <a href="/operations">Operations</a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="t-faded" style={{ marginTop: 30, fontSize: 11, textAlign: "center" }}>
        <Circle size={6} style={{ verticalAlign: -0.5, marginRight: 4 }} />
        SEAM V2 · Evidence-backed maritime intelligence
      </p>
    </div>
  );
}
