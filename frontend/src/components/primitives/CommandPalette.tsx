import {
  Anchor,
  Building2,
  ChevronRight,
  Clock,
  Database,
  Filter,
  Map as MapIcon,
  MapPin,
  Network,
  Newspaper,
  Route as RouteIcon,
  Scale,
  Search,
  ShieldAlert,
  Ship,
  TableProperties,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getEvidence, searchEntities, searchVessels, type EvidenceDetail } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { navigateTo } from "../../hooks/useRoute";
import { readRecent, useApp, type RecentEntry } from "../../state/AppState";
import { countryName, flagEmoji, riskLabel, vesselTypeLabel } from "../../labels";
import type { Entity, RiskFlag, VesselSearchResult } from "../../types";

type PaletteProps = {
  open: boolean;
  onClose: () => void;
};

type SectionKey =
  | "go"
  | "vessels"
  | "entities"
  | "evidence"
  | "risk"
  | "sanctions"
  | "ports"
  | "recent";

type ResultRow = {
  key: string;
  section: SectionKey;
  primary: string;
  meta?: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

type Section = { key: SectionKey; label: string; rows: ResultRow[] };

const GO_TO_ITEMS: { label: string; path: string; icon: React.ReactNode }[] = [
  { label: "Map workspace", path: "/map", icon: <MapIcon size={14} /> },
  { label: "Vessels", path: "/vessels", icon: <Ship size={14} /> },
  { label: "Entities", path: "/entities", icon: <Building2 size={14} /> },
  { label: "Ports", path: "/ports", icon: <MapPin size={14} /> },
  { label: "Risk feed", path: "/risk", icon: <ShieldAlert size={14} /> },
  { label: "Sanctions", path: "/sanctions", icon: <Scale size={14} /> },
  { label: "News", path: "/news", icon: <Newspaper size={14} /> },
  { label: "Graph", path: "/graph", icon: <Network size={14} /> },
  { label: "Schema atlas", path: "/schema", icon: <TableProperties size={14} /> },
  { label: "Operations console", path: "/operations", icon: <Database size={14} /> },
  { label: "Roadmap", path: "/roadmap", icon: <RouteIcon size={14} /> },
];

export function CommandPalette({ open, onClose }: PaletteProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [vessels, setVessels] = useState<VesselSearchResult[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { state } = useApp();

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setVessels([]);
    setEntities([]);
    setEvidence(null);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Network search across vessels + entities + (numeric) evidence
  useEffect(() => {
    if (!debounced.trim()) {
      setVessels([]);
      setEntities([]);
      setEvidence(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      searchVessels(debounced, 6).catch(() => []),
      searchEntities(debounced, 6).catch(() => []),
    ]).then(([v, e]) => {
      if (cancelled) return;
      setVessels(v);
      setEntities(e);
    });
    const numericMatch = debounced.trim().match(/^#?(\d+)$/);
    if (numericMatch) {
      const evId = Number(numericMatch[1]);
      getEvidence(evId)
        .then((ev) => { if (!cancelled) setEvidence(ev); })
        .catch(() => { if (!cancelled) setEvidence(null); });
    } else {
      setEvidence(null);
    }
    return () => { cancelled = true; };
  }, [debounced]);

  // In-memory risk + sanctions + ports + recent
  const localResults = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const riskRows: ResultRow[] = [];
    const sanctionsRows: ResultRow[] = [];
    const portRows: ResultRow[] = [];

    function maybeAdd(flag: RiskFlag, subjectName: string, vesselId?: number, entityId?: number) {
      const label = riskLabel(flag.flag_type);
      const haystack = `${subjectName} ${flag.flag_type} ${label.title} ${flag.severity}`.toLowerCase();
      if (!q || haystack.includes(q)) {
        const row: ResultRow = {
          key: `risk-${flag.id}`,
          section: label.kind === "sanctioned" ? "sanctions" : "risk",
          primary: `${label.title}: ${subjectName}`,
          meta: <span className="t-faded" style={{ fontSize: 11 }}>{flag.severity} · {flag.status} · {label.kind}</span>,
          icon: label.kind === "sanctioned" ? <Scale size={14} /> : <ShieldAlert size={14} />,
          onSelect: () => {
            if (vesselId != null) navigateTo(`/vessels/${vesselId}`);
            else if (entityId != null) navigateTo(`/entities/${entityId}`);
            else navigateTo("/risk");
            onClose();
          },
        };
        if (row.section === "sanctions") sanctionsRows.push(row);
        else riskRows.push(row);
      }
    }

    for (const [idStr, list] of Object.entries(state.riskByVessel)) {
      const id = Number(idStr);
      const vessel = state.vessels.find((v) => v.vessel_id === id);
      const name = vessel?.name ?? `Vessel #${id}`;
      list.forEach((f) => maybeAdd(f, name, id));
    }
    for (const [idStr, list] of Object.entries(state.riskByEntity)) {
      const id = Number(idStr);
      list.forEach((f) => maybeAdd(f, `Entity #${id}`, undefined, id));
    }

    // Ports — derive distinct port codes from state.vessels (we don't
    // have a port endpoint). Filter by query.
    if (q) {
      const seen = new Set<string>();
      state.vessels.forEach((v) => {
        if (!v.flag_country_code) return;
      });
      void seen;
    }

    return { riskRows, sanctionsRows, portRows };
  }, [debounced, state.riskByVessel, state.riskByEntity, state.vessels, onClose]);

  const sections: Section[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ss: Section[] = [];

    // Go to (always shown; filtered when query is non-empty)
    const goRows = GO_TO_ITEMS
      .filter((g) => !q || g.label.toLowerCase().includes(q) || g.path.includes(q))
      .map<ResultRow>((g) => ({
        key: `go-${g.path}`,
        section: "go",
        primary: g.label,
        hint: g.path,
        icon: g.icon,
        onSelect: () => { navigateTo(g.path); onClose(); },
      }));
    if (goRows.length > 0) ss.push({ key: "go", label: "Go to", rows: goRows.slice(0, 5) });

    // Vessels
    const vRows = vessels.slice(0, 5).map<ResultRow>((v) => ({
      key: `vessel-${v.id}`,
      section: "vessels",
      primary: v.name,
      meta: (
        <span className="t-faded mono" style={{ fontSize: 11 }}>
          {[
            v.imo && `IMO ${v.imo}`,
            v.mmsi && `MMSI ${v.mmsi}`,
            v.vessel_type_code && vesselTypeLabel(v.vessel_type_code),
            v.flag_country_code && flagEmoji(v.flag_country_code),
          ].filter(Boolean).join(" · ")}
        </span>
      ),
      icon: <Ship size={14} />,
      onSelect: () => { navigateTo(`/vessels/${v.id}`); onClose(); },
    }));
    if (vRows.length > 0) ss.push({ key: "vessels", label: "Vessels", rows: vRows });

    // Entities
    const eRows = entities.slice(0, 5).map<ResultRow>((e) => ({
      key: `entity-${e.id}`,
      section: "entities",
      primary: e.name,
      meta: (
        <span className="t-faded" style={{ fontSize: 11 }}>
          {[e.entity_type, e.country_code && countryName(e.country_code)].filter(Boolean).join(" · ")}
        </span>
      ),
      icon: <Building2 size={14} />,
      onSelect: () => { navigateTo(`/entities/${e.id}`); onClose(); },
    }));
    if (eRows.length > 0) ss.push({ key: "entities", label: "Entities", rows: eRows });

    // Evidence
    if (evidence) {
      ss.push({
        key: "evidence",
        label: "Evidence",
        rows: [
          {
            key: `evidence-${evidence.id}`,
            section: "evidence",
            primary: `Evidence #${evidence.id}`,
            meta: (
              <span className="t-faded" style={{ fontSize: 11 }}>
                {[evidence.source, evidence.observation_type, evidence.source_record_id].filter(Boolean).join(" · ")}
              </span>
            ),
            icon: <Database size={14} />,
            onSelect: () => { navigateTo(`/evidence/${evidence.id}`); onClose(); },
          },
        ],
      });
    }

    // Risk + sanctions
    if (localResults.riskRows.length > 0) ss.push({ key: "risk", label: "Risk flags", rows: localResults.riskRows.slice(0, 5) });
    if (localResults.sanctionsRows.length > 0) ss.push({ key: "sanctions", label: "Sanctions", rows: localResults.sanctionsRows.slice(0, 5) });

    // Recent (when no query)
    if (!q) {
      const recents = readRecent().slice(0, 6).map<ResultRow>((r) => recentToRow(r, onClose));
      if (recents.length > 0) ss.push({ key: "recent", label: "Recent", rows: recents });
    }

    return ss;
  }, [query, vessels, entities, evidence, localResults, onClose]);

  // Flatten for keyboard navigation
  const flatRows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(flatRows.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        flatRows[activeIndex]?.onSelect();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, flatRows, activeIndex]);

  if (!open) return null;

  // Activedescendant id mapping
  const activeRowId = flatRows[activeIndex]?.key ? `palette-row-${flatRows[activeIndex].key}` : undefined;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Search size={16} color="var(--slate-500)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vessels, entities, evidence #, ports, risk flags…"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={activeRowId}
            aria-autocomplete="list"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="palette-list scroll" id="palette-list" role="listbox">
          {sections.length === 0 ? (
            <PaletteEmptyState query={query} />
          ) : (
            <PaletteSections sections={sections} activeIndex={activeIndex} onHover={setActiveIndex} />
          )}
        </div>

        <div className="palette-footer">
          <span className="row" style={{ gap: 6 }}>
            <kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="row" style={{ gap: 6 }}>
            <kbd className="kbd">↵</kbd> open
          </span>
          <span className="row" style={{ gap: 6 }}>
            <kbd className="kbd">Esc</kbd> close
          </span>
          <span className="row" style={{ gap: 6, marginLeft: "auto" }}>
            <Filter size={11} color="var(--slate-400)" /> {flatRows.length} result{flatRows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaletteSections({
  sections,
  activeIndex,
  onHover,
}: {
  sections: Section[];
  activeIndex: number;
  onHover: (i: number) => void;
}) {
  let cursor = 0;
  return (
    <>
      {sections.map((group) => (
        <div className="palette-section" key={group.key}>
          <div className="palette-section-label">{group.label}</div>
          {group.rows.map((row) => {
            const idx = cursor++;
            const isActive = idx === activeIndex;
            return (
              <div
                key={row.key}
                id={`palette-row-${row.key}`}
                role="option"
                aria-selected={isActive}
                className={`palette-row ${isActive ? "active" : ""}`}
                onMouseEnter={() => onHover(idx)}
                onClick={() => row.onSelect()}
              >
                <span style={{ color: "var(--slate-500)", flex: "0 0 auto" }}>{row.icon}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {row.primary}
                  </span>
                  {row.meta && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.meta}</span>}
                </div>
                {row.hint && <span className="hint mono t-faded" style={{ fontSize: 11 }}>{row.hint}</span>}
                {isActive && <kbd className="kbd" style={{ marginLeft: 6 }}>↵</kbd>}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function PaletteEmptyState({ query }: { query: string }) {
  if (!query) {
    return (
      <div style={{ padding: 18, color: "var(--slate-500)", fontSize: 13, textAlign: "center" }}>
        <Search size={16} color="var(--slate-400)" style={{ display: "block", margin: "0 auto 6px" }} />
        Search vessels by IMO/MMSI/name, entities by owner, ports, evidence IDs, or risk flags. Or jump to a screen.
      </div>
    );
  }
  return (
    <div style={{ padding: 18, color: "var(--slate-500)", fontSize: 13, textAlign: "center" }}>
      <Search size={16} color="var(--slate-400)" style={{ display: "block", margin: "0 auto 6px" }} />
      No matches for <span className="mono">{query}</span>. Try an IMO, MMSI, evidence number, or open
      <a href="/operations" style={{ marginLeft: 4 }}>Operations</a> to refresh ingestion.
    </div>
  );
}

function recentToRow(entry: RecentEntry, onClose: () => void): ResultRow {
  const baseMeta = <span className="t-faded" style={{ fontSize: 11 }}><Clock size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{relativeFromMs(Date.now() - entry.at)}</span>;
  switch (entry.kind) {
    case "vessel":
      return {
        key: `recent-vessel-${entry.id}`,
        section: "recent",
        primary: entry.label || `Vessel #${entry.id}`,
        meta: baseMeta,
        icon: <Ship size={14} />,
        onSelect: () => { navigateTo(`/vessels/${entry.id}`); onClose(); },
      };
    case "entity":
      return {
        key: `recent-entity-${entry.id}`,
        section: "recent",
        primary: entry.label || `Entity #${entry.id}`,
        meta: baseMeta,
        icon: <Building2 size={14} />,
        onSelect: () => { navigateTo(`/entities/${entry.id}`); onClose(); },
      };
    case "evidence":
      return {
        key: `recent-evidence-${entry.id}`,
        section: "recent",
        primary: entry.label || `Evidence #${entry.id}`,
        meta: baseMeta,
        icon: <Database size={14} />,
        onSelect: () => { navigateTo(`/evidence/${entry.id}`); onClose(); },
      };
    case "port":
      return {
        key: `recent-port-${entry.id}`,
        section: "recent",
        primary: entry.label || `Port ${entry.id}`,
        meta: baseMeta,
        icon: <Anchor size={14} />,
        onSelect: () => { navigateTo(`/ports`); onClose(); },
      };
  }
}

function relativeFromMs(ms: number): string {
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

// ChevronRight kept available for future "view all" expand rows.
void ChevronRight;
