import { Anchor, ChevronRight, Database, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { formatDate, formatRelative } from "../../format";
import { navigateTo } from "../../hooks/useRoute";
import { countryName, flagEmoji, riskLabel, type RiskKind } from "../../labels";
import { getHumanReadableSanctionSource, getHumanReadableSanctionSources } from "../../sanctionsSource";
import { useJobRunner } from "../../state/AppState";
import { runRiskRecompute } from "../../api";
import { Pill, RiskPill } from "../primitives/Pill";
import type { IdentityConflictDetail, RiskFlag } from "../../types";

type RiskCardProps = {
  flag: RiskFlag;
  subject: string;
  evidencePayload?: Record<string, unknown> | null;
  conflictDetails?: IdentityConflictDetail[] | null;
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
export function RiskCard({ flag, subject, evidencePayload, conflictDetails, vesselId, hideSubject, onOpenSubject }: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [conflictsExpanded, setConflictsExpanded] = useState(false);
  const runJob = useJobRunner();
  const label = riskLabel(flag.flag_type);
  const stripeTone =
    flag.severity === "critical" || flag.severity === "high"
      ? "stripe-crit"
      : flag.severity === "medium"
      ? "stripe-med"
      : "stripe-low";
  const isResolved = flag.status === "resolved";
  const isSanctionsOrDetention = label.kind === "sanctioned" || label.kind === "detained" || label.kind === "watchlist";
  const sourceHint = isSanctionsOrDetention ? getHumanReadableSanctionSource(evidencePayload) : sourceFor(flag.flag_type);
  const sanctionSources = label.kind === "sanctioned" ? getHumanReadableSanctionSources(evidencePayload) : [];
  const visibleSanctionSources = sourcesExpanded ? sanctionSources : sanctionSources.slice(0, 4);
  const hiddenSanctionSourceCount = Math.max(0, sanctionSources.length - visibleSanctionSources.length);
  const identityConflicts = label.kind === "identity_conflict" ? conflictDetails ?? [] : [];
  const visibleIdentityConflicts = conflictsExpanded ? identityConflicts : identityConflicts.slice(0, 3);
  const hiddenIdentityConflictCount = Math.max(0, identityConflicts.length - visibleIdentityConflicts.length);
  const sourceDescription = label.body;

  return (
    <div className={`card ${stripeTone}`} style={{ padding: "8px 10px 8px 12px" }}>
      {/* Row 1 — risk type is the primary heading */}
      <div className="row" style={{ gap: 6, alignItems: "center" }}>
        <span style={{ color: label.toneClass === "crit" ? "var(--risk-critical)" : "var(--navy-700)" }}>
          {KIND_ICONS[label.kind]}
        </span>
        <strong style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label.title}
        </strong>
        <RiskPill severity={flag.severity as never} />
        {isResolved && <Pill variant="ok">Resolved</Pill>}
        <span className="t-faded" style={{ fontSize: 10.5 }} title={formatDate(flag.created_at)}>
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
          {label.kind !== "sanctioned" && <span className="source-list-badge" title={sourceHint}>{sourceHint}</span>}
        </div>
      ) : (
        label.kind !== "sanctioned" && <div className="source-list-badge" style={{ marginTop: 5 }} title={sourceHint}>{sourceHint}</div>
      )}

      {/* Row 3 — description */}
      {label.kind === "sanctioned" ? (
        <SanctionSourcesSummary
          sources={sanctionSources}
          visibleSources={visibleSanctionSources}
          hiddenCount={hiddenSanctionSourceCount}
          expanded={sourcesExpanded}
          onToggle={() => setSourcesExpanded((value) => !value)}
        />
      ) : label.kind === "identity_conflict" ? (
        <IdentityConflictSummary
          conflicts={identityConflicts}
          visibleConflicts={visibleIdentityConflicts}
          hiddenCount={hiddenIdentityConflictCount}
          expanded={conflictsExpanded}
          onToggle={() => setConflictsExpanded((value) => !value)}
        />
      ) : label.kind === "high_risk_flag" ? (
        <HighRiskFlagSummary summary={flag.summary} />
      ) : (
        <div className="t-sm" style={{ marginTop: 4, lineHeight: 1.4, fontSize: 12 }}>
          {expanded ? sourceDescription : truncate(sourceDescription, 90)}
          {sourceDescription.length > 90 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ background: "none", border: 0, color: "var(--ocean-500)", cursor: "pointer", fontSize: 11.5, padding: 0, marginLeft: 4 }}
            >
              {expanded ? "less" : "more"}
            </button>
          )}
          {expanded && flag.summary && flag.summary !== sourceDescription && (
            <div className="t-faded" style={{ fontSize: 11.5, marginTop: 3, fontStyle: "italic" }}>{flag.summary}</div>
          )}
        </div>
      )}

      {label.whyItMatters && (
        <div
          style={{
            marginTop: 4,
            paddingLeft: 8,
            borderLeft: "2px solid var(--ocean-300, rgba(58,127,184,.35))",
            color: "var(--slate-500)",
            fontSize: 11.5,
            lineHeight: 1.4,
            fontStyle: "italic",
          }}
        >
          {label.whyItMatters}
        </div>
      )}

      {/* Row 4 — actions */}
      <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: "wrap" }}>
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
            <ChevronRight size={11} /> View details
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

function HighRiskFlagSummary({ summary }: { summary: string }) {
  const code = extractFlagCountryCode(summary);
  const name = countryName(code);
  if (!code) {
    return (
      <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
        Vessel is registered under a flag state designated high-risk for sanctions or proliferation concerns.
      </div>
    );
  }
  return (
    <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
      Flagged to: <strong>{name ? `${name} ${flagEmoji(code)}` : flagEmoji(code)}</strong>. This flag state is configured as high risk for sanctions or proliferation concerns.
    </div>
  );
}

function IdentityConflictSummary({
  conflicts,
  visibleConflicts,
  hiddenCount,
  expanded,
  onToggle,
}: {
  conflicts: IdentityConflictDetail[];
  visibleConflicts: IdentityConflictDetail[];
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="identity-conflict-summary">
        <div className="t-sm">Identity conflict detected.</div>
        <div className="identity-conflict-reason">
          <strong>Reason:</strong> Same IMO appears with conflicting identifiers across sources.
        </div>
      </div>
    );
  }

  const single = conflicts.length === 1;
  const primaryConflict = conflicts[0]!;
  return (
    <div className="identity-conflict-summary">
      <div className="t-sm">
        <strong>{single ? `${primaryConflict.label} conflict detected:` : "Identity changes detected:"}</strong>
      </div>
      <div className="col" style={{ gap: 3, marginTop: 4 }}>
        {visibleConflicts.map((conflict) => (
          <div key={conflict.field} className="identity-conflict-item">
            {!single && (
              <>
                <span className="identity-conflict-label">{conflict.label}:</span>{" "}
              </>
            )}
            <span>{formatConflictValues(conflict.values)}</span>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <button type="button" onClick={onToggle} className="identity-conflict-more">
            +{hiddenCount} more changes
          </button>
        ) : expanded && conflicts.length > 3 ? (
          <button type="button" onClick={onToggle} className="identity-conflict-more">
            Show fewer
          </button>
        ) : null}
      </div>
      <div className="identity-conflict-reason">
        <strong>Reason:</strong>{" "}
        {single
          ? `Multiple sources report different ${identityFieldReason(primaryConflict.field)} for the same IMO.`
          : "Same IMO appears with conflicting identifiers across sources."}
      </div>
    </div>
  );
}

function SanctionSourcesSummary({
  sources,
  visibleSources,
  hiddenCount,
  expanded,
  onToggle,
}: {
  sources: string[];
  visibleSources: string[];
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (sources.length <= 1) {
    return (
      <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
        Matched on 1 sanctions source: <strong>{sources[0] ?? "OpenSanctions maritime record"}</strong>.
      </div>
    );
  }
  if (sources.length <= 4) {
    return (
      <div className="t-sm" style={{ marginTop: 6, lineHeight: 1.5 }}>
        Matched on {sources.length} sanctions sources: <BoldSourceList sources={sources} />.
      </div>
    );
  }

  return (
    <div className="sanction-source-list">
      <div className="t-sm">
        Matched on {sources.length} sanctions sources:
      </div>
      <div className="col" style={{ gap: 3, marginTop: 4 }}>
        {visibleSources.map((source) => (
          <div key={source} className="sanction-source-item"><strong>{source}</strong></div>
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            className="sanction-source-more"
          >
            +{hiddenCount} more
          </button>
        ) : (
          <button type="button" onClick={onToggle} className="sanction-source-more">
            Show fewer
          </button>
        )}
      </div>
    </div>
  );
}

function BoldSourceList({ sources }: { sources: string[] }) {
  return (
    <>
      {sources.map((source, index) => {
        const isLast = index === sources.length - 1;
        const separator = sources.length === 2
          ? index === 0 ? " and " : ""
          : isLast ? "" : index === sources.length - 2 ? ", and " : ", ";
        return (
          <span key={`${source}-${index}`}>
            <strong>{source}</strong>
            {separator}
          </span>
        );
      })}
    </>
  );
}

function formatConflictValues(values: string[]): string {
  const clean = values.filter(Boolean);
  if (clean.length <= 2) return clean.join(" vs ");
  return `${clean[0]} vs ${clean[1]} + ${clean.length - 2} more values`;
}

function identityFieldReason(field: string): string {
  const reasons: Record<string, string> = {
    name: "vessel names",
    imo: "IMO numbers",
    mmsi: "MMSI values",
    flag: "flags",
    call_sign: "call signs",
    owner: "owners",
    operator: "operators",
    vessel_type: "vessel types",
    dimensions: "dimensions",
  };
  return reasons[field] ?? "identity values";
}

function extractFlagCountryCode(summary: string): string | null {
  const match = summary.match(/flag country\s+([A-Z]{2})/i);
  return match ? match[1].toUpperCase() : null;
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
  if (flag_type === "conflicting_identity") return "Source mismatch";
  if (flag_type === "detained" || flag_type === "port_state_detention") return "Port state control";
  return "Internal";
}
