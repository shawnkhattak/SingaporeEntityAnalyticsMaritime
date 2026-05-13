import type { MapFilters, RiskFlag, RiskSeverity, VesselMapFeature } from "../../types";
import { parseBackendDate } from "../../format";

const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low", "none"];

export function highestSeverity(flags: RiskFlag[]): RiskSeverity {
  for (const s of SEVERITY_ORDER) {
    if (flags.some((f) => f.severity === s && f.status !== "resolved")) return s;
  }
  return "none";
}

const TIME_WINDOW_MS: Record<MapFilters["timeWindow"], number> = {
  live: Number.POSITIVE_INFINITY,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
  "7d": 604_800_000,
};

export function matchesFilters(
  v: VesselMapFeature,
  riskByVessel: Record<number, RiskFlag[]>,
  filters: MapFilters,
): boolean {
  const flags = riskByVessel[v.vessel_id] ?? [];
  const highest = highestSeverity(flags);
  if (filters.riskSeverities.size && !filters.riskSeverities.has(highest)) return false;
  if (filters.vesselTypes.size && (!v.vessel_type_code || !filters.vesselTypes.has(v.vessel_type_code))) return false;
  if (filters.flagStates.size && (!v.flag_country_code || !filters.flagStates.has(v.flag_country_code))) return false;
  if (filters.hasSanctions && !flags.some((f) => f.flag_type === "sanctions")) return false;
  if (filters.hasOpenRiskFlag && !flags.some((f) => f.status === "open")) return false;
  if (filters.timeWindow !== "live" && v.position_timestamp) {
    const cutoff = Date.now() - TIME_WINDOW_MS[filters.timeWindow];
    if (parseBackendDate(v.position_timestamp).getTime() < cutoff) return false;
  }
  return true;
}
