import { lazy, Suspense, useEffect, useState } from "react";
import { useRoute } from "../hooks/useRoute";
import { useHotkey } from "../hooks/useHotkey";
import { isFullCanvas, isInspectorRoute, type RouteState } from "../types";
import { useApp, useInspectorState } from "../state/AppState";
import { ToastViewport } from "./primitives/ToastViewport";
import { CommandPalette } from "./primitives/CommandPalette";
import { CommandPanel } from "./command-panel/CommandPanel";
import { MapCanvas } from "./map/MapCanvas";

const VesselListInspector = lazy(() => import("./inspector/VesselListInspector").then((m) => ({ default: m.VesselListInspector })));
const VesselDetailInspector = lazy(() => import("./inspector/VesselDetailInspector").then((m) => ({ default: m.VesselDetailInspector })));
const EntityListInspector = lazy(() => import("./inspector/EntityListInspector").then((m) => ({ default: m.EntityListInspector })));
const EntityDetailInspector = lazy(() => import("./inspector/EntityDetailInspector").then((m) => ({ default: m.EntityDetailInspector })));
const PortsInspector = lazy(() => import("./inspector/PortsInspector").then((m) => ({ default: m.PortsInspector })));
const RiskFeedInspector = lazy(() => import("./inspector/RiskFeedInspector").then((m) => ({ default: m.RiskFeedInspector })));
const NewsInspector = lazy(() => import("./inspector/NewsInspector").then((m) => ({ default: m.NewsInspector })));
const SanctionsInspector = lazy(() => import("./inspector/SanctionsInspector").then((m) => ({ default: m.SanctionsInspector })));
const EvidenceInspector = lazy(() => import("./inspector/EvidenceInspector").then((m) => ({ default: m.EvidenceInspector })));

const GraphCanvas = lazy(() => import("./canvas/GraphCanvas").then((m) => ({ default: m.GraphCanvas })));
const SchemaCanvas = lazy(() => import("./canvas/SchemaCanvas").then((m) => ({ default: m.SchemaCanvas })));
const OpsConsole = lazy(() => import("./canvas/OpsConsole").then((m) => ({ default: m.OpsConsole })));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage").then((m) => ({ default: m.RoadmapPage })));

function renderInspector(route: RouteState) {
  switch (route.name) {
    case "vessels-list":
      return <VesselListInspector />;
    case "vessel-detail":
      return <VesselDetailInspector id={route.id} />;
    case "entities-list":
      return <EntityListInspector />;
    case "entity-detail":
      return <EntityDetailInspector id={route.id} />;
    case "ports":
      return <PortsInspector />;
    case "risk":
      return <RiskFeedInspector />;
    case "news":
      return <NewsInspector />;
    case "sanctions":
      return <SanctionsInspector />;
    case "evidence":
      return <EvidenceInspector id={route.id} />;
    default:
      return null;
  }
}

function renderFullCanvas(route: RouteState) {
  switch (route.name) {
    case "graph":
      return <GraphCanvas subject={route.subject} />;
    case "schema":
      return <SchemaCanvas />;
    case "ops":
      return <OpsConsole />;
    case "roadmap":
      return <RoadmapPage />;
    default:
      return null;
  }
}

export function Shell() {
  const route = useRoute();
  const { state, dispatch } = useApp();
  const inspector = useInspectorState();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const inspectorVisible = isInspectorRoute(route);
  const fullCanvas = isFullCanvas(route);

  useEffect(() => {
    if (inspectorVisible) inspector.open();
    else inspector.close();
  }, [inspectorVisible, inspector]);

  // Auto-collapse the panel when an inspector or full canvas is showing,
  // unless the user has manually expanded.
  useEffect(() => {
    const shouldBeCollapsed = inspectorVisible || fullCanvas;
    if (shouldBeCollapsed && !state.isPanelCollapsed && !state.panelManuallyExpanded) {
      dispatch({ type: "SET_PANEL_COLLAPSED", collapsed: true });
    }
  }, [inspectorVisible, fullCanvas, state.isPanelCollapsed, state.panelManuallyExpanded, dispatch]);

  useHotkey("mod+k", (e) => {
    e.preventDefault();
    setPaletteOpen(true);
  });
  useHotkey("/", (e) => {
    e.preventDefault();
    const el = document.getElementById("global-search-input");
    if (el instanceof HTMLInputElement) el.focus();
  });
  useHotkey("Escape", () => {
    if (paletteOpen) {
      setPaletteOpen(false);
      return;
    }
    if (state.toasts.length > 0) {
      dispatch({ type: "DISMISS_TOAST", id: state.toasts[state.toasts.length - 1].id });
      return;
    }
    if (inspectorVisible) {
      window.history.back();
    }
  });

  return (
    <div className={`shell ${state.backendOnline ? "" : "offline"}`}>
      {!fullCanvas && <MapCanvas />}
      <CommandPanel />
      {fullCanvas ? (
        <div className="fullcanvas">
          <Suspense fallback={<div className="t-muted">Loading…</div>}>{renderFullCanvas(route)}</Suspense>
        </div>
      ) : inspectorVisible ? (
        <Suspense fallback={null}>{renderInspector(route)}</Suspense>
      ) : null}
      <ToastViewport />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
