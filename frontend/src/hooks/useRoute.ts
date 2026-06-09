import { useEffect, useState } from "react";
import type { RouteState } from "../types";

type SeamHistoryState = {
  seamDepth?: number;
};

function currentDepth(): number {
  const state = window.history.state as SeamHistoryState | null;
  return typeof state?.seamDepth === "number" ? state.seamDepth : 0;
}

function ensureHistoryState() {
  const state = window.history.state as SeamHistoryState | null;
  if (typeof state?.seamDepth === "number") return;
  window.history.replaceState({ ...(state ?? {}), seamDepth: 0 }, "", window.location.href);
}

function pushAppRoute(href: string) {
  window.history.pushState({ seamDepth: currentDepth() + 1 }, "", href);
}

function replaceAppRoute(href: string) {
  window.history.replaceState({ seamDepth: currentDepth() }, "", href);
}

function isFileRouteMode() {
  return window.location.protocol === "file:";
}

function toHistoryHref(href: string) {
  if (!isFileRouteMode()) return href;
  const url = new URL(href, window.location.href);
  const appPath = `${url.pathname}${url.search}`;
  return `${window.location.pathname}#${appPath.startsWith("/") ? appPath : `/${appPath}`}`;
}

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
  if (clean === "/risk-sanctions") return { name: "risk" };
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
  if (clean === "/about") return { name: "about" };
  return { name: "not-found", path: clean };
}

function redirectLegacyPath() {
  if (isFileRouteMode()) {
    const hashPath = window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : "";
    const [path, search = ""] = hashPath.split("?");
    if ((path.replace(/\/+$/, "") || "/") === "/risk-sanctions") {
      replaceAppRoute(toHistoryHref(`/risk${search ? `?${search}` : ""}`));
      return true;
    }
    return false;
  }
  const clean = window.location.pathname.replace(/\/+$/, "") || "/";
  if (clean !== "/risk-sanctions") return false;
  replaceAppRoute(`/risk${window.location.search}`);
  return true;
}

function currentRoute(): RouteState {
  if (isFileRouteMode()) {
    const hashPath = window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : "/map";
    const [path, search = ""] = hashPath.split("?");
    return parsePath(path, search ? `?${search}` : "");
  }
  return parsePath(window.location.pathname, window.location.search);
}

export function useRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(currentRoute);

  useEffect(() => {
    ensureHistoryState();
    if (redirectLegacyPath()) {
      setRoute(currentRoute());
    }
    function onPopState() {
      if (redirectLegacyPath()) {
        setRoute(currentRoute());
        return;
      }
      setRoute(currentRoute());
    }
    function onNav() {
      if (redirectLegacyPath()) {
        setRoute(currentRoute());
        return;
      }
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
      const samePath = isFileRouteMode()
        ? window.location.hash === `#${anchor.pathname}${anchor.search}`
        : anchor.pathname === window.location.pathname && anchor.search === window.location.search;
      event.preventDefault();
      if (!samePath) {
        pushAppRoute(toHistoryHref(anchor.href));
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
  pushAppRoute(toHistoryHref(href));
  window.dispatchEvent(new Event("seam:navigate"));
}

export function navigateBack(fallback = "/map") {
  if (currentDepth() > 0) {
    window.history.back();
    return;
  }
  replaceAppRoute(toHistoryHref(fallback));
  window.dispatchEvent(new Event("seam:navigate"));
}

export function closeInspectorRoute() {
  replaceAppRoute(toHistoryHref("/map"));
  window.dispatchEvent(new Event("seam:navigate"));
}
