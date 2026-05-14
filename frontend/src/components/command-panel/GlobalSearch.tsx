import { Building2, FileText, Search, Ship } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchEntities, searchVessels } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { navigateTo } from "../../hooks/useRoute";
import { useSelection } from "../../state/AppState";
import type { Entity, VesselSearchResult } from "../../types";

type Result =
  | { kind: "vessel"; item: VesselSearchResult }
  | { kind: "entity"; item: Entity }
  | { kind: "evidence"; id: number };

export function GlobalSearch({ compact }: { compact?: boolean }) {
  const { select } = useSelection();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [vessels, setVessels] = useState<VesselSearchResult[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setVessels([]);
      setEntities([]);
      setEvidenceId(null);
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
    if (evidenceId !== null) out.push({ kind: "evidence", id: evidenceId });
    vessels.forEach((v) => out.push({ kind: "vessel", item: v }));
    entities.forEach((e) => out.push({ kind: "entity", item: e }));
    return out;
  }, [vessels, entities, evidenceId]);

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
          placeholder="Search vessels, IMOs, entities…"
        />
        <span className="kbd" aria-hidden="true">/</span>
      </label>
      {open && results.length > 0 && (
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
          {results.map((r, idx) => {
            const Icon = r.kind === "vessel" ? Ship : r.kind === "entity" ? Building2 : FileText;
            const label =
              r.kind === "vessel"
                ? r.item.name
                : r.kind === "entity"
                ? r.item.name
                : `Evidence #${r.id}`;
            const hint =
              r.kind === "vessel"
                ? r.item.imo ? `IMO ${r.item.imo}` : r.item.mmsi ? `MMSI ${r.item.mmsi}` : ""
                : r.kind === "entity"
                ? r.item.entity_type
                : "Open evidence";
            const onClick = () => {
              // Dispatch selection BEFORE the route push so the map +
              // inspector see the new subject on the same render cycle.
              if (r.kind === "vessel") {
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
