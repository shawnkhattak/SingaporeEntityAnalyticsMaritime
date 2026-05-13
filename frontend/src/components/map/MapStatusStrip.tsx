import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { runPositionsSnapshot } from "../../api";
import { useApp, useRunningJobs } from "../../state/AppState";
import { formatRelative } from "../../format";

type MapStatusStripProps = {
  vesselCount: number;
  runJob: <T>(
    slug: string,
    run: () => Promise<T>,
    messages: { successTitle: string; errorTitle: string; successBody?: (result: T) => string | undefined },
  ) => Promise<T | null>;
};

export function MapStatusStrip({ vesselCount, runJob }: MapStatusStripProps) {
  const { state } = useApp();
  const { isRunning } = useRunningJobs();
  const newest = useMemo(() => state.vessels[0]?.position_timestamp ?? null, [state.vessels]);
  const totalRisk = useMemo(() => {
    let n = 0;
    for (const list of Object.values(state.riskByVessel)) {
      n += list.filter((f) => f.status !== "resolved").length;
    }
    return n;
  }, [state.riskByVessel]);

  return (
    <div className="map-status glass" style={{ left: "50%", transform: "translateX(-50%)" }}>
      <span>
        Showing <strong>{vesselCount}</strong> {vesselCount === 1 ? "vessel" : "vessels"}
      </span>
      <span className="t-muted" style={{ fontSize: 11 }}>·</span>
      <span className="t-muted" style={{ fontSize: 11 }}>last refresh {formatRelative(newest)}</span>
      <button
        type="button"
        className="btn ghost icon sm"
        onClick={() =>
          runJob("positions-snapshot", runPositionsSnapshot, {
            successTitle: "Positions snapshot complete",
            errorTitle: "Snapshot failed",
          })
        }
        disabled={isRunning("positions-snapshot")}
        aria-label="Refresh positions"
        title="Refresh positions"
      >
        <RefreshCw size={12} />
      </button>
      {totalRisk > 0 && (
        <>
          <span className="t-muted" style={{ fontSize: 11 }}>·</span>
          <span className="pill med">{totalRisk} active risk flag{totalRisk === 1 ? "" : "s"}</span>
        </>
      )}
    </div>
  );
}
