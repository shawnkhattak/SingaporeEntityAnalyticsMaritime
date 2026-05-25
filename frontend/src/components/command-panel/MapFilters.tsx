import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useState } from "react";
import { useFilters } from "../../state/AppState";
import { Chip } from "../primitives/Chip";
import type { RiskSeverity } from "../../types";
import { DEFAULT_FILTERS } from "../../types";

// "high" and "critical" are shown as a single tier; selecting the
// Critical chip toggles both backend values together.
const SEVERITY_CHIPS: { label: string; values: RiskSeverity[]; tone: "crit" | "med" | "low" }[] = [
  { label: "Critical", values: ["critical", "high"], tone: "crit" },
  { label: "Medium", values: ["medium"], tone: "med" },
  { label: "Low", values: ["low"], tone: "low" },
];

function isDefault(filters: ReturnType<typeof useFilters>["filters"]) {
  return (
    filters.riskSeverities.size === 0 &&
    filters.riskTypes.size === 0 &&
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
  const [open, setOpen] = useState(true);

  function toggleSeverityGroup(values: RiskSeverity[]) {
    const next = new Set(filters.riskSeverities);
    const allSelected = values.every((v) => next.has(v));
    if (allSelected) {
      values.forEach((v) => next.delete(v));
    } else {
      values.forEach((v) => next.add(v));
    }
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
              {SEVERITY_CHIPS.map((chip) => (
                <Chip
                  key={chip.label}
                  tone={chip.tone}
                  selected={chip.values.every((v) => filters.riskSeverities.has(v))}
                  onClick={() => toggleSeverityGroup(chip.values)}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>
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
