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

const STORY_BEATS = [
  {
    label: "Geography",
    title: "Houston, Central Asia, and trade routes",
    body:
      "I grew up in Houston, an energy city by identity, but spent formative years living and traveling through Central Asia, particularly Uzbekistan. Seeing how geography, infrastructure, and landlocked supply chains shape whole economies stayed with me.",
  },
  {
    label: "Maritime logistics",
    title: "Turning an old instinct into a field of study",
    body:
      "At the University of Houston, studying Supply Chain and Logistics on the Maritime Logistics pathway sharpened those early instincts into a more practical interest in ports, vessels, energy flows, and trade systems.",
  },
  {
    label: "Market analysis",
    title: "AIS, crude, LNG, and sanctions exposure",
    body:
      "During my Hanwha Shipping internship as an Oil and Gas Market Analyst, I worked with AIS data, tracked crude oil and LNG flows, researched sanctions exposure, and mapped geopolitical risk onto market movement.",
  },
  {
    label: "The itch",
    title: "Maritime intelligence was too fragmented",
    body:
      "OFAC lists were in one place, AIS positions somewhere else, ownership records buried in registries, and news in another tab. SEAM started as a way to pull those threads into one working intelligence workspace.",
  },
];

const BUILD_BEATS = [
  "First version: built quickly, then thrown out",
  "Second version: rebuilt around real analyst workflow",
  "Solo build: finished while moving houses",
  "Deadline: complete before starting at EnerMech",
];

const DATA_LAYERS = [
  "AIS positions",
  "Ownership networks",
  "Sanctions screening",
  "Port activity",
  "Maritime news",
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
            <div className="about-beat-list">
              {STORY_BEATS.map((beat) => (
                <article key={beat.label} className="about-beat">
                  <span>{beat.label}</span>
                  <h3>{beat.title}</h3>
                  <p>{beat.body}</p>
                </article>
              ))}
            </div>
          </div>
          <aside className="about-route-visual" aria-label="Animated explanation of the project origin">
            <div className="about-route-map">
              <span className="route-node houston">Houston</span>
              <span className="route-node asia">Central Asia</span>
              <span className="route-node singapore">Singapore</span>
              <span className="route-line line-one" />
              <span className="route-line line-two" />
              <span className="route-vessel"><Ship size={16} /></span>
            </div>
            <div className="about-build-track">
              {BUILD_BEATS.map((item, index) => (
                <div key={item} className="about-build-step" style={{ animationDelay: `${index * 120}ms` }}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
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
