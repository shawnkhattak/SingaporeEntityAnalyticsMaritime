import { Building2, FileText, Filter, Search, Ship } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchEntities, searchVessels } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { navigateTo } from "../../hooks/useRoute";
import { useApp, useFilters, useSelection } from "../../state/AppState";
import { buildSearchFilterActions, localVesselSearchHits, type SearchFilterAction, type SearchVesselHit } from "../../searchFilters";
import type { Entity, VesselSearchResult } from "../../types";

type Result =
  | { kind: "filter"; item: SearchFilterAction }
  | { kind: "vessel"; item: SearchVesselHit }
  | { kind: "entity"; item: Entity }
  | { kind: "evidence"; id: number };

type SearchFilter = "all" | Result["kind"];

const SEARCH_FILTERS: { value: SearchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "filter", label: "Filters" },
  { value: "vessel", label: "Vessels" },
  { value: "entity", label: "Entities" },
  { value: "evidence", label: "Evidence" },
];

export function GlobalSearch({ compact }: { compact?: boolean }) {
  const { select } = useSelection();
  const { state } = useApp();
  const { filters, setFilters } = useFilters();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [vessels, setVessels] = useState<VesselSearchResult[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setVessels([]);
      setEntities([]);
      setEvidenceId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      searchVessels(debounced, 5).catch(() => []),
      searchEntities(debounced, 5).catch(() => []),
    ]).then(([v, e]) => {
      if (cancelled) return;
      setVessels(v);
      setEntities(e);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    const match = debounced.trim().match(/^#?(\d+)$/);
    setEvidenceId(match ? Number(match[1]) : null);
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo<Result[]>(() => {
    const out: Result[] = [];
    if (filter === "all" || filter === "filter") {
      buildSearchFilterActions(debounced, state.vessels, state.riskByVessel).forEach((item) => out.push({ kind: "filter", item }));
    }
    if ((filter === "all" || filter === "evidence") && evidenceId !== null) out.push({ kind: "evidence", id: evidenceId });
    if (filter === "all" || filter === "vessel") {
      const seen = new Set<number>();
      vessels.forEach((v) => {
        seen.add(v.id);
        out.push({ kind: "vessel", item: v });
      });
      localVesselSearchHits(debounced, state.vessels, state.riskByVessel).forEach((v) => {
        if (!seen.has(v.id)) out.push({ kind: "vessel", item: v });
      });
    }
    if (filter === "all" || filter === "entity") entities.forEach((e) => out.push({ kind: "entity", item: e }));
    return out;
  }, [debounced, vessels, state.vessels, state.riskByVessel, entities, evidenceId, filter]);

  if (compact) {
    return (
      <button
        type="button"
        className="btn ghost icon"
        onClick={() => {
          navigateTo("/vessels");
        }}
        aria-label="Search"
        title="Search"
      >
        <Search size={16} />
      </button>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", padding: "10px 12px 6px" }}>
      <label className="input search">
        <Search />
        <input
          id="global-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const first = results[0];
            if (first) {
              e.preventDefault();
              if (first.kind === "filter") {
                setFilters(first.item.apply(filters));
                navigateTo("/map");
              } else if (first.kind === "vessel") {
                select({ kind: "vessel", id: first.item.id });
                navigateTo(`/vessels/${first.item.id}`);
              } else if (first.kind === "entity") {
                select({ kind: "entity", id: first.item.id });
                navigateTo(`/entities/${first.item.id}`);
              } else {
                select({ kind: "evidence", id: first.id });
                navigateTo(`/evidence/${first.id}`);
              }
            } else if (query.trim()) {
              e.preventDefault();
              navigateTo(`/vessels?q=${encodeURIComponent(query.trim())}`);
            }
            setOpen(false);
          }}
          placeholder="Search vessels, IMOs, entities…"
        />
        <span className="kbd" aria-hidden="true">/</span>
      </label>
      {open && (results.length > 0 || loading || debounced.trim()) && (
        <div
          className="panel-solid"
          style={{
            position: "absolute",
            top: "100%",
            left: 12,
            right: 12,
            zIndex: 40,
            padding: 6,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          <div className="row" style={{ gap: 4, padding: "2px 4px 6px", flexWrap: "wrap" }}>
            {SEARCH_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`chip ${filter === item.value ? "selected" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {loading && <div className="t-faded" style={{ padding: 8, fontSize: 12 }}>Searching…</div>}
          {!loading && results.length === 0 && debounced.trim() && (
            <button
              type="button"
              className="palette-row"
              onClick={() => {
                navigateTo(`/vessels?q=${encodeURIComponent(debounced.trim())}`);
                setOpen(false);
              }}
            >
              <Search size={14} color="var(--slate-500)" />
              <span style={{ flex: 1 }}>Search vessels for “{debounced.trim()}”</span>
            </button>
          )}
          {results.map((r, idx) => {
            const Icon = r.kind === "filter" ? Filter : r.kind === "vessel" ? Ship : r.kind === "entity" ? Building2 : FileText;
            const label =
              r.kind === "filter"
                ? r.item.label
                : r.kind === "vessel"
                ? r.item.name
                : r.kind === "entity"
                ? r.item.name
                : `Evidence #${r.id}`;
            const hint =
              r.kind === "filter"
                ? r.item.meta
                : r.kind === "vessel"
                ? r.item.imo ? `IMO ${r.item.imo}` : r.item.mmsi ? `MMSI ${r.item.mmsi}` : ""
                : r.kind === "entity"
                ? r.item.entity_type
                : "Open evidence";
            const onClick = () => {
              // Dispatch selection BEFORE the route push so the map +
              // inspector see the new subject on the same render cycle.
              if (r.kind === "filter") {
                setFilters(r.item.apply(filters));
                navigateTo("/map");
              } else if (r.kind === "vessel") {
                select({ kind: "vessel", id: r.item.id });
                navigateTo(`/vessels/${r.item.id}`);
              } else if (r.kind === "entity") {
                select({ kind: "entity", id: r.item.id });
                navigateTo(`/entities/${r.item.id}`);
              } else {
                select({ kind: "evidence", id: r.id });
                navigateTo(`/evidence/${r.id}`);
              }
              setOpen(false);
              setQuery("");
            };
            return (
              <div key={`${r.kind}-${idx}`} className="palette-row" onClick={onClick}>
                <Icon size={14} color="var(--slate-500)" />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                {hint && <span className="t-faded mono" style={{ fontSize: 11 }}>{hint}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
