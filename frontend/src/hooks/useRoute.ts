import { useEffect, useState } from "react";
import type { RouteState } from "../types";

function parsePath(path: string, search: string): RouteState {
  const clean = path.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  const from = params.get("from") === "risk" ? "risk" : undefined;
  if (clean === "/" || clean === "/map") return { name: "map" };
  if (clean === "/vessels") return { name: "vessels-list" };
  if (clean.startsWith("/vessels/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "vessel-detail", id, from } : { name: "vessels-list" };
  }
  if (clean === "/entities") return { name: "entities-list" };
  if (clean.startsWith("/entities/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "entity-detail", id, from } : { name: "entities-list" };
  }
  if (clean === "/ports") return { name: "ports" };
  if (clean === "/risk") return { name: "risk" };
  if (clean === "/news") return { name: "news" };
  if (clean === "/sanctions") return { name: "risk" };
  if (clean.startsWith("/evidence/")) {
    const id = Number(clean.split("/")[2]);
    return Number.isInteger(id) ? { name: "evidence", id } : { name: "map" };
  }
  if (clean === "/schema") return { name: "schema" };
  if (clean === "/operations" || clean === "/ops" || clean === "/dev") return { name: "ops" };
  if (clean.startsWith("/data/")) {
    const table = decodeURIComponent(clean.split("/")[2] ?? "");
    return table ? { name: "data-browser", table } : { name: "ops" };
  }
  if (clean === "/roadmap") return { name: "roadmap" };
  return { name: "not-found", path: clean };
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
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external") return;
      if (anchor.origin !== window.location.origin) return;
      const samePath = anchor.pathname === window.location.pathname && anchor.search === window.location.search;
      event.preventDefault();
      if (!samePath) {
        window.history.pushState({}, "", anchor.href);
      }
      // Dispatch a global event so every useRoute instance updates, not just this one.
      window.dispatchEvent(new Event("seam:navigate"));
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

export function closeInspectorRoute() {
  window.history.replaceState({}, "", "/map");
  window.dispatchEvent(new Event("seam:navigate"));
}
