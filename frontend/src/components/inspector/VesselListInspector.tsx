import { Search, Ship } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchVessels } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { closeInspectorRoute, navigateTo } from "../../hooks/useRoute";
import { useApp, useFilters } from "../../state/AppState";
import { Avatar } from "../primitives/Avatar";
import { EmptyState } from "../primitives/EmptyState";
import { Input } from "../primitives/Input";
import { RiskPill } from "../primitives/Pill";
import { Skeleton } from "../primitives/Skeleton";
import type { VesselMapFeature, VesselSearchResult } from "../../types";
import { formatRelative } from "../../format";
import { matchesFilters, highestSeverity } from "../map/filters";
import { countryName, flagEmoji, vesselTypeLabel } from "../../labels";
import { InspectorShell } from "./InspectorShell";

const PAGE_SIZE = 25;

type Row = {
  id: number;
  name: string;
  imo: string | null;
  mmsi: string | null;
  call_sign: string | null;
  flag_country_code: string | null;
  vessel_type_code: string | null;
  position_timestamp: string | null;
  severity: ReturnType<typeof highestSeverity>;
};

export function VesselListInspector() {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<VesselSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const { state } = useApp();
  const { filters } = useFilters();

  useEffect(() => {
    function syncQueryFromUrl() {
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
      setPage(0);
    }
    window.addEventListener("seam:navigate", syncQueryFromUrl as EventListener);
    window.addEventListener("popstate", syncQueryFromUrl);
    return () => {
      window.removeEventListener("seam:navigate", syncQueryFromUrl as EventListener);
      window.removeEventListener("popstate", syncQueryFromUrl);
    };
  }, []);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchVessels(debounced)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const rows: Row[] = useMemo(() => {
    if (results) {
      return results.map((v) => ({
        id: v.id,
        name: v.name,
        imo: v.imo,
        mmsi: v.mmsi,
        call_sign: v.call_sign,
        flag_country_code: v.flag_country_code,
        vessel_type_code: v.vessel_type_code,
        position_timestamp: v.latest_position?.position_timestamp ?? null,
        severity: highestSeverity(state.riskByVessel[v.id] ?? []),
      }));
    }
    return state.vessels
      .filter((v) => matchesFilters(v, state.riskByVessel, filters))
      .map((v: VesselMapFeature) => ({
        id: v.vessel_id,
        name: v.name,
        imo: v.imo,
        mmsi: v.mmsi,
        call_sign: v.call_sign,
        flag_country_code: v.flag_country_code,
        vessel_type_code: v.vessel_type_code,
        position_timestamp: v.position_timestamp,
        severity: highestSeverity(state.riskByVessel[v.vessel_id] ?? []),
      }));
  }, [results, state.vessels, state.riskByVessel, filters]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalInSnapshot = state.vessels.length;
  const titleSuffix = results
    ? `${rows.length} match${rows.length === 1 ? "" : "es"}`
    : totalInSnapshot && rows.length !== totalInSnapshot
    ? `${rows.length} of ${totalInSnapshot} visible`
    : `${rows.length}`;

  return (
    <InspectorShell
      breadcrumb="Vessels"
      title={`Vessels · ${titleSuffix}`}
      onClose={closeInspectorRoute}
      footer={
        <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
          <button className="btn sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
          <span className="t-muted">Page {page + 1} of {pageCount}</span>
          <button className="btn sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next</button>
        </div>
      }
    >
      <Input
        leadingIcon={<Search />}
        placeholder="IMO, MMSI, call sign, or name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        variant="search"
      />
      {loading && (
        <div className="col" style={{ marginTop: 12, gap: 8 }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState
          compact
          icon={<Ship size={18} />}
          title={query ? `No vessels match "${query}"` : "No vessels loaded yet"}
          body={query ? "Try a different IMO, MMSI, call sign, or name." : "Run a positions snapshot to load AIS data."}
        />
      )}
      <div className="col" style={{ marginTop: 12, gap: 6 }}>
        {visible.map((row) => {
          const typeText = row.vessel_type_code ? vesselTypeLabel(row.vessel_type_code) : null;
          return (
            <a
              key={row.id}
              href={`/vessels/${row.id}`}
              className="card row lift"
              style={{ padding: "10px 12px", gap: 10, textDecoration: "none", color: "inherit", alignItems: "flex-start" }}
            >
              <Avatar label={row.name} ring={row.severity !== "none" ? row.severity : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</strong>
                  {row.flag_country_code && (
                    <span
                      title={countryName(row.flag_country_code) || row.flag_country_code}
                      aria-label={countryName(row.flag_country_code) || row.flag_country_code}
                      style={{ fontSize: 14, lineHeight: 1, cursor: "help" }}
                    >
                      {flagEmoji(row.flag_country_code) || row.flag_country_code}
                    </span>
                  )}
                  {typeText && typeText !== "Unknown" && (
                    <span className="pill" style={{ fontSize: 10 }}>{typeText}</span>
                  )}
                </div>
                <div className="mono t-muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {[row.imo && `IMO ${row.imo}`, row.mmsi && `MMSI ${row.mmsi}`, row.call_sign].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="t-faded" style={{ fontSize: 10, marginTop: 2 }}>
                  OCEANS-X · last seen {formatRelative(row.position_timestamp)}
                </div>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
                {row.severity !== "none" && <RiskPill severity={row.severity} />}
              </div>
            </a>
          );
        })}
      </div>
    </InspectorShell>
  );
}
