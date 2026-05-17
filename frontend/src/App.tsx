import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { getDevTableCounts, getHealth, loadDevState, loadMapVessels, runPositionsSnapshot } from "./api";
import { useApp, useRunningJobs, useToasts } from "./state/AppState";
import { usePoll } from "./hooks/usePoll";

// OCEANS-X positions snapshot cadence. Anything more frequent risks
// hammering the upstream API and consuming the quota.
const OCEANSX_INTERVAL_MS = 10 * 60 * 1000;

export function App() {
  const { dispatch } = useApp();
  const toasts = useToasts();
  const { running, start, finish } = useRunningJobs();

  // Global health poller (drives "backend unreachable" state).
  usePoll(
    async () => {
      try {
        await getHealth();
        dispatch({ type: "SET_BACKEND_ONLINE", online: true });
      } catch {
        dispatch({ type: "SET_BACKEND_ONLINE", online: false });
      }
    },
    15_000,
  );

  // Auto-snapshot OCEANS-X every 10 minutes. Skipped if a snapshot is
  // already running (manual or scheduled) and when the tab is hidden
  // (usePoll handles visibilitychange internally).
  usePoll(
    async () => {
      if (running["positions-snapshot"]) return;
      start("positions-snapshot");
      try {
        await runPositionsSnapshot();
        const vessels = await loadMapVessels(5000);
        dispatch({ type: "SET_VESSELS", vessels });
      } catch (error) {
        toasts.push({
          variant: "warning",
          title: "Auto-snapshot skipped",
          body: error instanceof Error ? error.message : String(error),
        });
      } finally {
        finish("positions-snapshot");
      }
    },
    OCEANSX_INTERVAL_MS,
    { immediate: false },
  );

  // Initial cold-load priming: health + dev state + table counts, so
  // every count tile renders real numbers (or a skeleton) within the
  // first second, not "—" forever.
  useEffect(() => {
    getHealth()
      .then(() => dispatch({ type: "SET_BACKEND_ONLINE", online: true }))
      .catch(() => dispatch({ type: "SET_BACKEND_ONLINE", online: false }));
    loadDevState()
      .then((dev) => {
        dispatch({ type: "SET_JOBS", jobs: dev.jobs });
        dispatch({ type: "SET_HEALTH", health: dev.health });
        if (dev.vessels?.length) dispatch({ type: "SET_VESSELS", vessels: dev.vessels });
      })
      .catch(() => undefined);
    getDevTableCounts()
      .then((counts) => dispatch({ type: "SET_TABLE_COUNTS", counts }))
      .catch(() => undefined);
  }, [dispatch]);

  return <Shell />;
}
