import {
  Anchor,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Database,
  Gauge,
  Map,
  Newspaper,
  Radar,
  ShieldCheck,
  Ship,
  Sparkles,
  Wrench,
} from "lucide-react";

type RoadmapStatus = "Live" | "Hardening" | "Next" | "Paused";

type RoadmapStage = {
  eyebrow: string;
  title: string;
  summary: string;
  status: RoadmapStatus;
  icon: typeof Ship;
  progress: number;
  done: string[];
  next: string[];
  analystValue: string;
};

type RoadmapPillar = {
  title: string;
  icon: typeof Ship;
  body: string;
};

const STATUS_META: Record<RoadmapStatus, { label: string; className: string }> = {
  Live: { label: "Live now", className: "ok" },
  Hardening: { label: "Being polished", className: "info" },
  Next: { label: "Next up", className: "" },
  Paused: { label: "Paused", className: "warning" },
};

const PILLARS: RoadmapPillar[] = [
  {
    title: "Map-first",
    icon: Map,
    body: "The map remains the operating picture. Lists and inspectors explain what is on the map instead of replacing it.",
  },
  {
    title: "Evidence-backed",
    icon: Database,
    body: "Every serious claim should trace back to source observations, source payloads, evidence IDs, or original articles.",
  },
  {
    title: "Deterministic risk",
    icon: ShieldCheck,
    body: "Risk flags are produced by rules and source matches. AI is limited to briefing stored news evidence.",
  },
];

const STAGES: RoadmapStage[] = [
  {
    eyebrow: "Foundation",
    title: "Live maritime operating picture",
    summary: "SEAM ingests OCEANS-X vessel positions and renders Singapore-area traffic with risk coloring, focus behavior, and port context.",
    status: "Live",
    icon: Radar,
    progress: 92,
    done: [
      "Latest-snapshot map feed with one active refresh path while the map is visible.",
      "Risk-colored vessel markers on first load, selected-vessel focus, and entity multi-vessel focus.",
      "OCEANS-X ports layer visible on the Ports page with unrelated vessels muted but still visible.",
    ],
    next: [
      "Keep polishing port proximity detection and port-history confidence.",
      "Add better source-age messaging when OCEANS-X is stale or unavailable.",
    ],
    analystValue: "A reviewer can see where vessels are, which ones matter, and how fresh the source picture is.",
  },
  {
    eyebrow: "Profiles",
    title: "Premium vessel and entity intelligence",
    summary: "Vessel and entity panels now favor analyst summaries over database-table layouts while preserving the underlying source detail.",
    status: "Hardening",
    icon: Ship,
    progress: 84,
    done: [
      "Vessel profiles show identity, position, movement, particulars, risk, source confidence, linked entities, and current port proximity.",
      "Entity pages dedupe vessels by IMO, count relationship records separately, and show owner/operator/manager roles together.",
      "Entity selection focuses related vessels on the map and labels only the focused vessels.",
    ],
    next: [
      "Continue tightening missing-data hints and provenance labels.",
      "Improve confidence wording for port proximity and relationship coverage.",
    ],
    analystValue: "A user can move from a map contact to vessel ownership, movement context, and evidence without losing the investigation thread.",
  },
  {
    eyebrow: "Risk",
    title: "Unified Risk & Sanctions workflow",
    summary: "Sanctions, detentions, watchlists, identity conflicts, high-risk flags, and adverse news are grouped into one vessel-centered feed.",
    status: "Live",
    icon: ShieldCheck,
    progress: 88,
    done: [
      "One Risk & Sanctions card per vessel, with structured alert rows and compact evidence links.",
      "Sanctions cards show human-readable source lists such as OFAC, FCDO, EU, Canada SEMA, and detention lists.",
      "Identity conflict cards show the actual conflicting fields while ignoring low-value noise like type and slight dimension differences.",
    ],
    next: [
      "Add stronger regression tests around grouped alert rendering.",
      "Review severity rules after the next larger sanctions/watchlist refresh.",
    ],
    analystValue: "The feed explains why a vessel is flagged without forcing the user to open raw evidence first.",
  },
  {
    eyebrow: "News",
    title: "RSS intelligence and AI Weekly Brief",
    summary: "News is organized by curated RSS.app bundles, and the optional AI Weekly Brief summarizes stored Singapore-relevant articles only.",
    status: "Hardening",
    icon: Newspaper,
    progress: 78,
    done: [
      "All, Social, Watchlist, and Maritime tabs separate the three RSS.app bundles while All stays limited to the latest stories.",
      "Source badges use publication styling and original article links remain available.",
      "AI Weekly Brief uses a seven-day window, cached backend generation, purple AI styling, source tooltips, and neutral evidence language.",
    ],
    next: [
      "Keep reducing clutter in the brief and improve source attribution without linking unreliable vessel matches.",
      "Expand automated tests for the mock provider and cached recompute path.",
    ],
    analystValue: "The news view helps a user quickly see Singapore-relevant reporting without treating AI text as a risk engine.",
  },
  {
    eyebrow: "Operations",
    title: "Demo-ready operations control surface",
    summary: "Operations shows source health, jobs, logs, table counts, source refreshes, and bulk particulars enrichment in one internal console.",
    status: "Hardening",
    icon: Gauge,
    progress: 82,
    done: [
      "OCEANS-X stale threshold is 15 minutes, RSS refreshes hourly, and dev polling stays scoped to Operations.",
      "Bulk particulars refresh targets every current map vessel with an IMO, runs at about 10 vessels per second, and can be cancelled.",
      "Recent jobs/logs and timeline cards use bounded scrolling for desktop demo stability.",
    ],
    next: [
      "Keep aligning Operations visual density and disabled-action states.",
      "Add clearer status for paused or subscription-limited source actions.",
    ],
    analystValue: "The demo can show what data is fresh, what jobs ran, and what still needs source-side attention.",
  },
  {
    eyebrow: "Paused / out of scope",
    title: "Keep the product focused",
    summary: "Some ideas are intentionally hidden or paused because they do not currently improve the core analyst workflow.",
    status: "Paused",
    icon: Wrench,
    progress: 45,
    done: [
      "Graph and schema pages are retired from the navigation while code can remain for future reference.",
      "Port activity ingestion is paused; port proximity now uses visible OCEANS-X port geometry and latest vessel positions.",
      "No authentication, numeric composite risk score, or AI-generated risk flags are part of this version.",
    ],
    next: [
      "Revisit graph only if a concrete analyst workflow needs it.",
      "Revisit port arrivals/departures when the upstream source behavior is reliable enough.",
    ],
    analystValue: "The app stays credible by showing what works and avoiding weak workflows during the demo.",
  },
];

const RELEASE_CHECKS = [
  "Frontend production build passes.",
  "Backend contract tests cover core routes and source wiring.",
  "Main demo routes load without noisy console failures.",
  "Docs explain setup, source behavior, guardrails, and known limits.",
];

export function RoadmapPage() {
  const activeIndex = STAGES.findIndex((stage) => stage.status === "Hardening");

  return (
    <div className="roadmap-page">
      <section className="roadmap-hero panel-solid">
        <div>
          <div className="t-caption">SEAM Roadmap</div>
          <h1 className="t-display roadmap-title">From prototype to credible maritime intelligence workspace</h1>
          <p className="t-muted roadmap-hero-copy">
            SEAM is already useful as a desktop-first Singapore maritime demo. The remaining work is mostly hardening:
            clearer provenance, smoother operations, tighter tests, and less clutter in analyst-facing panels.
          </p>
        </div>
        <div className="roadmap-release-card" aria-label="Current release posture">
          <Sparkles size={18} />
          <strong>Current posture</strong>
          <span>Demo-ready core, polish in progress</span>
        </div>
      </section>

      <section className="roadmap-pillars" aria-label="Product principles">
        {PILLARS.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="roadmap-pillar panel-solid" style={{ animationDelay: `${index * 80}ms` }}>
              <Icon size={18} />
              <strong>{pillar.title}</strong>
              <p>{pillar.body}</p>
            </article>
          );
        })}
      </section>

      <section className="roadmap-timeline" aria-label="Roadmap stages">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const status = STATUS_META[stage.status];
          const isActive = index === activeIndex;
          return (
            <article
              key={stage.title}
              className={`roadmap-stage panel-solid ${isActive ? "is-current" : ""}`}
              style={{ animationDelay: `${index * 95}ms` }}
            >
              <div className="roadmap-stage-rail" aria-hidden="true">
                <div className={`roadmap-stage-dot ${isActive ? "is-pulsing" : ""}`}>
                  {stage.status === "Live" ? <CheckCircle2 size={16} /> : <CircleDot size={16} />}
                </div>
              </div>
              <div className="roadmap-stage-body">
                <div className="roadmap-stage-header">
                  <div className="roadmap-stage-title">
                    <span className="roadmap-eyebrow">{stage.eyebrow}</span>
                    <h2><Icon size={18} /> {stage.title}</h2>
                  </div>
                  <span className={`pill ${status.className}`}>{status.label}</span>
                </div>
                <p className="roadmap-summary">{stage.summary}</p>
                <div className="roadmap-progress" aria-label={`${stage.progress}% complete`}>
                  <span style={{ width: `${stage.progress}%` }} />
                </div>
                <div className="roadmap-detail-grid">
                  <div>
                    <h3>Working now</h3>
                    {stage.done.map((item) => (
                      <p key={item}><CheckCircle2 size={13} /> {item}</p>
                    ))}
                  </div>
                  <div>
                    <h3>Next cleanup</h3>
                    {stage.next.map((item) => (
                      <p key={item}><ArrowRight size={13} /> {item}</p>
                    ))}
                  </div>
                </div>
                <div className="roadmap-outcome">
                  <Anchor size={14} />
                  <span>{stage.analystValue}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="roadmap-release panel-solid">
        <div>
          <div className="t-caption">Release checklist</div>
          <h2>What makes this feel finished</h2>
        </div>
        <div className="roadmap-checks">
          {RELEASE_CHECKS.map((check) => (
            <div key={check}><CheckCircle2 size={14} /> {check}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
