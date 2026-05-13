import { Anchor, MapPin, Scale, ShieldAlert } from "lucide-react";
import { navigateTo } from "../../hooks/useRoute";
import { useStatsSnapshot } from "../../state/AppState";
import { Skeleton } from "../primitives/Skeleton";

/**
 * Floating-panel stat strip. Keys here are the canonical
 * `useStatsSnapshot` shape — every tile shows a real backend count or
 * a skeleton until the first `getDevTableCounts()` lands. Never "—"
 * forever; previously two tiles read from invented keys
 * (`sanctions_risk_flags`, `ports`) and stayed empty.
 */
export function KeyStatsStrip() {
  const stats = useStatsSnapshot();

  return (
    <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--gray-200)" }}>
      <div className="t-caption" style={{ paddingBottom: 6 }}>Live snapshot</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <StatTile
          icon={<Anchor size={11} />}
          label="Vessels"
          value={stats.vessels}
          help="Total vessels in DB"
          onClick={() => navigateTo("/vessels")}
        />
        <StatTile
          icon={<MapPin size={11} />}
          label="Port events"
          value={stats.portEvents}
          help="Ingested arrivals + departures"
          onClick={() => navigateTo("/ports")}
        />
        <StatTile
          icon={<Scale size={11} />}
          label="Sanctions"
          tone="warn"
          value={stats.sanctionsRecords}
          help="Sanctions records loaded"
          onClick={() => navigateTo("/sanctions")}
        />
        <StatTile
          icon={<ShieldAlert size={11} />}
          label="Risk flags"
          tone="risk"
          value={stats.riskFlags}
          help="Active + resolved risk flags"
          onClick={() => navigateTo("/risk")}
        />
      </div>
    </div>
  );
}

type StatTileProps = {
  icon?: React.ReactNode;
  label: string;
  value: number | null;
  tone?: "warn" | "risk";
  help?: string;
  onClick: () => void;
};

function StatTile({ icon, label, value, tone, help, onClick }: StatTileProps) {
  const color = tone === "risk" ? "var(--risk-critical)" : tone === "warn" ? "var(--risk-medium)" : "var(--navy-900)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="card lift"
      title={help}
      style={{
        textAlign: "left",
        padding: "8px 10px",
        cursor: "pointer",
        background: "var(--white)",
        border: "1px solid var(--gray-200)",
      }}
    >
      <div className="metric-label row" style={{ gap: 4 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value" style={{ color, fontSize: 18 }}>
        {value === null ? <Skeleton width={42} height={20} rounded={4} /> : formatStat(value)}
      </div>
    </button>
  );
}

function formatStat(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}
