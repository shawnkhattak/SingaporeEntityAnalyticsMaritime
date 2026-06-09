import {
  Anchor,
  BookOpen,
  Database,
  ExternalLink,
  Github,
  Linkedin,
  Map,
  Network,
  Radar,
  ShieldCheck,
  Ship,
} from "lucide-react";
import { SeamBrand } from "../brand/SeamBrand";

const LINKEDIN_URL = "https://www.linkedin.com/in/shawnkhattak/";
const GITHUB_URL = "https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime";

const STACK = [
  { label: "FastAPI", detail: "Python backend API layer", icon: Database },
  { label: "PostGIS / PostgreSQL", detail: "Spatial vessel and entity data", icon: Database },
  { label: "React + TypeScript", detail: "Frontend workspace", icon: Map },
  { label: "MapLibre GL", detail: "Live vessel map rendering", icon: Map },
  { label: "Docker", detail: "Containerized deployment", icon: Ship },
  { label: "OCEANS-X", detail: "AIS data source", icon: Radar },
  { label: "OpenSanctions", detail: "Sanctions registry data", icon: ShieldCheck },
  { label: "Claude AI", detail: "Maritime news summarization", icon: BookOpen },
];

const STATS = [
  { label: "Vessels", value: "4,792" },
  { label: "Source observations", value: "307,250" },
  { label: "Flagged or sanctioned vessels", value: "170" },
  { label: "Port locations", value: "468" },
];

const CAPABILITIES = [
  {
    title: "Live AIS vessel positions",
    body: "A Singapore-focused operating picture built around AIS snapshots and port geography.",
    icon: Radar,
  },
  {
    title: "Ownership networks",
    body: "Entity records help trace who controls a vessel, not just who appears on a manifest.",
    icon: Network,
  },
  {
    title: "Sanctions and news context",
    body: "OFAC SDN, Canada SEMA, OpenSanctions, and summarized maritime news stay in one workflow.",
    icon: ShieldCheck,
  },
];

const DATA_LAYERS = [
  "AIS positions",
  "Ownership networks",
  "Sanctions screening",
  "Port activity",
  "Maritime news",
];

const FRAGMENTED_SOURCES = [
  "OFAC lists",
  "AIS positions",
  "Ownership records",
  "News tabs",
];

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero panel-solid">
        <div className="about-hero-copy">
          <div className="t-caption">SEAM</div>
          <h1 className="t-display about-title">Singapore Entity Analytics Maritime</h1>
          <p>
            A live-style intelligence workspace that brings scattered maritime data into one unified picture.
          </p>
          <p>
            Built by <strong>Shawn Khattak</strong>, SEAM sits at the intersection of data visualization, maritime
            logistics, energy markets, and geopolitical risk.
          </p>
          <div className="about-links" aria-label="Profile links">
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
              <Linkedin size={15} />
              LinkedIn
              <ExternalLink size={12} />
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github size={15} />
              GitHub
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <aside className="about-identity" aria-label="Project identity">
          <SeamBrand size="lg" stacked animated showTagline />
          <div className="about-demo-note">
            <Anchor size={15} />
            <span>Singapore-focused maritime intelligence portfolio project</span>
          </div>
        </aside>
      </section>

      <section className="about-story about-story-feature panel-solid">
        <div className="about-story-layout">
          <div className="about-story-copy">
            <div className="t-caption">Why I built this</div>
            <h2>From trade routes to maritime intelligence</h2>
            <p className="about-lead">
              SEAM came from a long-running curiosity about how geography, energy, infrastructure, and risk shape the
              way goods move through the world.
            </p>
            <div className="about-personal-prose">
              <p>
                I grew up in Houston, an energy city by identity, but I spent formative years living and traveling
                through Central Asia, particularly Uzbekistan. Watching how geography shapes trade routes, how landlocked
                countries navigate global supply chains, and how infrastructure either connects or isolates whole
                economies planted something in me that I have never really stopped thinking about.
              </p>
              <p>
                When I started studying Supply Chain and Logistics at the University of Houston and chose the Maritime
                Logistics pathway, those early instincts started to sharpen. Then, during my internship at Hanwha
                Shipping as an Oil and Gas Market Analyst, I spent months working with AIS vessel data, tracking crude
                oil and LNG flows, researching sanctions exposure, and mapping geopolitical risk onto live market
                movements.
              </p>
              <p>
                I got genuinely hooked, not just on the analysis, but on the problem of how fragmented maritime data
                actually is. OFAC lists over here. AIS positions somewhere else. Ownership networks buried in ship
                registries. News in a different tab.
              </p>
              <p>
                SEAM started as a way to scratch that itch. I wanted to see if I could pull those threads together -
                sanctions data, vessel positions, ownership structures, port activity, and live news - and build
                something that actually felt like a working intelligence workspace, not just a dashboard exercise.
              </p>
            </div>
          </div>
          <aside className="about-route-visual" aria-label="Animated explanation of fragmented data becoming SEAM">
            <div className="about-fragment-visual">
              <div className="about-fragment-column">
                <span className="about-visual-label">Before</span>
                {FRAGMENTED_SOURCES.map((source, index) => (
                  <span key={source} className="fragment-source" style={{ animationDelay: `${index * 160}ms` }}>
                    {source}
                  </span>
                ))}
              </div>
              <div className="about-unify-column">
                <span className="about-flow-line" />
                <div className="about-unify-core">
                  <Network size={18} />
                  <strong>SEAM</strong>
                  <small>unified workspace</small>
                </div>
                <span className="about-flow-line out" />
              </div>
              <div className="about-output-column">
                <span className="about-visual-label">After</span>
                <div className="about-output-card">
                  <Map size={16} />
                  <strong>Analyst view</strong>
                  <span>Map, entities, sanctions, news, and evidence in one flow</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
        <div className="about-reflection">
          <p>
            The honest build story is this: I finished a first version after about two weeks, looked at it, and threw it
            out. It was not something I was proud of, so I went back to the drawing board, made a list of real
            improvements, and started over.
          </p>
          <p>
            I built the whole thing solo, in the middle of moving houses, with a personal deadline to finish before my
            internship at EnerMech started this summer. That constraint was useful: it forced decisions instead of
            endless refinement.
          </p>
          <p>
            At its core, this project lives at the intersection of two things I care about: the craft of data
            visualization and analysis, and the world of maritime trade and energy markets. Building SEAM was genuinely
            fun. That is the most honest thing I can say about why I did it.
          </p>
        </div>
      </section>

      <section className="about-capabilities" aria-label="SEAM capabilities">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="about-card panel-solid">
              <Icon size={18} />
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>

      <section className="about-story panel-solid">
        <div className="about-layer-layout">
          <div>
            <div className="t-caption">What SEAM does</div>
            <h2>Four intelligence layers in one workspace</h2>
            <p>
              SEAM is focused on the port of Singapore, one of the world's busiest maritime chokepoints, and aggregates
              multiple intelligence layers into a single workspace. Live AIS vessel positions give you the operational
              picture. Entity ownership networks let you trace who actually controls a vessel, not just who is listed on
              the manifest. Sanctions screening runs against OFAC SDN, Canada SEMA, and OpenSanctions simultaneously.
              A live news feed, summarized by Claude AI, keeps context current without requiring you to tab away.
            </p>
          </div>
          <div className="about-layer-visual" aria-label="Animated data integration diagram">
            <div className="about-layer-core">SEAM</div>
            {DATA_LAYERS.map((layer, index) => (
              <span key={layer} className={`about-layer layer-${index + 1}`}>
                {layer}
              </span>
            ))}
          </div>
        </div>
        <div className="about-stat-grid" aria-label="Dataset coverage">
          {STATS.map((stat) => (
            <div key={stat.label} className="about-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <p>
          The point is not the scale - it is the integration. Maritime intelligence already exists; it just lives in too
          many places at once.
        </p>
      </section>

      <section className="about-stack panel-solid">
        <div>
          <div className="t-caption">The stack</div>
          <h2>Built as a full working system</h2>
          <p>
            SEAM combines backend ingestion, spatial storage, browser-based mapping, source integrations, and AI-assisted
            news summarization.
          </p>
        </div>
        <div className="about-stack-grid">
          {STACK.map((item) => (
            <span key={item.label}>
              <item.icon size={13} />
              <strong>{item.label}</strong>
              <em>{item.detail}</em>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
