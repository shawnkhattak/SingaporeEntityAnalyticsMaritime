import { Anchor, ChevronRight, Database, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { formatDate, formatRelative } from "../../format";
import { navigateTo } from "../../hooks/useRoute";
import { riskLabel, type RiskKind } from "../../labels";
import { useJobRunner } from "../../state/AppState";
import { runRiskRecompute } from "../../api";
import { Pill, RiskPill } from "../primitives/Pill";
import type { RiskFlag } from "../../types";

type RiskCardProps = {
  flag: RiskFlag;
  subject: string;
  /** Vessel ID if this flag belongs to one — enables per-vessel recompute. */
  vesselId?: number;
  /** When true, render the risk-type as the primary heading and omit
   *  the subject line (already shown in the surrounding inspector).
   *  Used inside VesselDetailInspector where the vessel name is the
   *  surrounding context. */
  hideSubject?: boolean;
  onOpenSubject: () => void;
};

const KIND_ICONS: Record<RiskKind, React.ReactNode> = {
  sanctioned: <Scale size={11} />,
  detained: <Anchor size={11} />,
  watchlist: <ShieldAlert size={11} />,
  news: <ShieldAlert size={11} />,
  high_risk_flag: <ShieldAlert size={11} />,
  identity_conflict: <ShieldAlert size={11} />,
  other: <ShieldAlert size={11} />,
};

/**
 * Card layout (bug #23 swap):
 *   Row 1: risk-type label + severity + status pill + relative time
 *   Row 2: subject (clickable) + source attribution        [hidden if hideSubject]
 *   Row 3: description with "more" toggle
 *   Row 4: Evidence chip + Open button + (optional) recompute icon
 */
export function RiskCard({ flag, subject, vesselId, hideSubject, onOpenSubject }: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const runJob = useJobRunner();
  const label = riskLabel(flag.flag_type);
  const stripeTone =
    flag.severity === "critical"
      ? "stripe-crit"
      : flag.severity === "high"
      ? "stripe-high"
      : flag.severity === "medium"
      ? "stripe-med"
      : "stripe-low";
  const isResolved = flag.status === "resolved";
  const sourceHint = sourceFor(flag.flag_type);

  return (
    <div className={`card ${stripeTone}`} style={{ padding: "10px 12px 10px 14px" }}>
      {/* Row 1 — risk type is now the primary heading */}
      <div className="row" style={{ gap: 6, alignItems: "center" }}>
        <span style={{ color: label.toneClass === "crit" ? "var(--risk-critical)" : "var(--navy-700)" }}>
          {KIND_ICONS[label.kind]}
        </span>
        <strong style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label.title}
        </strong>
        <RiskPill severity={flag.severity as never} />
        <Pill variant={isResolved ? "ok" : "info"}>{isResolved ? "Resolved" : "Active"}</Pill>
        <span className="t-faded" style={{ fontSize: 11 }} title={formatDate(flag.created_at)}>
          {formatRelative(flag.created_at)}
        </span>
      </div>

      {/* Row 2 — subject (when surrounding inspector isn't already the subject) + source */}
      {!hideSubject ? (
        <div className="row" style={{ gap: 6, marginTop: 6, fontSize: 12 }}>
          <button
            type="button"
            onClick={onOpenSubject}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ocean-500)", fontWeight: 500, flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {subject}
          </button>
          <span className="t-faded" style={{ fontSize: 11 }}>{sourceHint}</span>
        </div>
      ) : (
        <div className="t-faded" style={{ fontSize: 11, marginTop: 4 }}>{sourceHint}</div>
      )}

      {/* Row 3 — description */}
      <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
        {expanded ? label.body : truncate(label.body, 120)}
        {label.body.length > 120 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ background: "none", border: 0, color: "var(--ocean-500)", cursor: "pointer", fontSize: 12, padding: 0, marginLeft: 4 }}
          >
            {expanded ? "less" : "more"}
          </button>
        )}
        {expanded && flag.summary && flag.summary !== label.body && (
          <div className="t-faded" style={{ fontSize: 12, marginTop: 4, fontStyle: "italic" }}>{flag.summary}</div>
        )}
      </div>

      {/* Row 4 — actions */}
      <div className="row" style={{ gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        {flag.evidence_id != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateTo(`/evidence/${flag.evidence_id}`);
            }}
            className="pill info"
            style={{ cursor: "pointer", border: 0 }}
          >
            <Database size={10} />
            Evidence #{flag.evidence_id}
          </button>
        )}
        {!hideSubject && (
          <button
            type="button"
            onClick={onOpenSubject}
            className="btn ghost sm"
            style={{ padding: "0 8px" }}
          >
            <ChevronRight size={11} /> Open
          </button>
        )}
        {vesselId != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              runJob(`risk-recompute-${vesselId}`, () => runRiskRecompute(vesselId), {
                successTitle: "Risk recomputed",
                errorTitle: "Recompute failed",
              });
            }}
            className="btn ghost sm"
            style={{ padding: "0 8px" }}
            title="Recompute risk for this vessel"
            aria-label="Recompute risk for this vessel"
          >
            <RefreshCw size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`;
}

function sourceFor(flag_type: string): string {
  if (flag_type === "sanctions_match" || flag_type === "sanctions") return "OpenSanctions";
  if (flag_type === "negative_news_mention") return "RSS news";
  if (flag_type === "maritime_watchlist") return "Watchlist";
  if (flag_type === "high_risk_flag_country") return "Internal rule";
  if (flag_type === "conflicting_identity") return "Identity reconciler";
  if (flag_type === "detained" || flag_type === "port_state_detention") return "Port state control";
  return "Internal";
}
