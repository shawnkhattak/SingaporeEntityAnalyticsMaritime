import { Anchor, ChevronRight, FileWarning, Flag, Newspaper, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRiskFeed, runRiskRecompute } from "../../api";
import { formatDate, formatRelative } from "../../format";
import { useApp, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { Chip } from "../primitives/Chip";
import { EmptyState } from "../primitives/EmptyState";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { Pill, RiskPill } from "../primitives/Pill";
import { Skeleton } from "../primitives/Skeleton";
import type { IdentityConflictDetail, RiskFeedItem, RiskFlag, RiskSeverity } from "../../types";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { closeInspectorRoute, navigateBack, navigateTo } from "../../hooks/useRoute";
import { riskLabel, type RiskKind } from "../../labels";
import { getHumanReadableSanctionSources } from "../../sanctionsSource";
import { InspectorShell } from "./InspectorShell";

// "high" + "critical" render as a single Critical tier. Selecting it
// adds both severity values to the filter set.
const SEVERITY_CHIPS: { label: string; values: RiskSeverity[]; tone: "crit" | "med" | "low" }[] = [
  { label: "Critical", values: ["critical", "high"], tone: "crit" },
  { label: "Medium", values: ["medium"], tone: "med" },
  { label: "Low", values: ["low"], tone: "low" },
];
const KIND_FILTERS: { kind: RiskKind; label: string; icon: React.ReactNode }[] = [
  { kind: "sanctioned", label: "Sanctioned", icon: <Scale size={11} /> },
  { kind: "detained", label: "Detained", icon: <Anchor size={11} /> },
  { kind: "watchlist", label: "Watchlist", icon: <ShieldAlert size={11} /> },
  { kind: "identity_conflict", label: "Identity conflict", icon: null },
  { kind: "high_risk_flag", label: "High-risk flag", icon: null },
  { kind: "news", label: "Adverse news", icon: null },
];

type FlatRiskRow = {
  flag: RiskFlag;
  subject: string;
  vesselId?: number;
  entityId?: number;
  evidencePayload?: Record<string, unknown> | null;
  conflictDetails?: IdentityConflictDetail[] | null;
};

type RiskGroup = {
  key: string;
  subject: string;
  vesselId?: number;
  entityId?: number;
  rows: FlatRiskRow[];
  severity: RiskSeverity;
  status: "active" | "resolved";
  updatedAt: string;
  kinds: Set<RiskKind>;
  sanctionsSources: string[];
  kindCounts: Record<RiskKind, number>;
  evidenceId: number | null;
};

type AlertRow = {
  key: string;
  kind: RiskKind;
  label: string;
  detail: string;
  updatedAt: string;
};

export function RiskFeedInspector() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [severityFilters, setSeverityFilters] = useState<Set<RiskSeverity>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [feedItems, setFeedItems] = useState<RiskFeedItem[]>([]);
  const runJob = useJobRunner();

  const loadFeed = useCallback(() => {
    setLoading(true);
    getRiskFeed(1000, statusFilter === "all")
      .then((items) => {
        setFeedItems(items);

        const byVessel = new Map<number, RiskFlag[]>();
        const byEntity = new Map<number, RiskFlag[]>();
        for (const item of items) {
          if (item.vessel_id != null) {
            byVessel.set(item.vessel_id, [...(byVessel.get(item.vessel_id) ?? []), item.flag]);
          } else if (item.entity_id != null) {
            byEntity.set(item.entity_id, [...(byEntity.get(item.entity_id) ?? []), item.flag]);
          }
        }
        for (const [id, flags] of byVessel) {
          dispatch({ type: "CACHE_VESSEL_RISK", id, flags });
        }
        for (const [id, flags] of byEntity) {
          dispatch({ type: "CACHE_ENTITY_RISK", id, flags });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const flatFlags: FlatRiskRow[] = useMemo(() => {
    return feedItems.map((item) => ({
      flag: item.flag,
      subject: item.subject,
      vesselId: item.vessel_id ?? undefined,
      entityId: item.entity_id ?? undefined,
      evidencePayload: item.evidence_payload,
      conflictDetails: item.conflict_details,
    }));
  }, [feedItems]);

  const groups = useMemo(() => groupRiskRows(flatFlags), [flatFlags]);

  const kindCounts = useMemo(() => {
    const out: Record<RiskKind, number> = {
      sanctioned: 0,
      detained: 0,
      watchlist: 0,
      news: 0,
      high_risk_flag: 0,
      identity_conflict: 0,
      other: 0,
    };
    for (const group of groups) {
      if (group.status === "resolved") continue;
      for (const kind of group.kinds) out[kind] += 1;
    }
    return out;
  }, [groups]);
  const [kindFilter, setKindFilter] = useState<RiskKind | null>(null);

  const filtered = useMemo(() => {
    return groups.filter((group) => {
      if (severityFilters.size > 0 && !severityFilters.has(group.severity)) return false;
      if (kindFilter && !group.kinds.has(kindFilter)) return false;
      if (statusFilter === "open" && group.status === "resolved") return false;
      return true;
    });
  }, [groups, severityFilters, kindFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const out: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    groups.forEach((group) => {
      if (group.status !== "resolved") out[group.severity]++;
    });
    return out;
  }, [groups]);

  return (
    <InspectorShell
      breadcrumb="Risk & Sanctions"
      title={`Risk & Sanctions · ${filtered.length}`}
      onBack={() => navigateBack("/map")}
      backLabel="Back to previous page"
      onClose={closeInspectorRoute}
      footer={
        <Button
          size="sm"
          variant="primary"
          leadingIcon={<RefreshCw size={12} />}
          onClick={() =>
            runJob("risk-recompute", () => runRiskRecompute(), { successTitle: "Risk recompute complete", errorTitle: "Risk recompute failed" })
              .then(loadFeed)
          }
        >
          Recompute risk flags
        </Button>
      }
    >
      <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
        {SEVERITY_CHIPS.map((chip) => (
          <Chip
            key={chip.label}
            tone={chip.tone}
            selected={chip.values.every((v) => severityFilters.has(v))}
            onClick={() => setSeverityFilters((curr) => toggleSeverityGroup(curr, chip.values))}
          >
            {chip.label} · {chip.values.reduce((sum, v) => sum + (severityCounts[v] ?? 0), 0)}
          </Chip>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {(
          [
            ...KIND_FILTERS,
          ]
        ).map((k) => (
          <Chip key={k.kind} selected={kindFilter === k.kind} onClick={() => setKindFilter((curr) => (curr === k.kind ? null : k.kind))}>
            {k.icon}
            <span>{k.label}</span>
            <span style={{ opacity: 0.6, marginLeft: 2 }}>· {kindCounts[k.kind] ?? 0}</span>
          </Chip>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8, fontSize: 11 }}>
        <label className="row" style={{ gap: 4 }}>
          <input type="checkbox" checked={statusFilter === "open"} onChange={(e) => setStatusFilter(e.target.checked ? "open" : "all")} />
          Open only
        </label>
      </div>

      {loading && <Skeleton height={48} style={{ marginTop: 12 }} />}
      {!loading && filtered.length === 0 && (
        <EmptyState
          compact
          icon={<ShieldAlert size={18} />}
          title={groups.length === 0 ? "No risk alerts loaded" : "No risk alerts match these filters"}
          body={
            groups.length === 0
              ? "Recompute risk to derive flags from the current vessel + observation set."
              : "Clear the severity, kind, or status filters to see more."
          }
          action={
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<RefreshCw size={11} />}
              onClick={() =>
                runJob("risk-recompute", () => runRiskRecompute(), { successTitle: "Risk recompute complete", errorTitle: "Risk recompute failed" })
                  .then(loadFeed)
              }
            >
              Recompute risk
            </Button>
          }
        />
      )}

      <div className="col" style={{ marginTop: 12, gap: 6, paddingBottom: 72 }}>
        {filtered.map((group) => (
          <RiskGroupCard
            key={group.key}
            group={group}
            onOpenSubject={() => {
              try { sessionStorage.setItem("seam:return-to-risk", "1"); } catch { /* ignore */ }
              if (group.vesselId != null) {
                const v = state.vessels.find((x) => x.vessel_id === group.vesselId);
                if (v) requestMapCenter({ lng: v.longitude, lat: v.latitude, zoom: 12 });
                navigateTo(`/vessels/${group.vesselId}?from=risk`);
              } else if (group.entityId != null) {
                navigateTo(`/entities/${group.entityId}?from=risk`);
              }
            }}
          />
        ))}
      </div>
    </InspectorShell>
  );
}

function RiskGroupCard({ group, onOpenSubject }: { group: RiskGroup; onOpenSubject: () => void }) {
  const stripeTone =
    group.severity === "critical" || group.severity === "high"
      ? "stripe-crit"
      : group.severity === "medium"
      ? "stripe-med"
      : "stripe-low";
  const alertRows = groupAlertRows(group);
  const isSingleAlert = group.rows.length === 1;

  return (
    <article className={`card ${stripeTone}`} style={{ padding: isSingleAlert ? "9px 12px 9px 14px" : "10px 12px 10px 14px" }}>
      <div className="row" style={{ gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={onOpenSubject}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ocean-500)", fontWeight: 700, flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {group.subject}
        </button>
        <RiskPill severity={group.severity} />
        <Pill variant={group.status === "active" ? "info" : "ok"}>{group.status === "active" ? "Active" : "Resolved"}</Pill>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 5, alignItems: "center" }}>
        <span className="t-faded" style={{ fontSize: 11 }} title={formatDate(group.updatedAt)}>
          Updated {formatRelative(group.updatedAt)}
        </span>
        {group.rows.length > 1 && (
          <span className="t-faded" style={{ fontSize: 11 }}>
            {group.rows.length} connected alerts
          </span>
        )}
      </div>

      {!isSingleAlert && (
        <p className="t-sm" style={{ margin: "8px 0 0", lineHeight: 1.45 }}>
          {group.rows.length} related alerts: {groupSummaryText(group)}.
        </p>
      )}

      <div className="col risk-group-alert-list">
        {alertRows.slice(0, 6).map((row) => (
          <RiskAlertRow key={row.key} row={row} />
        ))}
        {alertRows.length > 6 && (
          <div className="risk-group-alert-more">+{alertRows.length - 6} more signals</div>
        )}
      </div>

      <div className="row risk-group-actions">
        <EvidenceLink id={group.evidenceId} variant="chip" />
        <button type="button" onClick={onOpenSubject} className="btn ghost sm" style={{ padding: "0 8px" }}>
          <ChevronRight size={11} /> View details
        </button>
      </div>
    </article>
  );
}

function RiskAlertRow({ row }: { row: AlertRow }) {
  const meta = alertMeta(row.kind);
  const Icon = meta.icon;
  return (
    <div className="risk-alert-row">
      <span className={`risk-alert-icon ${meta.className}`}>
        <Icon size={12} />
      </span>
      <span className="risk-alert-label">{row.label}</span>
      <span className="risk-alert-detail">{row.detail}</span>
      <span className="risk-alert-time" title={formatDate(row.updatedAt)}>{formatRelative(row.updatedAt)}</span>
    </div>
  );
}

function groupRiskRows(rows: FlatRiskRow[]): RiskGroup[] {
  const bySubject = new Map<string, FlatRiskRow[]>();
  for (const row of rows) {
    const key = row.vesselId != null ? `vessel:${row.vesselId}` : row.entityId != null ? `entity:${row.entityId}` : `flag:${row.flag.id}`;
    bySubject.set(key, [...(bySubject.get(key) ?? []), row]);
  }

  return Array.from(bySubject.entries())
    .map(([key, groupRows]) => {
      const sortedRows = [...groupRows].sort((a, b) => severityRank(b.flag.severity) - severityRank(a.flag.severity) || Date.parse(b.flag.created_at) - Date.parse(a.flag.created_at));
      const activeRows = sortedRows.filter((row) => row.flag.status !== "resolved");
      const relevantRows = activeRows.length > 0 ? activeRows : sortedRows;
      const sanctionsSources = unique(
        relevantRows.flatMap((row) => riskLabel(row.flag.flag_type).kind === "sanctioned" ? getHumanReadableSanctionSources(row.evidencePayload) : [])
      );
      const kinds = new Set<RiskKind>(relevantRows.map((row) => riskLabel(row.flag.flag_type).kind));
      return {
        key,
        subject: sortedRows[0].subject,
        vesselId: sortedRows[0].vesselId,
        entityId: sortedRows[0].entityId,
        rows: relevantRows,
        severity: highestSeverity(relevantRows.map((row) => row.flag.severity)),
        status: activeRows.length > 0 ? "active" : "resolved",
        updatedAt: relevantRows.map((row) => row.flag.created_at).sort((a, b) => Date.parse(b) - Date.parse(a))[0],
        kinds,
        sanctionsSources,
        kindCounts: countKinds(relevantRows),
        evidenceId: relevantRows.find((row) => row.flag.evidence_id != null)?.flag.evidence_id ?? null,
      } satisfies RiskGroup;
    })
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function groupAlertRows(group: RiskGroup): AlertRow[] {
  const rows: AlertRow[] = [];
  const sanctionRows = group.rows.filter((row) => riskLabel(row.flag.flag_type).kind === "sanctioned");
  for (const source of group.sanctionsSources) {
    const sourceRow = sanctionRows.find((row) => getHumanReadableSanctionSources(row.evidencePayload).includes(source)) ?? sanctionRows[0];
    rows.push({
      key: `sanctioned:${source}`,
      kind: "sanctioned",
      label: alertDisplayLabel("sanctioned"),
      detail: source,
      updatedAt: sourceRow?.flag.created_at ?? group.updatedAt,
    });
  }
  for (const row of group.rows) {
    const label = riskLabel(row.flag.flag_type);
    if (label.kind === "sanctioned") continue;
    const detail = alertDetail(row, label.kind);
    const key = `${row.flag.id}:${label.kind}:${detail}`;
    rows.push({
      key,
      kind: label.kind,
      label: alertDisplayLabel(label.kind),
      detail,
      updatedAt: row.flag.created_at,
    });
  }
  return rows;
}

function alertDetail(row: FlatRiskRow, kind: RiskKind): string {
  if (kind === "identity_conflict" && row.conflictDetails?.length) {
    return row.conflictDetails.map((conflict) => conflict.label).join(", ");
  }
  return cleanRiskSummary(row.flag.summary) || riskLabel(row.flag.flag_type).body;
}

function countKinds(rows: FlatRiskRow[]): Record<RiskKind, number> {
  const counts: Record<RiskKind, number> = {
    sanctioned: 0,
    detained: 0,
    watchlist: 0,
    news: 0,
    high_risk_flag: 0,
    identity_conflict: 0,
    other: 0,
  };
  for (const row of rows) counts[riskLabel(row.flag.flag_type).kind] += 1;
  return counts;
}

function alertMeta(kind: RiskKind): { icon: typeof ShieldAlert; className: string } {
  switch (kind) {
    case "sanctioned":
      return { icon: Scale, className: "sanctioned" };
    case "detained":
      return { icon: Anchor, className: "detained" };
    case "watchlist":
      return { icon: ShieldAlert, className: "watchlist" };
    case "identity_conflict":
      return { icon: FileWarning, className: "identity" };
    case "high_risk_flag":
      return { icon: Flag, className: "high-risk" };
    case "news":
      return { icon: Newspaper, className: "news" };
    default:
      return { icon: ShieldAlert, className: "other" };
  }
}

function groupSummaryText(group: RiskGroup): string {
  const parts: string[] = [];
  if (group.kindCounts.sanctioned > 0) parts.push(`${group.kindCounts.sanctioned} ${group.kindCounts.sanctioned === 1 ? "sanction" : "sanctions"}`);
  if (group.kindCounts.identity_conflict > 0) parts.push(`${group.kindCounts.identity_conflict} identity ${group.kindCounts.identity_conflict === 1 ? "conflict" : "conflicts"}`);
  if (group.kindCounts.watchlist > 0) parts.push(`${group.kindCounts.watchlist} watchlist ${group.kindCounts.watchlist === 1 ? "signal" : "signals"}`);
  if (group.kindCounts.high_risk_flag > 0) parts.push(`${group.kindCounts.high_risk_flag} high-risk ${group.kindCounts.high_risk_flag === 1 ? "flag" : "flags"}`);
  if (group.kindCounts.news > 0) parts.push(`${group.kindCounts.news} adverse news ${group.kindCounts.news === 1 ? "signal" : "signals"}`);
  if (group.kindCounts.detained > 0) parts.push(`${group.kindCounts.detained} ${group.kindCounts.detained === 1 ? "detention" : "detentions"}`);
  if (group.kindCounts.other > 0) parts.push(`${group.kindCounts.other} other risk ${group.kindCounts.other === 1 ? "flag" : "flags"}`);
  return formatTextList(parts);
}

function alertDisplayLabel(kind: RiskKind): string {
  switch (kind) {
    case "sanctioned":
      return "Sanctioned";
    case "detained":
      return "Detained";
    case "watchlist":
      return "Watchlist";
    case "identity_conflict":
      return "Identity conflict";
    case "high_risk_flag":
      return "High-risk flag";
    case "news":
      return "Adverse news";
    default:
      return "Risk signal";
  }
}

function highestSeverity(severities: string[]): RiskSeverity {
  const sorted = severities.filter((value): value is RiskSeverity => ["critical", "high", "medium", "low", "none"].includes(value)).sort((a, b) => severityRank(b) - severityRank(a));
  return sorted[0] ?? "none";
}

function toggleSeverityGroup(current: Set<RiskSeverity>, values: RiskSeverity[]): Set<RiskSeverity> {
  const next = new Set(current);
  const allSelected = values.every((v) => next.has(v));
  if (allSelected) values.forEach((v) => next.delete(v));
  else values.forEach((v) => next.add(v));
  return next;
}

function severityRank(severity: string): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatTextList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function cleanRiskSummary(summary: string): string {
  return summary.replace(/\s+/g, " ").trim();
}
