import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getReferenceDomain, type ReferenceItem } from "../../api";
import { useFilters, useApp } from "../../state/AppState";
import { Chip } from "../primitives/Chip";
import { MultiSelect } from "../primitives/MultiSelect";
import type { RiskSeverity } from "../../types";
import { DEFAULT_FILTERS } from "../../types";

const SEVERITIES: RiskSeverity[] = ["critical", "high", "medium", "low"];

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
  const [vesselTypes, setVesselTypes] = useState<ReferenceItem[]>(VESSEL_TYPE_FALLBACK);
  const [flagStates, setFlagStates] = useState<ReferenceItem[]>([]);

  useEffect(() => {
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

  return (
    <div className="cmd-section">
      <div className="cmd-section-head row" style={{ gap: 6 }}>
        <button type="button" className="btn ghost" style={{ flex: 1, justifyContent: "flex-start", minWidth: 0 }} onClick={() => setOpen((v) => !v)}>
          <Filter size={14} />
          <span style={{ flex: 1, textAlign: "left", fontWeight: 600, color: "var(--navy-700)" }}>Map filters</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {!isDefault(filters) && (
          <button
            type="button"
            className="btn ghost sm"
            style={{ flex: "0 0 auto", fontSize: 11 }}
            onClick={reset}
          >
            Reset
          </button>
        )}
      </div>
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
