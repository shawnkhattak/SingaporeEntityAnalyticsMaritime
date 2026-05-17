import { Check, Circle } from "lucide-react";

type RoadmapStage = {
  title: string;
  body: string;
  status: "Completed" | "In progress" | "Final";
  details: string[];
  outcome: string;
};

const STAGES: RoadmapStage[] = [
  {
    title: "Bring in real vessel data",
    body: "SEAM pulls in live ship information instead of showing fake demo examples.",
    status: "Completed",
    details: [
      "Shows where vessels are, where they have moved, and what port activity is available.",
      "Lets the developer panel refresh data when needed and show what happened during each refresh.",
      "Tracks when each source last worked so stale data is easier to spot.",
    ],
    outcome: "The map is based on current maritime data, and the app can explain when that data was last updated.",
  },
  {
    title: "Show proof behind each claim",
    body: "Every important warning or relationship should lead back to the source record that created it.",
    status: "Completed",
    details: [
      "Stores vessels, companies, relationships, risk flags, and source records in the database.",
      "Keeps the original source payload so it can be opened later for review.",
      "Adds Evidence links from Risk, Sanctions, vessel, and entity screens.",
    ],
    outcome: "A user does not have to trust a warning blindly; they can open the evidence behind it.",
  },
  {
    title: "Make the map useful",
    body: "The map should be the main place to explore vessels, not just a background image.",
    status: "Completed",
    details: [
      "Vessel icons change color by risk level so high-risk ships stand out immediately.",
      "Optional map layers show ports, coastlines, anchor areas, and other maritime context.",
      "Clicking a vessel opens details while keeping the selected ship visible on the map.",
    ],
    outcome: "A user can scan Singapore-area traffic quickly and open vessel details without losing their place.",
  },
  {
    title: "Explain why a vessel is risky",
    body: "Risk cards should tell the user what caused the warning, not just say something is risky.",
    status: "Completed",
    details: [
      "Sanctions matches show the exact sanctions or detention list behind the hit.",
      "News feeds are grouped into Singapore maritime intel, watchlists, and social media chatter.",
      "Identity warnings show what changed, such as name, flag, MMSI, owner, or operator.",
    ],
    outcome: "The Risk tab is easier to scan because each card explains the evidence in plain English.",
  },
  {
    title: "Make the app easier to use",
    body: "The screens are being cleaned up so the app feels less cluttered and faster to understand.",
    status: "In progress",
    details: [
      "The left menu, map controls, news cards, and risk cards are being simplified.",
      "Panels are being tightened so important details are visible without opening extra pages.",
      "Refresh states, tabs, badges, and tooltips are being made clearer and less distracting.",
    ],
    outcome: "The app should feel like a focused maritime investigation tool instead of a collection of rough prototype screens.",
  },
  {
    title: "Get it ready to share",
    body: "The final step is making the project reliable enough to run, test, and demo without guesswork.",
    status: "Final",
    details: [
      "Backend tests check the main data, risk, evidence, RSS, and API behavior.",
      "Frontend build checks catch broken screens before the app is shown.",
      "Docs explain setup, source configuration, known limits, and what comes after V1.",
    ],
    outcome: "Someone should be able to start the app, understand the demo, and see what is finished versus still planned.",
  },
];

const STATUS_LABELS: Record<RoadmapStage["status"], string> = {
  Completed: "Done",
  "In progress": "Happening now",
  Final: "Last step",
};

export function RoadmapPage() {
  return (
    <div className="roadmap-page" style={{ maxWidth: 820, margin: "0 auto", padding: "24px 0" }}>
      <div className="t-caption">Roadmap</div>
      <h1 className="t-display roadmap-title" style={{ margin: "4px 0 4px" }}>What is left for V1?</h1>
      <p className="t-muted" style={{ marginTop: 0, maxWidth: 640 }}>
        A plain-English view of what SEAM already does, what is being improved now, and what needs to be finished before the first release.
      </p>
      <div className="col" style={{ marginTop: 24, gap: 12 }}>
        {STAGES.map((stage, index) => (
          <article
            key={stage.title}
            className={`panel-solid row roadmap-card ${stage.status === "In progress" ? "is-current" : ""}`}
            style={{ padding: 18, gap: 14, alignItems: "flex-start", animationDelay: `${index * 90}ms` }}
          >
            <div className={`avatar lg roadmap-step ${stage.status === "In progress" ? "is-pulsing" : ""}`} style={{ background: stage.status === "Completed" ? "var(--ocean-50)" : "var(--white)", color: stage.status === "Completed" ? "var(--ocean-600)" : "var(--slate-500)" }}>
              {stage.status === "Completed" ? <Check size={16} /> : <span>{index + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="row">
                <strong style={{ flex: 1, fontSize: 15 }}>{stage.title}</strong>
                <span className={`pill ${stage.status === "Completed" ? "ok" : stage.status === "In progress" ? "info" : ""}`}>{STATUS_LABELS[stage.status]}</span>
              </div>
              <p className="t-sm" style={{ margin: "6px 0 0" }}>{stage.body}</p>
              <div className="col" style={{ gap: 5, marginTop: 10 }}>
                {stage.details.map((detail) => (
                  <div key={detail} className="row" style={{ gap: 7, alignItems: "flex-start" }}>
                    <Circle size={5} style={{ color: "var(--ocean-500)", flex: "0 0 auto", marginTop: 7 }} />
                    <span className="t-sm" style={{ lineHeight: 1.45 }}>{detail}</span>
                  </div>
                ))}
              </div>
              <p className="t-sm" style={{ margin: "10px 0 0", color: "var(--slate-500)" }}>
                <strong style={{ color: "var(--navy-700)" }}>Outcome:</strong> {stage.outcome}
              </p>
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
        SEAM V2 · Maritime intelligence with evidence you can open
      </p>
    </div>
  );
}
