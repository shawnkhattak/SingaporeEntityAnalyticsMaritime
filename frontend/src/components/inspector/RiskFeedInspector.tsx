import { Anchor, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRiskFeed, runRiskRecompute } from "../../api";
import { useApp, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { Chip } from "../primitives/Chip";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import type { RiskFeedItem, RiskFlag, RiskSeverity } from "../../types";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { closeInspectorRoute, navigateTo } from "../../hooks/useRoute";
import { riskLabel, type RiskKind } from "../../labels";
import { RiskCard } from "./RiskCard";
import { InspectorShell } from "./InspectorShell";

const SEVERITIES: RiskSeverity[] = ["critical", "high", "medium", "low"];

export function RiskFeedInspector() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RiskSeverity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [feedItems, setFeedItems] = useState<RiskFeedItem[]>([]);
  const runJob = useJobRunner();

  const loadFeed = useCallback(() => {
    setLoading(true);
    getRiskFeed(1000, true)
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
  }, [dispatch]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const flatFlags: { flag: RiskFlag; subject: string; vesselId?: number; entityId?: number }[] = useMemo(() => {
    return feedItems.map((item) => ({
      flag: item.flag,
      subject: item.subject,
      vesselId: item.vessel_id ?? undefined,
      entityId: item.entity_id ?? undefined,
    }));
  }, [feedItems]);

  const flagTypes = useMemo(() => Array.from(new Set(flatFlags.map((r) => r.flag.flag_type))).sort(), [flatFlags]);

  // Roll up flag_type → semantic kind so the user can quickly pick
  // "Sanctioned" vs "Detained" vs "Watchlist" without thinking about
  // raw backend strings.
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
    for (const r of flatFlags) {
      if (r.flag.status === "resolved") continue;
      out[riskLabel(r.flag.flag_type).kind] += 1;
    }
    return out;
  }, [flatFlags]);
  const [kindFilter, setKindFilter] = useState<RiskKind | null>(null);

  const filtered = useMemo(() => {
    return flatFlags.filter((r) => {
      if (filter && r.flag.severity !== filter) return false;
      if (typeFilter && r.flag.flag_type !== typeFilter) return false;
      if (kindFilter && riskLabel(r.flag.flag_type).kind !== kindFilter) return false;
      if (statusFilter === "open" && r.flag.status === "resolved") return false;
      return true;
    });
  }, [flatFlags, filter, typeFilter, kindFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const out: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    flatFlags.forEach((r) => {
      if (r.flag.status !== "resolved") out[r.flag.severity as RiskSeverity]++;
    });
    return out;
  }, [flatFlags]);

  return (
    <InspectorShell
      breadcrumb="Risk feed"
      title={`Risk · ${filtered.length}`}
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
        {SEVERITIES.map((s) => (
          <Chip
            key={s}
            tone={s === "critical" ? "crit" : s === "high" ? "high" : s === "medium" ? "med" : "low"}
            selected={filter === s}
            onClick={() => setFilter((curr) => (curr === s ? null : s))}
          >
            {s[0].toUpperCase() + s.slice(1)} · {severityCounts[s] ?? 0}
          </Chip>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {(
          [
            { kind: "sanctioned" as const, label: "Sanctioned", icon: <Scale size={11} /> },
            { kind: "detained" as const, label: "Detained", icon: <Anchor size={11} /> },
            { kind: "watchlist" as const, label: "Watchlist", icon: <ShieldAlert size={11} /> },
            { kind: "high_risk_flag" as const, label: "High-risk flag", icon: null },
            { kind: "identity_conflict" as const, label: "Identity conflict", icon: null },
            { kind: "news" as const, label: "Adverse news", icon: null },
          ] as { kind: RiskKind; label: string; icon: React.ReactNode }[]
        ).map((k) => (
          <Chip key={k.kind} selected={kindFilter === k.kind} onClick={() => setKindFilter((curr) => (curr === k.kind ? null : k.kind))}>
            {k.icon}
            <span>{k.label}</span>
            <span style={{ opacity: 0.6, marginLeft: 2 }}>· {kindCounts[k.kind] ?? 0}</span>
          </Chip>
        ))}
      </div>
      {flagTypes.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary className="t-caption" style={{ cursor: "pointer" }}>Filter by raw flag type</summary>
          <div className="row" style={{ flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {flagTypes.map((t) => (
              <Chip key={t} selected={typeFilter === t} onClick={() => setTypeFilter((curr) => (curr === t ? null : t))}>
                {t}
              </Chip>
            ))}
          </div>
        </details>
      )}
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
          title={flatFlags.length === 0 ? "No risk flags loaded" : "No risk flags match these filters"}
          body={
            flatFlags.length === 0
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

      <div className="col" style={{ marginTop: 12, gap: 6 }}>
        {filtered.map((r) => (
          <RiskCard
            key={r.flag.id}
            flag={r.flag}
            subject={r.subject}
            onOpenSubject={() => {
              // Remember we came from /risk so the destination inspector
              // can render a "Back to Risk feed" affordance (bug #9 —
              // the user shouldn't lose the risk context).
              try { sessionStorage.setItem("seam:return-to-risk", "1"); } catch { /* ignore */ }
              if (r.vesselId != null) {
                const v = state.vessels.find((x) => x.vessel_id === r.vesselId);
                if (v) requestMapCenter({ lng: v.longitude, lat: v.latitude, zoom: 8 });
                navigateTo(`/vessels/${r.vesselId}`);
              } else if (r.entityId != null) {
                navigateTo(`/entities/${r.entityId}`);
              }
            }}
          />
        ))}
      </div>
    </InspectorShell>
  );
}
