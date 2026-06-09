import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { closeInspectorRoute, useRoute } from "../hooks/useRoute";
import { useHotkey } from "../hooks/useHotkey";
import { isFullCanvas, isInspectorRoute, type RouteState } from "../types";
import { useApp, useInspectorState } from "../state/AppState";
import { ErrorBoundary } from "./primitives/ErrorBoundary";
import { ToastViewport } from "./primitives/ToastViewport";
import { CommandPalette } from "./primitives/CommandPalette";
import { CommandPanel } from "./command-panel/CommandPanel";
import { Button } from "./primitives/Button";
import { SeamBrand, SeamWordmark } from "./brand/SeamBrand";
import { ChevronRight, Home } from "lucide-react";

const VesselListInspector = lazy(() => import("./inspector/VesselListInspector").then((m) => ({ default: m.VesselListInspector })));
const VesselDetailInspector = lazy(() => import("./inspector/VesselDetailInspector").then((m) => ({ default: m.VesselDetailInspector })));
const EntityListInspector = lazy(() => import("./inspector/EntityListInspector").then((m) => ({ default: m.EntityListInspector })));
const EntityDetailInspector = lazy(() => import("./inspector/EntityDetailInspector").then((m) => ({ default: m.EntityDetailInspector })));
const PortsInspector = lazy(() => import("./inspector/PortsInspector").then((m) => ({ default: m.PortsInspector })));
const RiskFeedInspector = lazy(() => import("./inspector/RiskFeedInspector").then((m) => ({ default: m.RiskFeedInspector })));
const NewsInspector = lazy(() => import("./inspector/NewsInspector").then((m) => ({ default: m.NewsInspector })));
const EvidenceInspector = lazy(() => import("./inspector/EvidenceInspector").then((m) => ({ default: m.EvidenceInspector })));

const MapCanvas = lazy(() => import("./map/MapCanvas").then((m) => ({ default: m.MapCanvas })));
const SchemaCanvas = lazy(() => import("./canvas/SchemaCanvas").then((m) => ({ default: m.SchemaCanvas })));
const OpsConsole = lazy(() => import("./canvas/OpsConsole").then((m) => ({ default: m.OpsConsole })));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage").then((m) => ({ default: m.RoadmapPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const DataBrowserPage = lazy(() => import("./pages/DataBrowserPage").then((m) => ({ default: m.DataBrowserPage })));

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
    case "evidence":
      return <EvidenceInspector id={route.id} />;
    default:
      return null;
  }
}

function inspectorKey(route: RouteState): string {
  switch (route.name) {
    case "vessel-detail":
      return `vessel-${route.id}`;
    case "entity-detail":
      return `entity-${route.id}`;
    case "evidence":
      return `evidence-${route.id}`;
    default:
      return route.name;
  }
}

function renderFullCanvas(route: RouteState) {
  switch (route.name) {
    case "schema":
      return <SchemaCanvas />;
    case "ops":
      return <OpsConsole />;
    case "data-browser":
      return <DataBrowserPage table={route.table} />;
    case "roadmap":
      return <RoadmapPage />;
    case "about":
      return <AboutPage />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
    default:
      return null;
  }
}

function truncateRouteLabel(value: string, max = 34) {
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function titleForRoute(route: RouteState, state: ReturnType<typeof useApp>["state"]) {
  switch (route.name) {
    case "vessels-list": return "Vessels";
    case "vessel-detail": return truncateRouteLabel(state.vesselLabels[route.id] ?? `Vessel #${route.id}`, 42);
    case "entities-list": return "Entities";
    case "entity-detail": return truncateRouteLabel(state.entityLabels[route.id] ?? `Entity #${route.id}`, 42);
    case "ports": return "Ports";
    case "risk": return "Risk & Sanctions";
    case "news": return "News";
    case "evidence": return `Evidence #${route.id}`;
    case "schema": return "Schema";
    case "ops": return "Operations";
    case "data-browser": return route.table;
    case "roadmap": return "Roadmap";
    case "about": return "About";
    case "not-found": return "Page not found";
    case "map":
    default: return "Map";
  }
}

export function Shell() {
  const route = useRoute();
  const { state, dispatch } = useApp();
  const inspector = useInspectorState();
  const { open: openInspector, close: closeInspector } = inspector;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [focusTransition, setFocusTransition] = useState<"map-to-workspace" | "workspace-to-map" | null>(null);
  const previousFocusMode = useRef<"map" | "workspace" | null>(null);

  const inspectorVisible = isInspectorRoute(route);
  const fullCanvas = isFullCanvas(route);
  const focusMode = fullCanvas ? "workspace" : "map";
  const [renderedInspectorRoute, setRenderedInspectorRoute] = useState<RouteState | null>(() => (inspectorVisible ? route : null));
  const [inspectorExiting, setInspectorExiting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setBooting(false), 760);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const previous = previousFocusMode.current;
    previousFocusMode.current = focusMode;
    if (!previous || previous === focusMode) return;
    setFocusTransition(previous === "map" ? "map-to-workspace" : "workspace-to-map");
    const timeout = window.setTimeout(() => setFocusTransition(null), 520);
    return () => window.clearTimeout(timeout);
  }, [focusMode]);

  useEffect(() => {
    if (inspectorVisible) openInspector();
    else closeInspector();
  }, [inspectorVisible, openInspector, closeInspector]);

  useEffect(() => {
    if (inspectorVisible) {
      setRenderedInspectorRoute(route);
      setInspectorExiting(false);
      return;
    }
    if (!renderedInspectorRoute) return;
    setInspectorExiting(true);
    const timeout = window.setTimeout(() => {
      setRenderedInspectorRoute(null);
      setInspectorExiting(false);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [inspectorVisible, route, renderedInspectorRoute]);

  useEffect(() => {
    if (route.name === "map" && state.selected) {
      dispatch({ type: "CLEAR_SELECTION" });
    }
  }, [route.name, state.selected, dispatch]);

  // Auto-collapse fires AT MOST ONCE per session. After the first
  // inspector or full-canvas route opens, we set
  // `autoCollapsedThisSession` and never preempt the user's panel
  // intent again — fixes bug #6 where the panel collapsed on every
  // navigation.
  useEffect(() => {
    const shouldBeCollapsed = inspectorVisible || fullCanvas;
    if (
      shouldBeCollapsed &&
      !state.isPanelCollapsed &&
      !state.panelManuallyExpanded &&
      !state.autoCollapsedThisSession
    ) {
      dispatch({ type: "SET_PANEL_COLLAPSED", collapsed: true });
      dispatch({ type: "MARK_AUTO_COLLAPSED" });
      try { sessionStorage.setItem("seam:auto-collapsed", "1"); } catch { /* ignore */ }
    }
  }, [inspectorVisible, fullCanvas, state.isPanelCollapsed, state.panelManuallyExpanded, state.autoCollapsedThisSession, dispatch]);

  // Browser tab title per route (bug #21).
  useEffect(() => {
    const base = "SEAM";
    const label = titleForRoute(route, state);
    document.title = `${label} · ${base}`;
  }, [route, state]);

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
      closeInspectorRoute();
    }
  });

  const shellClass = [
    "shell",
    state.backendOnline ? "" : "offline",
    state.isPanelCollapsed ? "panel-collapsed" : "panel-expanded",
    `mode-${focusMode}-focus`,
    focusTransition ? `focus-transition ${focusTransition}` : "",
  ].filter(Boolean).join(" ");
  const breadcrumbLeft = useMemo(() => {
    const panelRight = state.isPanelCollapsed ? 84 : 320;
    if (!inspectorVisible) return panelRight;
    return panelRight + state.inspectorWidth + 16;
  }, [inspectorVisible, state.inspectorWidth, state.isPanelCollapsed]);

  return (
    <div className={shellClass}>
      <DesktopGate />
      {booting && <SeamLoadingOverlay />}
      {focusTransition && <FocusTransitionOverlay direction={focusTransition} />}
      {!fullCanvas && (
        <ErrorBoundary
          fallback={
            <div className="map-canvas" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
              <div className="panel-solid" style={{ padding: 18, maxWidth: 420 }}>
                <strong>Map failed to initialize.</strong>
                <div className="t-sm" style={{ marginTop: 6 }}>
                  Open the browser dev tools console — MapLibre should have logged the underlying error. Common causes: blocked tile CDN, or the map style spec rejected by MapLibre.
                </div>
              </div>
            </div>
          }
        >
          <Suspense fallback={<MapLoadingFallback />}>
            <MapCanvas />
          </Suspense>
        </ErrorBoundary>
      )}
      <CommandPanel />
      {!fullCanvas && <MapBreadcrumbs route={route} left={breadcrumbLeft} />}
      {fullCanvas ? (
        <FullCanvas routeKey={fullCanvasScrollKey(route)} key={`canvas-${route.name}`}>
          <ErrorBoundary>
            <Suspense fallback={<WorkspaceLoadingFallback />}>{renderFullCanvas(route)}</Suspense>
          </ErrorBoundary>
        </FullCanvas>
      ) : renderedInspectorRoute ? (
        <div className={inspectorExiting ? "inspector-exiting" : undefined}>
          <ErrorBoundary key={inspectorKey(renderedInspectorRoute)}>
            <Suspense fallback={<InspectorLoadingFallback />}>{renderInspector(renderedInspectorRoute)}</Suspense>
          </ErrorBoundary>
        </div>
      ) : null}
      <ToastViewport />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function mapBreadcrumbItems(route: RouteState, state: ReturnType<typeof useApp>["state"]): BreadcrumbItem[] {
  const root: BreadcrumbItem = { label: "Map", href: "/map" };
  const vesselLabel = (id: number) => truncateRouteLabel(state.vesselLabels[id] ?? `Vessel #${id}`);
  const entityLabel = (id: number) => truncateRouteLabel(state.entityLabels[id] ?? `Entity #${id}`);
  switch (route.name) {
    case "map":
      return [{ label: "Map" }];
    case "vessels-list":
      return [root, { label: "Vessels" }];
    case "vessel-detail":
      return [
        root,
        route.from === "risk" ? { label: "Risk & Sanctions", href: "/risk" } : { label: "Vessels", href: "/vessels" },
        { label: vesselLabel(route.id) },
      ];
    case "entities-list":
      return [root, { label: "Entities" }];
    case "entity-detail":
      return [
        root,
        route.from === "risk" ? { label: "Risk & Sanctions", href: "/risk" } : { label: "Entities", href: "/entities" },
        { label: entityLabel(route.id) },
      ];
    case "ports":
      return [root, { label: "Ports" }];
    case "risk":
      return [root, { label: "Risk & Sanctions" }];
    case "news":
      return [root, { label: "News" }];
    case "evidence":
      return [root, { label: `Evidence #${route.id}` }];
    default:
      return [root];
  }
}

function MapBreadcrumbs({ route, left }: { route: RouteState; left: number }) {
  const { state } = useApp();
  const items = mapBreadcrumbItems(route, state);
  return (
    <nav
      className="map-breadcrumbs"
      aria-label="Workspace breadcrumb"
      style={{ left, maxWidth: `calc(100vw - ${left + 32}px)` }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="map-breadcrumb-segment">
            {index === 0 && <Home size={12} aria-hidden="true" />}
            {item.href && !isLast ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
            )}
            {!isLast && <ChevronRight size={12} className="map-breadcrumb-chevron" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}

function SeamLoaderMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`seam-loader-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <span className="seam-loader-ring ring-one" />
      <span className="seam-loader-ring ring-two" />
      <span className="seam-loader-sweep" />
      <span className="seam-loader-core"><SeamWordmark size={compact ? "sm" : "md"} /></span>
    </div>
  );
}

function SeamLoadingOverlay() {
  return (
    <div className="app-loading-overlay" role="status" aria-live="polite" aria-label="Loading SEAM">
      <SeamLoaderMark />
      <div className="app-loading-copy">
        <strong><SeamWordmark size="md" /></strong>
        <span>Bringing the maritime picture online</span>
      </div>
    </div>
  );
}

function FocusTransitionOverlay({ direction }: { direction: "map-to-workspace" | "workspace-to-map" }) {
  return (
    <div className={`focus-transition-overlay ${direction}`} aria-hidden="true">
      <div className="focus-transition-beam" />
    </div>
  );
}

function MapLoadingFallback() {
  return (
    <div className="map-canvas map-loading-surface">
      <SeamLoaderMark />
      <span className="t-sm">Loading live map</span>
    </div>
  );
}

function WorkspaceLoadingFallback() {
  return (
    <div className="workspace-loading-surface" role="status" aria-label="Loading workspace">
      <SeamLoaderMark compact />
      <span>Loading workspace</span>
    </div>
  );
}

function InspectorLoadingFallback() {
  return (
    <div className="inspector panel inspector-loading">
      <SeamLoaderMark compact />
      <span>Loading panel</span>
    </div>
  );
}

function DesktopGate() {
  return (
    <div className="desktop-gate">
      <div className="desktop-gate-card">
        <div className="desktop-gate-mark"><SeamBrand size="lg" stacked animated showTagline /></div>
        <h1>Desktop required</h1>
        <p>SEAM is optimized for desktop. Please open this app on a desktop or laptop for the best experience.</p>
      </div>
    </div>
  );
}

const fullCanvasScroll = new Map<string, number>();

function fullCanvasScrollKey(route: RouteState): string {
  return route.name === "data-browser" ? `data-browser:${route.table}` : route.name;
}

function FullCanvas({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = fullCanvasScroll.get(routeKey) ?? 0;
    let raf = 0;
    let tries = 0;
    function restore() {
      if (!el) return;
      el.scrollTop = target;
      if (el.scrollTop !== target && tries < 20) {
        tries += 1;
        raf = requestAnimationFrame(restore);
      }
    }
    restore();
    function onScroll() {
      if (!el) return;
      fullCanvasScroll.set(routeKey, el.scrollTop);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (el) {
        fullCanvasScroll.set(routeKey, el.scrollTop);
        el.removeEventListener("scroll", onScroll);
      }
    };
  }, [routeKey]);

  return (
    <div ref={ref} className="fullcanvas" data-tour="workspace">
      {children}
    </div>
  );
}

function NotFoundPage({ path }: { path: string }) {
  return (
    <div className="not-found-page panel-solid">
      <div className="t-caption">404</div>
      <h1 className="t-h1" style={{ margin: "6px 0" }}>Page not found</h1>
      <p className="t-sm" style={{ margin: "0 0 14px" }}>
        No SEAM workspace exists at <span className="mono">{path}</span>.
      </p>
      <Button variant="primary" onClick={() => { window.history.pushState({}, "", "/map"); window.dispatchEvent(new Event("seam:navigate")); }}>
        Back to map
      </Button>
    </div>
  );
}
