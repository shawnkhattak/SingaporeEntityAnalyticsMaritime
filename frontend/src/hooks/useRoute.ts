import { useEffect, useState } from "react";
import type { RouteState } from "../types";

function parsePath(path: string, search: string): RouteState {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "/map") return { name: "map" };
  if (clean === "/vessels") return { name: "vessels-list" };
  if (clean.startsWith("/vessels/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "vessel-detail", id } : { name: "vessels-list" };
  }
  if (clean === "/entities") return { name: "entities-list" };
  if (clean.startsWith("/entities/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "entity-detail", id } : { name: "entities-list" };
  }
  if (clean === "/ports") return { name: "ports" };
  if (clean === "/risk") return { name: "risk" };
  if (clean === "/news") return { name: "news" };
  if (clean === "/sanctions") return { name: "sanctions" };
  if (clean.startsWith("/evidence/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "evidence", id } : { name: "map" };
  }
  if (clean === "/graph") {
    const params = new URLSearchParams(search);
    const type = params.get("subject");
    const id = Number(params.get("id"));
    if ((type === "vessel" || type === "entity") && Number.isInteger(id)) {
      return { name: "graph", subject: { type, id } };
    }
    return { name: "graph" };
  }
  if (clean === "/schema") return { name: "schema" };
  if (clean === "/ops" || clean === "/dev") return { name: "ops" };
  if (clean === "/roadmap") return { name: "roadmap" };
  return { name: "map" };
}

function currentRoute(): RouteState {
  return parsePath(window.location.pathname, window.location.search);
}

export function useRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(currentRoute);

  useEffect(() => {
    function onPopState() {
      setRoute(currentRoute());
    }
    function onNav() {
      setRoute(currentRoute());
    }
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external") return;
      if (anchor.origin !== window.location.origin) return;
      event.preventDefault();
      window.history.pushState({}, "", anchor.href);
      onNav();
    }
    window.addEventListener("popstate", onPopState);
    window.addEventListener("seam:navigate", onNav as EventListener);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("seam:navigate", onNav as EventListener);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return route;
}

export function navigateTo(href: string) {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new Event("seam:navigate"));
}
