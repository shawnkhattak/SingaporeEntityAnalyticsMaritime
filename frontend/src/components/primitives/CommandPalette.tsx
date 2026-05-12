import { ChevronRight, Database, Newspaper, Network, Scale, Search, ShieldAlert, Ship, TableProperties } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchEntities, searchVessels } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { useDebounce } from "../../hooks/useDebounce";
import type { Entity, VesselSearchResult } from "../../types";

type PaletteProps = {
  open: boolean;
  onClose: () => void;
};

type Row = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  onSelect: () => void;
};

const GO_TO: { label: string; path: string; icon: typeof Search }[] = [
  { label: "Map workspace", path: "/", icon: Search },
  { label: "Vessels", path: "/vessels", icon: Ship },
  { label: "Entities", path: "/entities", icon: Network },
  { label: "Ports", path: "/ports", icon: ChevronRight },
  { label: "Risk feed", path: "/risk", icon: ShieldAlert },
  { label: "News", path: "/news", icon: Newspaper },
  { label: "Sanctions", path: "/sanctions", icon: Scale },
  { label: "Graph", path: "/graph", icon: Network },
  { label: "Schema", path: "/schema", icon: TableProperties },
  { label: "Operations", path: "/ops", icon: Database },
  { label: "Roadmap", path: "/roadmap", icon: ChevronRight },
];

function readRecentVessels(): number[] {
  try {
    const raw = localStorage.getItem("seam:recent-vessels");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function CommandPalette({ open, onClose }: PaletteProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [vessels, setVessels] = useState<VesselSearchResult[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!debounced.trim()) {
      setVessels([]);
      setEntities([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      searchVessels(debounced, 5).catch(() => []),
      searchEntities(debounced, 5).catch(() => []),
    ]).then(([v, e]) => {
      if (cancelled) return;
      setVessels(v);
      setEntities(e);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    vessels.forEach((v) =>
      list.push({
        id: `v-${v.id}`,
        label: v.name,
        hint: v.imo ? `IMO ${v.imo}` : v.mmsi ? `MMSI ${v.mmsi}` : "",
        icon: Ship,
        onSelect: () => {
          navigateTo(`/vessels/${v.id}`);
          onClose();
        },
      }),
    );
    entities.forEach((e) =>
      list.push({
        id: `e-${e.id}`,
        label: e.name,
        hint: e.entity_type,
        icon: Network,
        onSelect: () => {
          navigateTo(`/entities/${e.id}`);
          onClose();
        },
      }),
    );
    GO_TO.filter((g) => !query || g.label.toLowerCase().includes(query.toLowerCase())).forEach((g) =>
      list.push({
        id: `go-${g.path}`,
        label: g.label,
        hint: g.path,
        icon: g.icon,
        onSelect: () => {
          navigateTo(g.path);
          onClose();
        },
      }),
    );
    if (!query) {
      const recent = readRecentVessels().slice(0, 6);
      recent.forEach((id) =>
        list.push({
          id: `recent-${id}`,
          label: `Vessel #${id}`,
          hint: "Recent",
          icon: Ship,
          onSelect: () => {
            navigateTo(`/vessels/${id}`);
            onClose();
          },
        }),
      );
    }
    return list;
  }, [vessels, entities, query, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(rows.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        rows[active]?.onSelect();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, rows, active]);

  if (!open) return null;

  const grouped: { label: string; rows: Row[] }[] = [
    { label: query ? "Results" : "Go to", rows: query ? rows.filter((r) => !r.id.startsWith("go-")) : rows.filter((r) => r.id.startsWith("go-")) },
    { label: "Recent vessels", rows: rows.filter((r) => r.id.startsWith("recent-")) },
    { label: "Navigation", rows: query ? rows.filter((r) => r.id.startsWith("go-")) : [] },
  ].filter((g) => g.rows.length > 0);

  // Track global activeIndex across all rows.
  let cursor = 0;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Search size={16} color="var(--slate-500)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search vessels, entities, ports, evidence… or jump to a screen"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-list scroll">
          {grouped.map((group) => (
            <div className="palette-section" key={group.label}>
              <div className="palette-section-label">{group.label}</div>
              {group.rows.map((row) => {
                const Icon = row.icon;
                const idx = cursor++;
                const isActive = idx === active;
                return (
                  <div
                    key={row.id}
                    className={`palette-row ${isActive ? "active" : ""}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => row.onSelect()}
                  >
                    <Icon size={14} color="var(--slate-500)" />
                    <span>{row.label}</span>
                    {row.hint && <span className="hint mono t-faded" style={{ fontSize: 11 }}>{row.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="t-faded" style={{ padding: 14, fontSize: 12 }}>
              {query ? `No results for "${query}"` : "Start typing to search."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
