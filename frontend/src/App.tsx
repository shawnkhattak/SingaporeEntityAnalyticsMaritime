import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { getHealth } from "./api";
import { useApp } from "./state/AppState";
import { usePoll } from "./hooks/usePoll";

export function App() {
  const { dispatch } = useApp();

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

  // Initial health probe.
  useEffect(() => {
    getHealth()
      .then(() => dispatch({ type: "SET_BACKEND_ONLINE", online: true }))
      .catch(() => dispatch({ type: "SET_BACKEND_ONLINE", online: false }));
  }, [dispatch]);

  return <Shell />;
}
