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
 * MPA OCEANS-X vessel type code. The mapping below mirrors the
 * VESSELTYPES_REF_JSON artifact; unknown codes fall back to the raw
 * value.
 */
const VESSEL_TYPE_LABELS: Record<string, string> = {
  BA: "Barge",
  BAAC: "Accommodation/Pipe Laying Barge",
  BADR: "Dredger Barge",
  BAFG: "Flat Top Deck Cargo Barge",
  BAFL: "Flat Top Barge",
  BAFW: "Flat Top Oil/Water Barge",
  BAHA: "Hatch Barge",
  BAHP: "Hopper Barge",
  BAHT: "Heavy Transport Vessel",
  BAJA: "Jack-Up Barge",
  BAOI: "Oil Barge",
  BAPI: "Piling Barge",
  BASO: "Sludge/Slop Barge",
  BAWO: "Work Barge",
  BC: "Bulk Carrier",
  BCCC: "Cement Carrier",
  BCOB: "Ore/Bulk Carrier",
  C2: "Container Ship-2nd Gen.",
  C3: "Container Ship-3rd Gen.",
  CC: "Vehicle Carrier",
  CCCV: "Container Vehicle Carrier",
  CCRR: "RoRo Car Carrier",
  CF: "Container Ship-Feeder",
  CH: "Chemical Tanker",
  CL: "Cable Laying Ship",
  CO: "Coaster",
  CR: "Container Ship-Roll On/Off",
  CS: "Container Ship",
  CX: "Crane Barge",
  DL: "Drill Ship",
  DR: "Dredger",
  DS: "Dead Ship",
  FB: "Ferry Boat",
  FBPC: "Passenger/Car Ferry",
  FBPG: "Passenger/Cargo Ferry",
  FBVF: "Passenger Vehicular Ferry",
  FR: "General Cargo",
  FRRR: "RoRo Cargo",
  FS: "Factory Ship",
  FV: "Fishing Vessel",
  HS: "Heavyload Semi-Submersible",
  IB: "Icebreaker",
  JU: "Junk",
  LA: "LASH Vessel",
  LC: "Landing Craft",
  LI: "Lighter",
  LN: "LNG",
  LP: "LPG",
  LU: "Passenger Launch",
  LV: "Live-Stock Vessel",
  NN: "Nuclear Power Vessel",
  NV: "Naval Vessel",
  OB: "Oil-Bulk-Ore Carrier",
  OBOL: "Oil-Gas Carrier",
  OR: "Oil Rig",
  ORAC: "Accommodation Rig",
  ORJA: "Jack-Up Rig",
  ORSS: "Semi-Submersible Rig",
  ORTE: "Tender Rig",
  OT: "Others",
  PL: "Passenger Vessel (D.C.)",
  PM: "Motorised Pleasure Boat",
  PMCB: "Cabin Cruiser",
  PMCT: "Motorised Catamaran",
  PMDI: "Motorised Dinghy",
  PMFU: "Motorised Funboat",
  PMHO: "Motorised Hovercraft",
  PMHY: "Hydrofoil",
  PMSB: "Ski-Boat",
  PMSP: "Speedboat",
  PMST: "Motorised Catamaran",
  PMTR: "Motorised Trimaran",
  PR: "Rowing Boat",
  PRBA: "Powered Recreational Barge",
  PRCA: "Canoe",
  PRDI: "Rowing Dinghy",
  PRFU: "Rowing Funboat",
  PS: "Sailing Boat",
  PSCT: "Catamaran",
  PSDI: "Sailing Dinghy",
  PSFU: "Sailing Funboat",
  PSTR: "Trimaran",
  PT: "Parcel Tanker",
  PV: "Passenger Vessel",
  PVHO: "Passenger Hovercraft",
  RE: "Reefer Vessel",
  RV: "Research/Survey Vessel",
  SA: "Salvage Vessel",
  SC: "Semi-Container Ship",
  SM: "Sampan",
  SMBG: "Big Motor Sampan",
  SMBI: "Big Non-Motorised Sampan",
  SMBM: "Bumboat",
  SMMO: "Motor Sampan",
  SMRO: "Rowing Sampan",
  SMTO: "Tongkang",
  SMTW: "Chinese Twako",
  SR: "Submarine Support & Rescue",
  SV: "Supply Vessel",
  SVOF: "Offshore Supply Vessel",
  TA: "Tanker",
  TAAT: "Asphalt Tanker",
  TABA: "Tanker Barge",
  TABU: "Bunker Tanker",
  TACG: "Chemical/Gas Tanker",
  TACO: "Crude Oil Tanker",
  TAFO: "Floating Storage Offshore",
  TAFP: "FPSO Vessel",
  TAFU: "Floating Storage Unit",
  TAFX: "Floating Storage Regas. Unit",
  TALG: "Liquefied Gas Carrier",
  TAMO: "Mobile Offshore Production Unit",
  TAOC: "Oil/Chemical/Gas Tanker",
  TAP1: "Petroleum Product Tanker (>=60C)",
  TAP2: "Petroleum Product Tanker (<60C)",
  TAP3: "Petroleum Product Tanker (<=60C)",
  TAPC: "Petroleum/Chemical Tanker",
  TAUL: "ULCC",
  TAVL: "VLCC",
  TAVO: "Vegetable Oil Tanker",
  TAWA: "Water Tanker",
  TAWD: "Wooden Bunker Craft",
  TS: "Training Ship",
  TU: "Tug Boat",
  TUCC: "Supply Vessel/ Cement Carrier",
  TUPU: "Pusher Tug",
  TUSV: "Tug/Supply Vessel",
  UT: "Utility Vessel",
  UTDV: "Diving Support Vessel",
  UTOS: "Oil Spill Response Vessel",
  WA: "Waterboat",
  WB: "Workboat",
  WBCB: "Crew Boat",
  WG: "Wing In Ground Craft",
  YA: "Yacht",
  YA50: "International 505",
  YACB: "Cabin Cruiser",
  YACT: "Motorised Catamaran",
  YAHO: "Motorised Hovercraft",
  YAMO: "Motorised Yacht",
  YASL: "Sailing Yacht",
  YASP: "Speedboat",
  YATR: "Motorised Trimaran",
  YAWG: "Yacht-Wing In Ground Craft",
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
  whyItMatters?: string;
  toneClass: "crit" | "high" | "med" | "low" | "info";
};

const RISK_LABELS: Record<string, RiskLabel> = {
  sanctions_match: {
    kind: "sanctioned",
    title: "Sanctions match",
    body: "This vessel matches a name or identifier on a public sanctions list (OFAC, EU, UK HMT, or OpenSanctions).",
    whyItMatters: "Operating with a sanctioned vessel may carry secondary-sanction exposure. Verify the match against the linked evidence before acting.",
    toneClass: "crit",
  },
  sanctions: {
    kind: "sanctioned",
    title: "Sanctions match",
    body: "This vessel matches a name or identifier on a public sanctions list.",
    whyItMatters: "Operating with a sanctioned vessel may carry secondary-sanction exposure. Verify the match against the linked evidence before acting.",
    toneClass: "crit",
  },
  detained: {
    kind: "detained",
    title: "Detained at port",
    body: "Port state control is currently holding this vessel and it cannot sail until deficiencies are cleared.",
    whyItMatters: "Active detentions indicate serious safety, crew, or compliance findings that may delay onward voyages and trigger re-inspection.",
    toneClass: "high",
  },
  port_state_detention: {
    kind: "detained",
    title: "Detained at port",
    body: "Port state control is currently holding this vessel. Deficiencies must be cleared before departure.",
    whyItMatters: "Active detentions indicate serious safety, crew, or compliance findings that may delay onward voyages and trigger re-inspection.",
    toneClass: "high",
  },
  maritime_watchlist: {
    kind: "watchlist",
    title: "Watchlist match",
    body: "Vessel appears on an internal maritime watchlist.",
    whyItMatters: "Review the linked evidence to understand why it was flagged and whether the underlying concern is still active.",
    toneClass: "high",
  },
  high_risk_flag_country: {
    kind: "high_risk_flag",
    title: "High-risk flag state",
    body: "Vessel is registered under a flag state designated high-risk for sanctions or proliferation concerns.",
    whyItMatters: "High-risk flag states are common vehicles for sanctions evasion. Cross-check ownership and recent port calls before clearing the vessel.",
    toneClass: "high",
  },
  conflicting_identity: {
    kind: "identity_conflict",
    title: "Identity conflict",
    body: "Same IMO appears with conflicting identifiers across sources.",
    whyItMatters: "Identity discrepancies are a common indicator of deceptive shipping practices and false-flag operations.",
    toneClass: "low",
  },
  negative_news_mention: {
    kind: "news",
    title: "Adverse news mention",
    body: "Vessel was named in adverse news coverage.",
    whyItMatters: "News reporting often surfaces incidents before formal sources update. Open the linked article to confirm what was reported.",
    toneClass: "med",
  },
};

/**
 * Display-side severity collapse. SEAM combines "high" and "critical"
 * into a single tier in the UI — the backend still stores both values
 * but every visible badge, color, chip, and filter treats them as one.
 */
export function displaySeverity(severity: string | null | undefined): string {
  return severity === "high" ? "critical" : (severity ?? "none");
}

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

// --- Geo layer humanization ----------------------------------------

/**
 * OCEANS-X geo-layer endpoints use compact identifiers like `ports_p`
 * (point), `coastline_l` (line), `offshore_a` (polygon). Map to
 * analyst-readable labels; unknown layers fall back to title-casing
 * the bare name with the suffix translated.
 */
const GEO_LAYER_LABELS: Record<string, string> = {
  ports_p: "Ports",
  ports_l: "Port service lines",
  ports_a: "Port service areas",
  dangers_p: "Danger areas",
  dangers_l: "Danger lines",
  dangers_a: "Danger areas",
  aton_p: "Aids to navigation",
  coastline_l: "Coastline",
  coastline_a: "Coastline areas",
  depths_l: "Depth lines",
  depths_a: "Depth areas",
  offshore_a: "Offshore zones",
  offshore_l: "Offshore lines",
  cultural_p: "Cultural points",
  cultural_l: "Cultural lines",
  cultural_a: "Cultural areas",
  natural_p: "Natural points",
  natural_l: "Natural lines",
  natural_a: "Natural areas",
  military_a: "Military areas",
  anchorages_a: "Anchorages",
  fairway_l: "Fairways",
  port_limits_a: "Port limits",
  tss_a: "Traffic separation schemes",
  restricted_a: "Restricted areas",
  pilot_boarding_p: "Pilot boarding stations",
};

const GEO_LAYER_SUFFIXES: Record<string, string> = {
  p: "points",
  l: "lines",
  a: "areas",
};

export function geoLayerLabel(name: string | null | undefined): string {
  if (!name) return "";
  if (GEO_LAYER_LABELS[name]) return GEO_LAYER_LABELS[name];
  const match = name.match(/^(.+)_(p|l|a)$/);
  if (match) {
    const [, base, suffix] = match;
    const pretty = base
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const suffixLabel = GEO_LAYER_SUFFIXES[suffix];
    return suffixLabel ? `${pretty} (${suffixLabel})` : pretty;
  }
  return name;
}
