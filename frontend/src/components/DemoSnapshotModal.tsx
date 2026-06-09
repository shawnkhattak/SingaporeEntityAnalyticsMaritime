import { Anchor, Compass, ExternalLink, Github, HeartHandshake, Linkedin, Map, Newspaper, Rocket, ShieldCheck, Ship } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { navigateTo } from "../hooks/useRoute";
import { SeamWordmark } from "./brand/SeamBrand";

const GITHUB_URL = "https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime";
const LINKEDIN_URL = "https://www.linkedin.com/in/shawnkhattak/";
const WALKTHROUGH_KEY = "seam:guided-site-tour-seen-v2";

type TourStep = {
  route: string;
  selector: string | null;
  label: string;
  title: string;
  body: string;
  icon: typeof Map;
  placement?: "center" | "right" | "left" | "top" | "bottom";
};

const TOUR_STEPS: TourStep[] = [
  {
    route: "/map",
    selector: "[data-tour='primary-nav']",
    label: "Navigation",
    title: "Use the left rail to move between workspaces",
    body: "The primary navigation switches between the map, vessels, entities, ports, risk, and news. Each page keeps the map-driven investigation model close by.",
    icon: Compass,
  },
  {
    route: "/map",
    selector: "[data-tour='map-canvas']",
    label: "Map",
    title: "The map is the operational canvas",
    body: "Vessel positions, headings, risk coloring, and port geography are shown together so an analyst can start from movement and drill into details.",
    icon: Map,
    placement: "right",
  },
  {
    route: "/vessels",
    selector: "[data-tour='inspector']",
    label: "Vessels",
    title: "Vessel pages collect identity and movement context",
    body: "The Vessels workspace is where users browse ships and open vessel profiles with latest position, particulars, observations, events, and risk flags.",
    icon: Ship,
  },
  {
    route: "/entities",
    selector: "[data-tour='inspector']",
    label: "Entities",
    title: "Entities connect companies to fleets",
    body: "The Entities workspace shows owners, operators, managers, and their linked vessels so relationships can be reviewed alongside map activity.",
    icon: Anchor,
  },
  {
    route: "/risk",
    selector: "[data-tour='inspector']",
    label: "Risk",
    title: "Risk and sanctions cards stay evidence-led",
    body: "Risk cards group sanctions matches, identity conflicts, high-risk flags, and related signals. Evidence links preserve the source record behind each claim.",
    icon: ShieldCheck,
  },
  {
    route: "/news",
    selector: "[data-tour='inspector']",
    label: "News",
    title: "News adds external maritime context",
    body: "The News workspace brings in Singapore-relevant reporting, social intel, and an AI-generated brief while keeping source links visible.",
    icon: Newspaper,
  },
  {
    route: "/ports",
    selector: "[data-tour='inspector']",
    label: "Ports",
    title: "Ports show local activity around infrastructure",
    body: "The Ports view connects stored vessel activity to terminals, berths, and pilotage points so port context can support an investigation.",
    icon: Anchor,
  },
  {
    route: "/map",
    selector: null,
    label: "You're ready",
    title: "Now explore the intelligence workflow",
    body: "You've seen how SEAM organizes vessels, ownership links, risk signals, source evidence, ports, and maritime context across a live-style map interface. From here, continue exploring the platform, open the side panels, and see how each layer supports faster maritime and supply chain analysis.",
    icon: HeartHandshake,
    placement: "center",
  },
];

type Rect = { left: number; top: number; width: number; height: number };

export function DemoSnapshotModal() {
  const [phase, setPhase] = useState<"welcome" | "tour">("welcome");
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(WALKTHROUGH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [targetResolved, setTargetResolved] = useState(false);
  const step = TOUR_STEPS[stepIndex];
  const Icon = step.icon;
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    function onOpenDemoNotice() {
      setPhase("welcome");
      setStepIndex(0);
      setOpen(true);
    }
    window.addEventListener("seam:open-demo-notice", onOpenDemoNotice);
    return () => window.removeEventListener("seam:open-demo-notice", onOpenDemoNotice);
  }, []);

  useEffect(() => {
    if (!open || phase !== "tour") return;
    navigateTo(step.route);
  }, [open, phase, step.route]);

  useLayoutEffect(() => {
    if (!open || phase !== "tour") return;
    let frame = 0;
    let timeout = 0;
    let attempts = 0;
    setTargetResolved(!step.selector);
    setTargetRect(null);
    const update = () => {
      if (!step.selector) {
        setTargetRect(null);
        setTargetResolved(true);
        return;
      }
      const element = document.querySelector(step.selector);
      if (!(element instanceof HTMLElement)) {
        setTargetRect(null);
        if (attempts < 12) {
          attempts += 1;
          timeout = window.setTimeout(update, 160);
        } else {
          setTargetResolved(true);
        }
        return;
      }
      const rect = element.getBoundingClientRect();
      const pad = 8;
      setTargetRect({
        left: Math.max(8, rect.left - pad),
        top: Math.max(8, rect.top - pad),
        width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
        height: Math.min(window.innerHeight - 16, rect.height + pad * 2),
      });
      setTargetResolved(true);
    };
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    timeout = window.setTimeout(update, 260);
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, phase, step.selector, step.route]);

  const calloutStyle = useMemo(() => getCalloutStyle(targetRect, step.placement), [targetRect, step.placement]);
  const dimStyles = useMemo(() => getDimStyles(targetRect), [targetRect]);

  function close() {
    try {
      localStorage.setItem(WALKTHROUGH_KEY, "1");
    } catch {
      // Ignore storage failures in private or locked-down browsers.
    }
    setOpen(false);
  }

  if (!open) return null;

  if (phase === "welcome") {
    return (
      <div className="site-tour" role="dialog" aria-modal="true" aria-label="SEAM welcome">
        <div className="site-tour-scrim welcome" />
        <section className="site-tour-welcome-card">
          <div className="demo-modal-mark site-tour-welcome-mark" aria-hidden="true">
            <svg className="demo-modal-logo" viewBox="0 0 100 100" role="img" aria-label="SEAM">
              <rect width="100" height="100" rx="23.7" fill="#0B2545" />
              <circle className="demo-modal-logo-ring slow" cx="50" cy="50" r="38" />
              <circle className="demo-modal-logo-ring fast" cx="50" cy="50" r="27" />
              <g className="demo-modal-logo-sweep">
                <path d="M50,50 L92,50 A42,42 0 0,0 70,12 Z" fill="#F59E0B" opacity="0.24" />
                <line x1="50" y1="50" x2="92" y2="50" stroke="#F59E0B" strokeWidth="1.4" opacity="0.9" />
              </g>
              <polygon className="demo-modal-logo-needle vertical" points="50,18 56,50 50,82 44,50" fill="#FFFFFF" opacity="0.92" />
              <polygon className="demo-modal-logo-needle horizontal" points="18,50 50,46 82,50 50,54" fill="#F59E0B" />
              <circle cx="50" cy="50" r="4" fill="#0B2545" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle className="demo-modal-logo-dot" cx="50" cy="50" r="1.4" fill="#F59E0B" />
            </svg>
          </div>
          <SeamWordmark size="lg" />
          <div className="site-tour-welcome-kicker">Singapore Entity Analytics · Maritime Intelligence</div>
          <h1>A maritime intelligence portfolio demo</h1>
          <p>
            Built by Shawn Khattak, SEAM explores how maritime, trade, and offshore operations data can come together
            in one intelligence workspace. It brings vessel movement, company networks, sanctions indicators, port
            activity, source evidence, and maritime news into a single live-style workflow.
          </p>
          <p>
            Built to reflect my interest in <strong>supply chain, logistics, maritime shipping, and energy-sector
            operations</strong>, the demo shows how data-driven tools can support faster awareness, clearer
            investigations, and better decision-making across the maritime industry.
          </p>
          <div className="site-tour-links welcome-links">
            <a className="github" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github size={14} />
              View GitHub
              <ExternalLink size={12} />
            </a>
            <a className="linkedin" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
              <Linkedin size={14} />
              Connect on LinkedIn
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="site-tour-actions welcome-actions">
            <button type="button" className="btn ghost" onClick={close}>Skip</button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setStepIndex(0);
                setPhase("tour");
              }}
            >
              <Rocket size={14} />
              Launch Demo
            </button>
          </div>
        </section>
      </div>
    );
  }

  const showCallout = !step.selector || targetRect || targetResolved;

  return (
    <div className="site-tour" role="dialog" aria-modal="true" aria-label="SEAM guided walkthrough">
      {targetRect ? (
        <>
          <div className="site-tour-dim" style={dimStyles.top} />
          <div className="site-tour-dim" style={dimStyles.right} />
          <div className="site-tour-dim" style={dimStyles.bottom} />
          <div className="site-tour-dim" style={dimStyles.left} />
        </>
      ) : (
        <div className="site-tour-scrim" />
      )}
      {targetRect && (
        <div
          className="site-tour-highlight"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}
      {showCallout && <section key={step.label} className={`site-tour-card ${targetRect ? "" : "centered"}`} style={calloutStyle}>
        <div className="site-tour-head">
          <div className="site-tour-icon">
            <Icon size={18} />
          </div>
          <div>
            <div className="site-tour-label">{step.label}</div>
            <h2>{step.title}</h2>
          </div>
        </div>
        <p>{step.body}</p>
        <div className="site-tour-progress" aria-label={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === stepIndex ? "active" : ""}
              onClick={() => setStepIndex(index)}
              aria-label={`Go to ${item.label}`}
            />
          ))}
        </div>
        {isLastStep && (
          <div className="site-tour-links">
            <a className="github" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github size={14} />
              GitHub
              <ExternalLink size={12} />
            </a>
            <a className="linkedin" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
              <Linkedin size={14} />
              LinkedIn
              <ExternalLink size={12} />
            </a>
          </div>
        )}
        <div className="site-tour-actions">
          <button type="button" className="btn ghost" onClick={close}>
            Skip
          </button>
          <span className="site-tour-count">{stepIndex + 1} / {TOUR_STEPS.length}</span>
          <button
            type="button"
            className="btn"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (isLastStep) close();
              else setStepIndex((current) => current + 1);
            }}
          >
            {isLastStep ? "Continue Exploring" : "Next"}
          </button>
        </div>
      </section>}
    </div>
  );
}

function getDimStyles(rect: Rect | null): Record<"top" | "right" | "bottom" | "left", CSSProperties> {
  if (!rect) {
    return {
      top: { inset: 0 },
      right: { display: "none" },
      bottom: { display: "none" },
      left: { display: "none" },
    };
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  return {
    top: { left: 0, top: 0, width: viewportWidth, height: rect.top },
    right: { left: rect.left + rect.width, top: rect.top, width: viewportWidth - rect.left - rect.width, height: rect.height },
    bottom: { left: 0, top: rect.top + rect.height, width: viewportWidth, height: viewportHeight - rect.top - rect.height },
    left: { left: 0, top: rect.top, width: rect.left, height: rect.height },
  };
}

function getCalloutStyle(rect: Rect | null, placement: TourStep["placement"]): CSSProperties {
  const width = 390;
  if (!rect || placement === "center") {
    return { left: `calc(50vw - ${width / 2}px)`, top: "calc(50vh - 190px)", width };
  }

  const gap = 18;
  const fitsRight = rect.left + rect.width + gap + width < window.innerWidth - 16;
  const fitsLeft = rect.left - gap - width > 16;
  const fitsBelow = rect.top + rect.height + gap + 260 < window.innerHeight - 16;
  const desired = placement ?? (fitsRight ? "right" : fitsLeft ? "left" : fitsBelow ? "bottom" : "top");

  let left = rect.left + rect.width + gap;
  let top = rect.top;
  if (desired === "left") left = rect.left - width - gap;
  if (desired === "top") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.top - 260 - gap;
  }
  if (desired === "bottom") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.top + rect.height + gap;
  }

  return {
    width,
    left: clamp(left, 16, window.innerWidth - width - 16),
    top: clamp(top, 16, window.innerHeight - 280),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
