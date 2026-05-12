import { Building2, Database, Map as MapIcon, Network, Newspaper, MapPin, Route as RouteIcon, Scale, ShieldAlert, Ship, TableProperties } from "lucide-react";
import { Tooltip } from "../primitives/Tooltip";
import { usePanelState } from "../../state/AppState";
import type { RouteState } from "../../types";
import { useRoute } from "../../hooks/useRoute";

type NavItem = { label: string; href: string; icon: typeof Ship; matches: (r: RouteState) => boolean };

const MAIN_NAV: NavItem[] = [
  { label: "Map", href: "/map", icon: MapIcon, matches: (r) => r.name === "map" },
  { label: "Vessels", href: "/vessels", icon: Ship, matches: (r) => r.name === "vessels-list" || r.name === "vessel-detail" },
  { label: "Entities", href: "/entities", icon: Building2, matches: (r) => r.name === "entities-list" || r.name === "entity-detail" },
  { label: "Ports", href: "/ports", icon: MapPin, matches: (r) => r.name === "ports" },
  { label: "Risk", href: "/risk", icon: ShieldAlert, matches: (r) => r.name === "risk" },
  { label: "News", href: "/news", icon: Newspaper, matches: (r) => r.name === "news" },
  { label: "Sanctions", href: "/sanctions", icon: Scale, matches: (r) => r.name === "sanctions" },
  { label: "Graph", href: "/graph", icon: Network, matches: (r) => r.name === "graph" },
  { label: "Schema", href: "/schema", icon: TableProperties, matches: (r) => r.name === "schema" },
];

const DEV_NAV: NavItem[] = [
  { label: "Operations", href: "/ops", icon: Database, matches: (r) => r.name === "ops" },
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
    <nav aria-label="Primary navigation" style={{ padding: isCollapsed ? "8px 8px" : "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
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
