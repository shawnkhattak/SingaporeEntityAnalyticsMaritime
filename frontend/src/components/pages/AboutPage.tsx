import {
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
  "FastAPI",
  "PostGIS",
  "React",
  "TypeScript",
  "MapLibre GL",
  "OpenSanctions",
  "OFAC SDN",
  "OCEANS-X AIS",
];

const CAPABILITIES = [
  {
    title: "AIS operating picture",
    body: "Singapore-area vessel positions and map context from OCEANS-X AIS snapshots.",
    icon: Radar,
  },
  {
    title: "Entity networks",
    body: "Vessel, owner, operator, manager, and related entity records in one investigation flow.",
    icon: Network,
  },
  {
    title: "Risk screening",
    body: "Sanctions, watchlist, identity conflict, and adverse-news signals grouped around maritime subjects.",
    icon: ShieldCheck,
  },
];

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero panel-solid">
        <div className="about-hero-copy">
          <div className="t-caption">About SEAM</div>
          <h1 className="t-display about-title">Singapore Entity Analytics Maritime</h1>
          <p>
            Built by <strong>Shawn Khattak</strong>, SEAM is a maritime intelligence portfolio demo exploring how AIS
            vessel data, entity ownership networks, sanctions screening, and maritime news can be unified into one
            workspace.
          </p>
          <p>
            It was built to show how an analyst-facing product can connect live-source ingestion, geospatial context,
            evidence-backed risk indicators, and operational monitoring without losing source transparency.
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
            <Ship size={15} />
            <span>Portfolio demo for maritime intelligence workflows</span>
          </div>
        </aside>
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

      <section className="about-stack panel-solid">
        <div>
          <div className="t-caption">Tech stack</div>
          <h2>Systems used in the demo</h2>
          <p>
            SEAM combines a FastAPI backend, PostGIS-backed data model, React and TypeScript frontend, MapLibre GL maps,
            and sanctions and AIS source integrations.
          </p>
        </div>
        <div className="about-stack-grid">
          {STACK.map((item) => (
            <span key={item}>
              {item === "MapLibre GL" ? <Map size={13} /> : item === "PostGIS" ? <Database size={13} /> : <Ship size={13} />}
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
