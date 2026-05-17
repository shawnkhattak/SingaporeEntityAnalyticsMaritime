import { useEffect } from "react";
import { loadDevState } from "../../api";
import { useApp, usePanelState } from "../../state/AppState";
import { usePoll } from "../../hooks/usePoll";
import { useRoute } from "../../hooks/useRoute";
import { isFullCanvas } from "../../types";
import { BrandHeader } from "./BrandHeader";
import { GlobalSearch } from "./GlobalSearch";
import { PrimaryNav } from "./PrimaryNav";
import { MapFilters } from "./MapFilters";
import { SourceRefreshControls } from "./SourceRefreshControls";
import { FooterStrip } from "./FooterStrip";

export function CommandPanel() {
  const { isCollapsed } = usePanelState();
  const { dispatch } = useApp();
  const route = useRoute();
  const fullCanvas = isFullCanvas(route);

  // Light dev state poll — drives FooterStrip + KeyStats outside of /ops.
  // /ops itself runs a tighter cadence inside the OpsConsole.
  usePoll(
    async () => {
      try {
        const state = await loadDevState();
        dispatch({ type: "SET_JOBS", jobs: state.jobs });
        dispatch({ type: "SET_HEALTH", health: state.health });
      } catch {
        /* swallow — toasts surface critical errors elsewhere */
      }
    },
    60_000,
    { paused: route.name === "ops" },
  );

  // Initial load.
  useEffect(() => {
    if (route.name === "ops") return;
    loadDevState()
      .then((state) => {
        dispatch({ type: "SET_JOBS", jobs: state.jobs });
        dispatch({ type: "SET_HEALTH", health: state.health });
      })
      .catch(() => {
        /* ignore */
      });
  }, [dispatch, route.name]);

  return (
    <aside className={`cmd-panel panel ${isCollapsed ? "collapsed" : ""}`} aria-label="Command panel">
      <BrandHeader />
      <div className="cmd-panel-body scroll">
        {!isCollapsed && !fullCanvas && <GlobalSearch />}
        <PrimaryNav />
        {!isCollapsed && !fullCanvas && <MapFilters />}
        {!isCollapsed && <SourceRefreshControls />}
      </div>
      {!isCollapsed && <FooterStrip />}
    </aside>
  );
}
