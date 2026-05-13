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
 * Phase 1.5 card layout: subject + status + timestamp on top, severity +
 * kind + source on the middle row, expandable description + actions
 * on the bottom. Body copy is collapsed behind a "More" toggle so the
 * feed stays scannable.
 */
export function RiskCard({ flag, subject, vesselId, onOpenSubject }: RiskCardProps) {
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
    <div
      className={`card ${stripeTone}`}
      style={{ padding: "10px 12px 10px 14px" }}
    >
      {/* Row 1: subject + status + timestamp */}
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          onClick={onOpenSubject}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", flex: 1, textAlign: "left", color: "var(--navy-900)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {subject}
        </button>
        <Pill variant={isResolved ? "ok" : "info"}>{isResolved ? "Resolved" : "Active"}</Pill>
        <span className="t-faded" style={{ fontSize: 11 }} title={formatDate(flag.created_at)}>
          {formatRelative(flag.created_at)}
        </span>
      </div>

      {/* Row 2: severity + kind + source */}
      <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        <RiskPill severity={flag.severity as never} />
        <Pill variant={label.toneClass}>
          {KIND_ICONS[label.kind]}
          {label.title}
        </Pill>
        <span className="t-faded" style={{ fontSize: 11, marginLeft: 4 }}>{sourceHint}</span>
      </div>

      {/* Row 3: description + actions */}
      <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
        {expanded
          ? label.body
          : truncate(label.body, 120)}
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
        <button
          type="button"
          onClick={onOpenSubject}
          className="btn ghost sm"
          style={{ padding: "0 8px" }}
        >
          <ChevronRight size={11} /> Open
        </button>
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

/**
 * Best-effort source attribution from flag_type. Could be replaced
 * with backend-supplied source field once denormalized (see plan §14).
 */
function sourceFor(flag_type: string): string {
  if (flag_type === "sanctions_match" || flag_type === "sanctions") return "OpenSanctions";
  if (flag_type === "negative_news_mention") return "RSS news";
  if (flag_type === "maritime_watchlist") return "Watchlist";
  if (flag_type === "high_risk_flag_country") return "Internal rule";
  if (flag_type === "conflicting_identity") return "Identity reconciler";
  if (flag_type === "detained" || flag_type === "port_state_detention") return "Port state control";
  return "Internal";
}
