import { ChevronDown, ChevronRight, Filter, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getGeoLayers, getReferenceDomain, type ReferenceItem } from "../../api";
import { useFilters, useApp } from "../../state/AppState";
import { Chip } from "../primitives/Chip";
import { MultiSelect } from "../primitives/MultiSelect";
import type { RiskSeverity, TimeWindow } from "../../types";
import { DEFAULT_FILTERS } from "../../types";

const SEVERITIES: RiskSeverity[] = ["critical", "high", "medium", "low"];
const TIME_WINDOWS: TimeWindow[] = ["live", "1h", "6h", "24h", "7d"];

const VESSEL_TYPE_FALLBACK: ReferenceItem[] = [
  { code: "Cargo", label: "Cargo" },
  { code: "Tanker", label: "Tanker" },
  { code: "Bulker", label: "Bulker" },
  { code: "Container", label: "Container" },
  { code: "Passenger", label: "Passenger" },
  { code: "Fishing", label: "Fishing" },
  { code: "Other", label: "Other" },
];

function isDefault(filters: ReturnType<typeof useFilters>["filters"]) {
  return (
    filters.riskSeverities.size === 0 &&
    filters.vesselTypes.size === 0 &&
    filters.flagStates.size === 0 &&
    !filters.hasSanctions &&
    !filters.hasOpenRiskFlag &&
    filters.portActivityKind === null &&
    filters.timeWindow === DEFAULT_FILTERS.timeWindow &&
    filters.enabledGeoLayers.size === DEFAULT_FILTERS.enabledGeoLayers.size &&
    Array.from(DEFAULT_FILTERS.enabledGeoLayers).every((n) => filters.enabledGeoLayers.has(n))
  );
}

export function MapFilters() {
  const { filters, setFilters, reset } = useFilters();
  const { state } = useApp();
  const [open, setOpen] = useState(true);
  const [geoLayers, setGeoLayers] = useState<{ name: string; endpoint: string }[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ReferenceItem[]>(VESSEL_TYPE_FALLBACK);
  const [flagStates, setFlagStates] = useState<ReferenceItem[]>([]);

  useEffect(() => {
    getGeoLayers().then(setGeoLayers).catch(() => setGeoLayers([]));
    getReferenceDomain("vessel_type")
      .then((items) => {
        if (items.length > 0) setVesselTypes(items);
      })
      .catch(() => {
        /* keep fallback */
      });
    getReferenceDomain("flag_state")
      .then((items) => setFlagStates(items))
      .catch(() => setFlagStates([]));
  }, []);

  // Fallback flag-state list from current vessels if reference API is empty.
  const flagOptions = useMemo<ReferenceItem[]>(() => {
    if (flagStates.length > 0) return flagStates;
    const distinct = new Set<string>();
    state.vessels.forEach((v) => v.flag_country_code && distinct.add(v.flag_country_code));
    return Array.from(distinct)
      .sort()
      .map((code) => ({ code, label: code }));
  }, [flagStates, state.vessels]);

  function toggleSeverity(s: RiskSeverity) {
    const next = new Set(filters.riskSeverities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setFilters({ ...filters, riskSeverities: next });
  }

  function toggleLayer(name: string) {
    const next = new Set(filters.enabledGeoLayers);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setFilters({ ...filters, enabledGeoLayers: next });
  }

  function setBoolean<K extends "hasSanctions" | "hasOpenRiskFlag">(key: K, value: boolean) {
    setFilters({ ...filters, [key]: value });
  }

  return (
    <div className="cmd-section">
      <button type="button" className="cmd-section-head btn ghost full" onClick={() => setOpen((v) => !v)}>
        <Filter size={14} />
        <span style={{ flex: 1, textAlign: "left", fontWeight: 600, color: "var(--navy-700)" }}>Map filters</span>
        {!isDefault(filters) && (
          <button
            type="button"
            className="t-faded"
            style={{ background: "none", border: 0, cursor: "pointer", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
          >
            Reset
          </button>
        )}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div style={{ padding: "0 4px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
          <FilterGroup label="Risk severity">
            <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
              {SEVERITIES.map((s) => (
                <Chip
                  key={s}
                  tone={s === "critical" ? "crit" : s === "high" ? "high" : s === "medium" ? "med" : "low"}
                  selected={filters.riskSeverities.has(s)}
                  onClick={() => toggleSeverity(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Vessel type">
            <MultiSelect
              options={vesselTypes.map((v) => ({ value: v.code, label: v.label }))}
              selected={filters.vesselTypes}
              onChange={(next) => setFilters({ ...filters, vesselTypes: next })}
              placeholder="All types"
            />
          </FilterGroup>

          <FilterGroup label="Flag state">
            <MultiSelect
              options={flagOptions.map((v) => ({ value: v.code, label: v.label }))}
              selected={filters.flagStates}
              onChange={(next) => setFilters({ ...filters, flagStates: next })}
              placeholder={flagOptions.length === 0 ? "No flags loaded yet" : "All flags"}
            />
          </FilterGroup>

          <FilterGroup label="Quick filters">
            <div className="col" style={{ gap: 4 }}>
              <label className="row" style={{ gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={filters.hasSanctions}
                  onChange={(e) => setBoolean("hasSanctions", e.target.checked)}
                />
                Has sanctions match
              </label>
              <label className="row" style={{ gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={filters.hasOpenRiskFlag}
                  onChange={(e) => setBoolean("hasOpenRiskFlag", e.target.checked)}
                />
                Has open risk flag
              </label>
            </div>
          </FilterGroup>

          <FilterGroup label="Port activity">
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              {(["none", "due-arrive", "due-depart"] as const).map((kind) => (
                <Chip
                  key={kind}
                  selected={(kind === "none" ? null : kind) === filters.portActivityKind}
                  onClick={() =>
                    setFilters({ ...filters, portActivityKind: kind === "none" ? null : kind })
                  }
                >
                  {kind === "none" ? "None" : kind === "due-arrive" ? "Arrivals" : "Departures"}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Time window">
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              {TIME_WINDOWS.map((tw) => (
                <Chip key={tw} selected={filters.timeWindow === tw} onClick={() => setFilters({ ...filters, timeWindow: tw })}>
                  {tw === "live" ? "Live" : tw}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Geo layers" icon={<Layers size={11} />}>
            {geoLayers.length === 0 ? (
              <div className="t-faded" style={{ fontSize: 11 }}>No layers available</div>
            ) : (
              <div className="col" style={{ gap: 4 }}>
                {geoLayers.map((layer) => (
                  <label key={layer.name} className="row" style={{ gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={filters.enabledGeoLayers.has(layer.name)}
                      onChange={() => toggleLayer(layer.name)}
                    />
                    <span className="mono" style={{ fontSize: 11 }}>{layer.name}</span>
                  </label>
                ))}
              </div>
            )}
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="t-caption row" style={{ gap: 4, padding: "4px 4px 6px" }}>
        {icon}
        {label}
      </div>
      <div style={{ padding: "0 4px" }}>{children}</div>
    </div>
  );
}
