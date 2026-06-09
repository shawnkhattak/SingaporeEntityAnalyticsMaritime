import { ExternalLink, Github, Info, Linkedin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE, loadMapVessels, runPositionsSnapshot } from "../../api";
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

const GITHUB_URL = "https://github.com/shawnkhattak/SingaporeEntityAnalyticsMaritime";
const LINKEDIN_URL = "https://www.linkedin.com/in/shawnkhattak/";

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
    <div className="map-status glass" data-tour="map-status">
      <span title="Vessels from the most recent OCEANS-X snapshot. Total in DB (including older snapshots) is shown in Operations.">
        Showing <strong>{vesselCount}</strong> {vesselCount === 1 ? "vessel" : "vessels"}{" "}
        <span className="t-muted">· {DEMO_MODE ? "Demo Snapshot Version" : "latest snapshot"}</span>
      </span>
      {DEMO_MODE && (
        <span className="demo-snapshot-badge" title="Portfolio demo data is intentionally static.">
          Demo snapshot — data captured June 2026. Live ingestion paused.
        </span>
      )}
      {DEMO_MODE && (
        <div className="map-status-links" aria-label="Portfolio links">
          <a className="github" href={GITHUB_URL} target="_blank" rel="noreferrer" title="View GitHub repository">
            <Github size={12} />
            GitHub
            <ExternalLink size={10} />
          </a>
          <a className="linkedin" href={LINKEDIN_URL} target="_blank" rel="noreferrer" title="View LinkedIn profile">
            <Linkedin size={12} />
            LinkedIn
            <ExternalLink size={10} />
          </a>
          <button
            type="button"
            className="info"
            onClick={() => window.dispatchEvent(new Event("seam:open-demo-notice"))}
            title="About this demo"
            aria-label="About this demo"
          >
            <Info size={12} />
          </button>
        </div>
      )}
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
