import { usePanelState } from "../../state/AppState";
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
  const route = useRoute();
  const fullCanvas = isFullCanvas(route);

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
