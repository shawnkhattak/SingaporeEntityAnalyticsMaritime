import { RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVesselRiskFlags, runRiskRecompute } from "../../api";
import { useApp, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { Chip } from "../primitives/Chip";
import { EmptyState } from "../primitives/EmptyState";
import { RiskPill } from "../primitives/Pill";
import { Skeleton } from "../primitives/Skeleton";
import type { RiskFlag, RiskSeverity } from "../../types";
import { formatDate } from "../../format";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { navigateTo } from "../../hooks/useRoute";
import { InspectorShell } from "./InspectorShell";

const SEVERITIES: RiskSeverity[] = ["critical", "high", "medium", "low"];

export function RiskFeedInspector() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<RiskSeverity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const runJob = useJobRunner();

  useEffect(() => {
    // TODO(api): replace fan-out with GET /api/risk/feed (design/wiring.md §14.1).
    const candidates = state.vessels.slice(0, 80).filter((v) => !(v.vessel_id in state.riskByVessel));
    if (candidates.length === 0) return;
    setLoading(true);
    Promise.all(
      candidates.map((v) =>
        getVesselRiskFlags(v.vessel_id)
          .then((flags) => dispatch({ type: "CACHE_VESSEL_RISK", id: v.vessel_id, flags }))
          .catch(() => undefined),
      ),
    ).finally(() => setLoading(false));
  }, [state.vessels, state.riskByVessel, dispatch]);

  const flatFlags: { flag: RiskFlag; subject: string; vesselId?: number; entityId?: number }[] = useMemo(() => {
    const out: { flag: RiskFlag; subject: string; vesselId?: number; entityId?: number }[] = [];
    for (const [idStr, list] of Object.entries(state.riskByVessel)) {
      const id = Number(idStr);
      const vessel = state.vessels.find((v) => v.vessel_id === id);
      const subject = vessel?.name ?? `Vessel #${id}`;
      list.forEach((flag) => out.push({ flag, subject, vesselId: id }));
    }
    for (const [idStr, list] of Object.entries(state.riskByEntity)) {
      const id = Number(idStr);
      list.forEach((flag) => out.push({ flag, subject: `Entity #${id}`, entityId: id }));
    }
    return out;
  }, [state.riskByVessel, state.riskByEntity, state.vessels]);

  const flagTypes = useMemo(() => Array.from(new Set(flatFlags.map((r) => r.flag.flag_type))).sort(), [flatFlags]);

  const filtered = useMemo(() => {
    return flatFlags.filter((r) => {
      if (filter && r.flag.severity !== filter) return false;
      if (typeFilter && r.flag.flag_type !== typeFilter) return false;
      if (statusFilter === "open" && r.flag.status === "resolved") return false;
      return true;
    });
  }, [flatFlags, filter, typeFilter, statusFilter]);

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
      onClose={() => window.history.back()}
      footer={
        <Button
          size="sm"
          variant="primary"
          leadingIcon={<RefreshCw size={12} />}
          onClick={() => runJob("risk-recompute", () => runRiskRecompute(), { successTitle: "Risk recompute complete", errorTitle: "Risk recompute failed" })}
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
      {flagTypes.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {flagTypes.map((t) => (
            <Chip key={t} selected={typeFilter === t} onClick={() => setTypeFilter((curr) => (curr === t ? null : t))}>
              {t}
            </Chip>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 8, fontSize: 11 }}>
        <label className="row" style={{ gap: 4 }}>
          <input type="checkbox" checked={statusFilter === "open"} onChange={(e) => setStatusFilter(e.target.checked ? "open" : "all")} />
          Open only
        </label>
      </div>

      {loading && <Skeleton height={48} style={{ marginTop: 12 }} />}
      {!loading && filtered.length === 0 && <EmptyState icon={<ShieldAlert size={20} />} title="No risk flags match" body="Try clearing filters or refreshing risk." />}

      <div className="col" style={{ marginTop: 12, gap: 6 }}>
        {filtered.map((r) => (
          <div
            key={`${r.flag.id}`}
            className={`card stripe-${r.flag.severity === "critical" ? "crit" : r.flag.severity === "high" ? "high" : r.flag.severity === "medium" ? "med" : "low"}`}
            style={{ padding: "10px 12px 10px 14px", cursor: "pointer" }}
            onClick={() => {
              if (r.vesselId != null) {
                const v = state.vessels.find((x) => x.vessel_id === r.vesselId);
                if (v) requestMapCenter({ lng: v.longitude, lat: v.latitude, zoom: 8 });
                navigateTo(`/vessels/${r.vesselId}`);
              } else if (r.entityId != null) {
                navigateTo(`/entities/${r.entityId}`);
              }
            }}
          >
            <div className="row">
              <RiskPill severity={r.flag.severity as never} />
              <strong style={{ flex: 1, marginLeft: 6 }}>{r.flag.flag_type}</strong>
              <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(r.flag.created_at)}</span>
            </div>
            <div className="t-sm" style={{ marginTop: 4 }}>{r.flag.summary}</div>
            <div className="t-faded" style={{ fontSize: 11, marginTop: 4 }}>{r.subject}</div>
          </div>
        ))}
      </div>
    </InspectorShell>
  );
}
