import { useMemo } from "react";
import { navigateTo } from "../../hooks/useRoute";
import { useApp } from "../../state/AppState";

export function KeyStatsStrip() {
  const { state } = useApp();
  const tracked = state.vessels.length;

  const sanctionsCount = useMemo(() => {
    let n = 0;
    for (const flags of Object.values(state.riskByVessel)) {
      n += flags.filter((f) => f.flag_type === "sanctions" && f.status !== "resolved").length;
    }
    for (const flags of Object.values(state.riskByEntity)) {
      n += flags.filter((f) => f.flag_type === "sanctions" && f.status !== "resolved").length;
    }
    return n || state.tableCounts?.sanctions_risk_flags;
  }, [state.riskByVessel, state.riskByEntity, state.tableCounts]);

  const openRisk = state.tableCounts?.risk_flags;

  // Coarse "active ports" estimate from vessel positions clustering — replaced
  // by `getPortActivity` derivation when PortsInspector caches load.
  const activePorts = state.tableCounts?.ports ?? "—";

  return (
    <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--gray-200)" }}>
      <div className="t-caption" style={{ paddingBottom: 6 }}>Live snapshot</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <StatTile label="Vessels" value={tracked} onClick={() => navigateTo("/vessels")} />
        <StatTile label="Ports" value={activePorts} onClick={() => navigateTo("/ports")} />
        <StatTile label="Sanctions" value={sanctionsCount ?? "—"} tone="warn" onClick={() => navigateTo("/sanctions")} />
        <StatTile label="Open risk" value={openRisk ?? "—"} tone="risk" onClick={() => navigateTo("/risk")} />
      </div>
    </div>
  );
}

function StatTile({ label, value, tone, onClick }: { label: string; value: number | string; tone?: "warn" | "risk"; onClick: () => void }) {
  const color = tone === "risk" ? "var(--risk-critical)" : tone === "warn" ? "var(--risk-medium)" : "var(--navy-900)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        textAlign: "left",
        padding: "8px 10px",
        cursor: "pointer",
        background: "var(--white)",
        border: "1px solid var(--gray-200)",
      }}
    >
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color, fontSize: 18 }}>{value}</div>
    </button>
  );
}
