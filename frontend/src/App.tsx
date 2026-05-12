import { lazy, Suspense, useEffect, useState } from "react";
import { DevPage } from "./components/DevPage";
import { EntityPage } from "./components/EntityPage";
import { RoadmapPage } from "./components/RoadmapPage";
import { Shell } from "./components/Shell";
import { VesselDetailPage } from "./components/VesselDetailPage";
import { VesselSearchPage } from "./components/VesselSearchPage";

const GraphPage = lazy(() => import("./components/GraphPage").then((module) => ({ default: module.GraphPage })));
const MapPage = lazy(() => import("./components/MapPage").then((module) => ({ default: module.MapPage })));
const SchemaPage = lazy(() => import("./components/SchemaPage").then((module) => ({ default: module.SchemaPage })));

function currentPath() {
  return window.location.pathname;
}

export function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || anchor.target || anchor.origin !== window.location.origin) {
        return;
      }
      event.preventDefault();
      window.history.pushState({}, "", anchor.href);
      setPath(currentPath());
    }

    function onPopState() {
      setPath(currentPath());
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <Shell path={path}>
      <Suspense fallback={<p className="status-message">Loading page.</p>}>{renderPage(path)}</Suspense>
    </Shell>
  );
}

function renderPage(path: string) {
  if (path === "/" || path === "/dev") {
    return <DevPage />;
  }
  if (path === "/map") {
    return <MapPage />;
  }
  if (path === "/vessels") {
    return <VesselSearchPage />;
  }
  if (path.startsWith("/vessels/")) {
    const vesselId = Number(path.split("/")[2]);
    return Number.isInteger(vesselId) ? <VesselDetailPage vesselId={vesselId} /> : <VesselSearchPage />;
  }
  if (path === "/graph") {
    return <GraphPage />;
  }
  if (path === "/entities" || path.startsWith("/entities/")) {
    const entityId = path.startsWith("/entities/") ? Number(path.split("/")[2]) : undefined;
    return <EntityPage entityId={Number.isInteger(entityId) ? entityId : undefined} />;
  }
  if (path === "/schema") {
    return <SchemaPage />;
  }
  if (path === "/roadmap") {
    return <RoadmapPage />;
  }
  return <DevPage />;
}
