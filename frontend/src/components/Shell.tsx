import { Anchor, Building2, Database, Map, Network, Route, Ship, TableProperties } from "lucide-react";
import type { ReactNode } from "react";
import { apiBaseUrl } from "../api";

const navItems = [
  { href: "/dev", label: "Dev", icon: Database },
  { href: "/map", label: "Map", icon: Map },
  { href: "/vessels", label: "Vessels", icon: Ship },
  { href: "/entities", label: "Entities", icon: Building2 },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/schema", label: "Schema", icon: TableProperties },
  { href: "/roadmap", label: "Roadmap", icon: Route },
];

type ShellProps = {
  path: string;
  children: ReactNode;
};

export function Shell({ path, children }: ShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/dev">
          <Anchor aria-hidden="true" size={24} strokeWidth={1.9} />
          <span>SEAM V2</span>
        </a>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.href || (item.href !== "/dev" && path.startsWith(`${item.href}/`));
            return (
              <a className={isActive ? "active" : ""} href={item.href} key={item.href}>
                <Icon aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>
      {children}
      <footer>
        Backend health endpoint: <a href={`${apiBaseUrl}/api/health`}>{apiBaseUrl}/api/health</a>
      </footer>
    </main>
  );
}
