const stages = [
  ["Live ingestion", "OCEANS-X positions, particulars, movements, and port activity."],
  ["Evidence model", "Source observations, evidence links, graph APIs, and risk flag reads."],
  ["Geo layers", "MapLibre vessel view with OCEANS-X layer toggles."],
  ["Risk and enrichment", "Live sanctions, RSS news, deterministic risk recompute, and refresh controls."],
  ["Release polish", "Docs, demo script, testing guide, and known limitations."],
];

export function RoadmapPage() {
  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Roadmap</p>
        <h1>V1 release path</h1>
        <p className="lede">Completed and remaining work for the manual-first evidence workspace.</p>
      </section>
      <section className="results-grid">
        {stages.map(([title, body], index) => (
          <article className="result-card" key={title}>
            <div>
              <h2>{index < 4 ? "Completed" : "Final"} · {title}</h2>
              <p>{body}</p>
              <span>Docs and tests are linked from the repository README.</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
