import { Activity } from "lucide-react";
import { navigateTo } from "../../hooks/useRoute";
import { useApp } from "../../state/AppState";
import { Avatar } from "../primitives/Avatar";
import { formatDate } from "../../format";

export function FooterStrip() {
  const { state } = useApp();
  const latest = state.health[0];
  const online = state.backendOnline;
  return (
    <button
      type="button"
      className="row"
      onClick={() => navigateTo("/operations")}
      style={{
        width: "100%",
        padding: "10px 12px",
        gap: 8,
        background: "transparent",
        border: 0,
        borderTop: "1px solid var(--gray-200)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span className={`dot-status ${online ? "ok" : "fail"}`} aria-hidden="true" />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{online ? "Backend OK" : "Backend unreachable"}</div>
        <div className="t-faded" style={{ fontSize: 10 }}>
          {latest ? `${latest.source} · ${formatDate(latest.last_checked_at)}` : "No health rows yet"}
        </div>
      </div>
      <Activity size={14} color="var(--slate-500)" />
      <Avatar label="Analyst" size="sm" />
    </button>
  );
}
