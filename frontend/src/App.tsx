import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { getHealth, runNewsLive, runPositionsSnapshot } from "./api";
import { useRoute } from "./hooks/useRoute";
import { useApp, useRunningJobs, useToasts } from "./state/AppState";
import { usePoll } from "./hooks/usePoll";

// OCEANS-X positions snapshot cadence. Anything more frequent risks
// hammering the upstream API and consuming the quota.
const OCEANSX_INTERVAL_MS = 60 * 60 * 1000;
const NEWS_RSS_INTERVAL_MS = 60 * 60 * 1000;

export function App() {
  const route = useRoute();
  const { dispatch } = useApp();
  const toasts = useToasts();
  const { running, start, finish } = useRunningJobs();
  const mapVisible = !["ops", "schema", "roadmap", "not-found"].includes(route.name);

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
    60_000,
  );

  // Auto-snapshot OCEANS-X every hour. Skipped if a snapshot is
  // already running (manual or scheduled) and when the tab is hidden
  // (usePoll handles visibilitychange internally).
  usePoll(
    async () => {
      if (running["positions-snapshot"]) return;
      start("positions-snapshot");
      try {
        await runPositionsSnapshot();
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
    { immediate: false, paused: !mapVisible },
  );

  // Refresh configured RSS.app/news feeds hourly. This keeps the News
  // page current without making the user manually pull RSS all day.
  usePoll(
    async () => {
      if (running["news"]) return;
      start("news");
      try {
        await runNewsLive();
      } finally {
        finish("news");
      }
    },
    NEWS_RSS_INTERVAL_MS,
    { immediate: false },
  );

  // Initial cold-load health check only. Operations/dev datasets are
  // loaded inside the Operations Center so /map does not poll them.
  useEffect(() => {
    getHealth()
      .then(() => dispatch({ type: "SET_BACKEND_ONLINE", online: true }))
      .catch(() => dispatch({ type: "SET_BACKEND_ONLINE", online: false }));
  }, [dispatch]);

  return <Shell />;
}
