import { Anchor, Building2, Database, Map as MapIcon, Newspaper, Route as RouteIcon, ShieldAlert, Ship } from "lucide-react";
import { Tooltip } from "../primitives/Tooltip";
import { usePanelState } from "../../state/AppState";
import type { RouteState } from "../../types";
import { useRoute } from "../../hooks/useRoute";

type NavItem = { label: string; href: string; icon: typeof Ship; matches: (r: RouteState) => boolean };

const MAIN_NAV: NavItem[] = [
  { label: "Map", href: "/map", icon: MapIcon, matches: (r) => r.name === "map" },
  { label: "Vessels", href: "/vessels", icon: Ship, matches: (r) => r.name === "vessels-list" || (r.name === "vessel-detail" && r.from !== "risk") },
  { label: "Entities", href: "/entities", icon: Building2, matches: (r) => r.name === "entities-list" || (r.name === "entity-detail" && r.from !== "risk") },
  { label: "Ports", href: "/ports", icon: Anchor, matches: (r) => r.name === "ports" },
  { label: "Risk & Sanctions", href: "/risk", icon: ShieldAlert, matches: (r) => r.name === "risk" || (r.name === "vessel-detail" && r.from === "risk") || (r.name === "entity-detail" && r.from === "risk") },
  { label: "News", href: "/news", icon: Newspaper, matches: (r) => r.name === "news" },
];

const DEV_NAV: NavItem[] = [
  { label: "Operations", href: "/operations", icon: Database, matches: (r) => r.name === "ops" },
  { label: "Roadmap", href: "/roadmap", icon: RouteIcon, matches: (r) => r.name === "roadmap" },
];

function NavRow({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const inner = (
    <a className={`nav ${isActive ? "active" : ""}`} href={item.href}>
      <Icon />
      {!collapsed && <span>{item.label}</span>}
    </a>
  );
  return collapsed ? <Tooltip label={item.label}>{inner}</Tooltip> : inner;
}

export function PrimaryNav() {
  const route = useRoute();
  const { isCollapsed } = usePanelState();
  return (
    <nav aria-label="Primary navigation" className={`primary-nav ${isCollapsed ? "collapsed" : ""}`}>
      {MAIN_NAV.map((item) => (
        <NavRow key={item.href} item={item} isActive={item.matches(route)} collapsed={isCollapsed} />
      ))}
      <hr className="hr" />
      {DEV_NAV.map((item) => (
        <NavRow key={item.href} item={item} isActive={item.matches(route)} collapsed={isCollapsed} />
      ))}
    </nav>
  );
}
