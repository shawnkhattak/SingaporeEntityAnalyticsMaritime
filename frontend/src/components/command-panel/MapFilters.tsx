import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { countryName, riskLabel, vesselTypeLabel } from "../../labels";
import { useApp, useFilters } from "../../state/AppState";
import { DEFAULT_FILTERS, type MapFilters, type RiskSeverity } from "../../types";
import { Chip } from "../primitives/Chip";
import { MultiSelect } from "../primitives/MultiSelect";

const SEVERITY_CHIPS: { label: string; values: RiskSeverity[]; tone: "crit" | "med" | "low" }[] = [
  { label: "Critical", values: ["critical", "high"], tone: "crit" },
  { label: "Medium", values: ["medium"], tone: "med" },
  { label: "Low", values: ["low"], tone: "low" },
];

function isDefault(filters: MapFilters) {
  return (
    filters.riskSeverities.size === 0 &&
    filters.riskTypes.size === 0 &&
    filters.vesselTypes.size === 0 &&
    filters.flagStates.size === 0 &&
    filters.dwtRange === null &&
    filters.ageRange === null &&
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

  const vesselTypeOptions = useMemo(() => uniqueOptions(
    state.vessels,
    (v) => v.vessel_type_code,
    (code) => vesselTypeLabel(code),
  ), [state.vessels]);
  const flagOptions = useMemo(() => uniqueOptions(
    state.vessels,
    (v) => v.flag_country_code?.toUpperCase() ?? null,
    (code) => countryName(code) ? `${countryName(code)} (${code})` : code,
  ), [state.vessels]);
  const riskOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const flags of Object.values(state.riskByVessel)) {
      for (const flag of flags) {
        if (flag.status === "resolved") continue;
        options.set(flag.flag_type, riskLabel(flag.flag_type).title);
      }
    }
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
  }, [state.riskByVessel]);
  const dwtMax = useMemo(() => niceMax(state.vessels.map((v) => v.deadweight ?? 0)), [state.vessels]);
  const ageMax = useMemo(() => niceMax(state.vessels.map((v) => v.year_built ? new Date().getFullYear() - v.year_built : 0), 5), [state.vessels]);

  function toggleSeverityGroup(values: RiskSeverity[]) {
    const next = new Set(filters.riskSeverities);
    const allSelected = values.every((v) => next.has(v));
    if (allSelected) values.forEach((v) => next.delete(v));
    else values.forEach((v) => next.add(v));
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
          <button type="button" className="btn ghost sm" style={{ flex: "0 0 auto", fontSize: 11 }} onClick={reset}>
            Reset
          </button>
        )}
      </div>
      {open && (
        <div style={{ padding: "0 4px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
          <FilterGroup label="Risk severity">
            <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
              {SEVERITY_CHIPS.map((chip) => (
                <Chip key={chip.label} tone={chip.tone} selected={chip.values.every((v) => filters.riskSeverities.has(v))} onClick={() => toggleSeverityGroup(chip.values)}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Risk flag">
            <MultiSelect
              options={riskOptions}
              selected={filters.riskTypes}
              onChange={(next) => setFilters({ ...filters, riskTypes: next })}
              placeholder={riskOptions.length ? "Any risk flag" : "No active flags loaded"}
            />
          </FilterGroup>

          <FilterGroup label="Vessel type">
            <MultiSelect
              options={vesselTypeOptions}
              selected={filters.vesselTypes}
              onChange={(next) => setFilters({ ...filters, vesselTypes: next })}
              placeholder={vesselTypeOptions.length ? "All types" : "No vessel types loaded"}
            />
          </FilterGroup>

          <FilterGroup label="Vessel DWT">
            <RangeFilter
              min={0}
              max={dwtMax}
              step={1000}
              value={filters.dwtRange}
              format={(value) => `${Math.round(value).toLocaleString()} DWT`}
              onChange={(range) => setFilters({ ...filters, dwtRange: range })}
            />
          </FilterGroup>

          <FilterGroup label="Vessel age">
            <RangeFilter
              min={0}
              max={ageMax}
              step={1}
              value={filters.ageRange}
              format={(value) => `${Math.round(value)} yr`}
              onChange={(range) => setFilters({ ...filters, ageRange: range })}
            />
          </FilterGroup>

          <FilterGroup label="Vessel flag">
            <MultiSelect
              options={flagOptions}
              selected={filters.flagStates}
              onChange={(next) => setFilters({ ...filters, flagStates: next })}
              placeholder={flagOptions.length ? "All flags" : "No flags loaded"}
            />
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="t-caption row" style={{ gap: 4, padding: "4px 4px 6px" }}>{label}</div>
      <div style={{ padding: "0 4px" }}>{children}</div>
    </div>
  );
}

function RangeFilter({
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number] | null;
  format: (value: number) => string;
  onChange: (value: [number, number] | null) => void;
}) {
  const current: [number, number] = value ?? [min, max];
  const disabled = max <= min;
  function setLower(next: number) {
    onChange([Math.min(next, current[1]), current[1]]);
  }
  function setUpper(next: number) {
    onChange([current[0], Math.max(next, current[0])]);
  }
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, fontSize: 11, color: "var(--slate-500)" }}>
        <span>{format(current[0])}</span>
        <span>{format(current[1])}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={current[0]} disabled={disabled} onChange={(e) => setLower(Number(e.target.value))} />
      <input type="range" min={min} max={max} step={step} value={current[1]} disabled={disabled} onChange={(e) => setUpper(Number(e.target.value))} />
      {value && (
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start", fontSize: 11 }} onClick={() => onChange(null)}>
          Clear range
        </button>
      )}
    </div>
  );
}

function uniqueOptions<T>(
  rows: T[],
  getValue: (row: T) => string | null | undefined,
  getLabel: (value: string) => string,
) {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = getValue(row);
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => getLabel(a).localeCompare(getLabel(b))).map((value) => ({ value, label: getLabel(value) }));
}

function niceMax(values: number[], increment = 1000) {
  const max = Math.max(0, ...values.filter((value) => Number.isFinite(value)));
  if (max <= 0) return increment;
  return Math.ceil(max / increment) * increment;
}
