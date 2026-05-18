import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadMapVessels, runPositionsSnapshot } from "../../api";
import { useApp, useRunningJobs } from "../../state/AppState";
import { formatRelative } from "../../format";

type MapStatusStripProps = {
  vesselCount: number;
  runJob: <T>(
    slug: string,
    run: () => Promise<T>,
    messages: {
      successTitle: string;
      errorTitle: string;
      successBody?: (result: T) => string | undefined;
      suppressSuccessToast?: boolean;
    },
  ) => Promise<T | null>;
};

export function MapStatusStrip({ vesselCount, runJob }: MapStatusStripProps) {
  const { state, dispatch } = useApp();
  const { isRunning } = useRunningJobs();
  const newest = useMemo(() => state.vessels[0]?.position_timestamp ?? null, [state.vessels]);
  const previousNewest = useRef<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const refreshing = isRunning("positions-snapshot");

  useEffect(() => {
    if (previousNewest.current === null) {
      previousNewest.current = newest;
      return;
    }
    if (newest && newest !== previousNewest.current) {
      previousNewest.current = newest;
      setJustUpdated(true);
      const timeout = window.setTimeout(() => setJustUpdated(false), 1400);
      return () => window.clearTimeout(timeout);
    }
    previousNewest.current = newest;
  }, [newest]);

  return (
    <div className="map-status glass">
      <span title="Vessels from the most recent OCEANS-X snapshot. Total in DB (including older snapshots) is shown in Operations.">
        Showing <strong>{vesselCount}</strong> {vesselCount === 1 ? "vessel" : "vessels"} <span className="t-muted">· latest snapshot</span>
      </span>
      <span className="t-muted" style={{ fontSize: 11 }}>·</span>
      <span className="t-muted" style={{ fontSize: 11 }}>last refresh {formatRelative(newest)}</span>
      <button
        type="button"
        className={`btn ghost icon sm map-refresh-button ${refreshing ? "spinning" : ""} ${justUpdated ? "updated" : ""}`}
        onClick={() =>
          runJob("positions-snapshot", async () => {
            const job = await runPositionsSnapshot();
            const vessels = await loadMapVessels(5000);
            dispatch({ type: "SET_VESSELS", vessels });
            return job;
          }, {
            successTitle: "Positions snapshot complete",
            errorTitle: "Snapshot failed",
            suppressSuccessToast: true,
          })
        }
        disabled={refreshing}
        aria-label="Refresh positions"
        title={refreshing ? "Refreshing positions" : "Refresh positions"}
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}
