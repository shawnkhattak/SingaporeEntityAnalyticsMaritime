import { countryName, riskLabel, vesselTypeLabel } from "./labels";
import type { MapFilters, RiskFlag, RiskSeverity, VesselMapFeature } from "./types";

export type SearchFilterKind = "flag" | "vessel_type" | "risk_type" | "severity";

export type SearchFilterAction = {
  key: string;
  kind: SearchFilterKind;
  label: string;
  meta: string;
  apply: (filters: MapFilters) => MapFilters;
};

export type SearchVesselHit = {
  id: number;
  name: string;
  imo: string | null;
  mmsi: string | null;
  flag_country_code: string | null;
  vessel_type_code: string | null;
};

const SEVERITY_TERMS: Array<{ label: string; values: RiskSeverity[]; terms: string[] }> = [
  { label: "Critical risk", values: ["critical", "high"], terms: ["critical", "high", "severe"] },
  { label: "Medium risk", values: ["medium"], terms: ["medium", "moderate"] },
  { label: "Low risk", values: ["low"], terms: ["low"] },
];

export function buildSearchFilterActions(
  query: string,
  vessels: VesselMapFeature[],
  riskByVessel: Record<number, RiskFlag[]>,
): SearchFilterAction[] {
  const q = normalize(query);
  if (!q) return [];
  const actions: SearchFilterAction[] = [];
  const stripped = q.replace(/^(flag|type|vessel type|risk|severity|status)\s*[:=]?\s+/, "");

  const flags = new Map<string, string>();
  const types = new Map<string, string>();
  for (const vessel of vessels) {
    if (vessel.flag_country_code) flags.set(vessel.flag_country_code.toUpperCase(), countryName(vessel.flag_country_code) ?? vessel.flag_country_code.toUpperCase());
    if (vessel.vessel_type_code) types.set(vessel.vessel_type_code, vesselTypeLabel(vessel.vessel_type_code));
  }

  for (const [code, name] of flags) {
    if (matchesAny(stripped, code, name)) {
      actions.push({
        key: `filter-flag-${code}`,
        kind: "flag",
        label: `Flag state: ${name}`,
        meta: code,
        apply: (filters) => ({ ...filters, flagStates: new Set([code]) }),
      });
    }
  }

  for (const [code, label] of types) {
    if (matchesAny(stripped, code, label)) {
      actions.push({
        key: `filter-type-${code}`,
        kind: "vessel_type",
        label: `Vessel type: ${label}`,
        meta: code,
        apply: (filters) => ({ ...filters, vesselTypes: new Set([code]) }),
      });
    }
  }

  const riskTypes = new Map<string, { title: string; kind: string }>();
  for (const flagsForVessel of Object.values(riskByVessel)) {
    for (const flag of flagsForVessel) {
      if (flag.status === "resolved") continue;
      const label = riskLabel(flag.flag_type);
      riskTypes.set(flag.flag_type, { title: label.title, kind: label.kind });
    }
  }
  for (const [flagType, label] of riskTypes) {
    if (matchesAny(stripped, flagType, label.title, label.kind)) {
      actions.push({
        key: `filter-risk-${flagType}`,
        kind: "risk_type",
        label: `Risk type: ${label.title}`,
        meta: flagType.replaceAll("_", " "),
        apply: (filters) => ({ ...filters, riskTypes: new Set([flagType]) }),
      });
    }
  }

  for (const severity of SEVERITY_TERMS) {
    if (severity.terms.some((term) => stripped.includes(term))) {
      actions.push({
        key: `filter-severity-${severity.values.join("-")}`,
        kind: "severity",
        label: severity.label,
        meta: "Map risk filter",
        apply: (filters) => ({ ...filters, riskSeverities: new Set(severity.values) }),
      });
    }
  }

  return actions.slice(0, 8);
}

export function localVesselSearchHits(
  query: string,
  vessels: VesselMapFeature[],
  riskByVessel: Record<number, RiskFlag[]>,
): SearchVesselHit[] {
  const q = normalize(query);
  if (!q) return [];
  return vessels
    .filter((vessel) => {
      const flags = riskByVessel[vessel.vessel_id] ?? vessel.risk_flags ?? [];
      const riskText = flags.map((flag) => {
        const label = riskLabel(flag.flag_type);
        return `${flag.flag_type} ${flag.severity} ${flag.status} ${label.title} ${label.kind}`;
      }).join(" ");
      return normalize([
        vessel.name,
        vessel.imo,
        vessel.mmsi,
        vessel.call_sign,
        vessel.flag_country_code,
        vessel.flag_country_code ? countryName(vessel.flag_country_code) : null,
        vessel.vessel_type_code,
        vessel.vessel_type_code ? vesselTypeLabel(vessel.vessel_type_code) : null,
        riskText,
      ].filter(Boolean).join(" ")).includes(q);
    })
    .slice(0, 6)
    .map((vessel) => ({
      id: vessel.vessel_id,
      name: vessel.name,
      imo: vessel.imo,
      mmsi: vessel.mmsi,
      flag_country_code: vessel.flag_country_code,
      vessel_type_code: vessel.vessel_type_code,
    }));
}

function matchesAny(query: string, ...values: Array<string | null | undefined>) {
  return values.some((value) => {
    const normalized = normalize(value ?? "");
    return normalized && (normalized.includes(query) || query.includes(normalized));
  });
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
}
