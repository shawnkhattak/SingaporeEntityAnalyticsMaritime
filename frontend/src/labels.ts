/**
 * Centralized humanization of cryptic codes coming from OCEANS-X / risk
 * pipelines. Anywhere the UI used to show a 2-letter flag or 2-3 letter
 * vessel-type code, route through these helpers instead.
 */

const COUNTRY_DISPLAY = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

const COUNTRY_FALLBACKS: Record<string, string> = {
  SG: "Singapore",
  MY: "Malaysia",
  ID: "Indonesia",
  TH: "Thailand",
  PH: "Philippines",
  HK: "Hong Kong",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  TW: "Taiwan",
  VN: "Vietnam",
  IN: "India",
  AU: "Australia",
  NZ: "New Zealand",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  GR: "Greece",
  IT: "Italy",
  ES: "Spain",
  PA: "Panama",
  LR: "Liberia",
  MH: "Marshall Islands",
  KY: "Cayman Islands",
  BS: "Bahamas",
  MT: "Malta",
  CY: "Cyprus",
  IM: "Isle of Man",
  GI: "Gibraltar",
  VG: "British Virgin Islands",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  RU: "Russia",
  IR: "Iran",
  KP: "North Korea",
  SY: "Syria",
};

/**
 * Returns the Unicode flag emoji for a 2-letter ISO country code.
 * Falls back to the raw code if the input doesn't look ISO-like —
 * never throws, always renders something legible.
 */
export function flagEmoji(code: string | null | undefined): string {
  if (!code) return "";
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== 2 || !/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  const offset = 0x1f1e6 - "A".charCodeAt(0);
  return String.fromCodePoint(trimmed.charCodeAt(0) + offset, trimmed.charCodeAt(1) + offset);
}

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  if (!upper) return "";
  if (COUNTRY_DISPLAY) {
    try {
      const name = COUNTRY_DISPLAY.of(upper);
      if (name && name !== upper) return name;
    } catch {
      /* fall through */
    }
  }
  return COUNTRY_FALLBACKS[upper] ?? upper;
}

/**
 * `code` may be a long string ("Cargo", "Bulk Carrier") or a short
 * MPA OCEANS-X 2-3 letter code. The mapping below covers the codes
 * we've seen in production; unknown codes fall back to the raw value.
 */
const VESSEL_TYPE_LABELS: Record<string, string> = {
  CC: "Container ship",
  BC: "Bulk carrier",
  TC: "Tanker",
  CS: "Chemical tanker",
  GC: "General cargo",
  LP: "LPG carrier",
  LN: "LNG carrier",
  CT: "Crude tanker",
  PT: "Product tanker",
  TU: "Tug",
  TS: "Tug / supply",
  SV: "Supply vessel",
  WB: "Workboat",
  WA: "Workboat",
  PV: "Passenger vessel",
  FB: "Ferry",
  HS: "High-speed craft",
  YA: "Yacht",
  FV: "Fishing vessel",
  BA: "Barge",
  BG: "Barge",
  DR: "Dredger",
  DL: "Dredger / loader",
  LC: "Landing craft",
  RV: "Research vessel",
  RE: "Research vessel",
  OR: "Offshore / other",
  CL: "Crew / liner",
  CX: "Container feeder",
  FR: "Reefer",
  PB: "Patrol boat",
  LB: "Lifeboat / supply",
  LH: "Light buoy / harbor",
  LV: "Light vessel",
  MV: "Motor vessel",
  ST: "Storage tanker",
  TUSV: "Tug / supply",
};

export function vesselTypeLabel(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const trimmed = code.trim();
  if (!trimmed) return "Unknown";
  const upper = trimmed.toUpperCase();
  if (VESSEL_TYPE_LABELS[upper]) return VESSEL_TYPE_LABELS[upper];
  // Already human-readable (mixed case, contains a space) — return as-is.
  if (trimmed.length > 4 || /[a-z\s]/.test(trimmed)) return trimmed;
  return trimmed;
}

// --- Risk humanization ---------------------------------------------

export type RiskKind =
  | "sanctioned"
  | "detained"
  | "watchlist"
  | "news"
  | "high_risk_flag"
  | "identity_conflict"
  | "other";

type RiskLabel = {
  kind: RiskKind;
  title: string;
  body: string;
  toneClass: "crit" | "high" | "med" | "low" | "info";
};

const RISK_LABELS: Record<string, RiskLabel> = {
  sanctions_match: {
    kind: "sanctioned",
    title: "Sanctioned",
    body: "Vessel or owner matches an entry on a sanctions list (OFAC, EU, UK HMT, or OpenSanctions). Treat all interactions with elevated due-diligence.",
    toneClass: "crit",
  },
  sanctions: {
    kind: "sanctioned",
    title: "Sanctioned",
    body: "Vessel or owner matches an entry on a sanctions list. Treat all interactions with elevated due-diligence.",
    toneClass: "crit",
  },
  detained: {
    kind: "detained",
    title: "Detained at port",
    body: "Vessel is currently detained by port state control. Cannot sail until deficiencies are cleared.",
    toneClass: "high",
  },
  port_state_detention: {
    kind: "detained",
    title: "Detained at port",
    body: "Port state control has detained this vessel. Deficiencies must be cleared before departure.",
    toneClass: "high",
  },
  maritime_watchlist: {
    kind: "watchlist",
    title: "On maritime watchlist",
    body: "Vessel appears on an internal maritime watchlist. Review the linked evidence to understand why it was flagged.",
    toneClass: "high",
  },
  high_risk_flag_country: {
    kind: "high_risk_flag",
    title: "High-risk flag state",
    body: "Vessel is registered under a flag state designated high-risk for sanctions or proliferation concerns.",
    toneClass: "high",
  },
  conflicting_identity: {
    kind: "identity_conflict",
    title: "Conflicting identity",
    body: "Multiple source observations report different names or particulars for this IMO. May indicate identity spoofing.",
    toneClass: "med",
  },
  negative_news_mention: {
    kind: "news",
    title: "Negative news mention",
    body: "Vessel was named in adverse news coverage. Open the linked evidence to read the original article.",
    toneClass: "med",
  },
};

export function riskLabel(flag_type: string): RiskLabel {
  return (
    RISK_LABELS[flag_type] ?? {
      kind: "other",
      title: humanizeSnake(flag_type),
      body: "",
      toneClass: "info",
    }
  );
}

function humanizeSnake(input: string): string {
  return input
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^([a-z])/, (m) => m.toUpperCase());
}

/** Stable boolean: is the vessel sanctioned vs detained? Useful for
 * map filtering and badge ordering. */
export function isSanctioned(flag_type: string): boolean {
  return riskLabel(flag_type).kind === "sanctioned";
}
export function isDetained(flag_type: string): boolean {
  return riskLabel(flag_type).kind === "detained";
}
