export const MARITIME_DATASET_LABELS: Record<string, string> = {
  ua_war_sanctions: "Ukraine War Sanctions",
  us_ofac_sdn: "U.S. OFAC SDN List",
  us_ofac_cons: "U.S. OFAC Consolidated Sanctions List",
  us_trade_csl: "U.S. Trade Consolidated Screening List",
  kp_rusi_reports: "RUSI North Korea Maritime Sanctions Reports",
  ch_seco_sanctions: "Swiss SECO Sanctions List",
  gb_fcdo_sanctions: "UK FCDO Sanctions List",
  eu_journal_sanctions: "EU Official Journal Sanctions",
  eu_fsf: "EU Financial Sanctions List",
  eu_sanctions_map: "EU Sanctions Map",
  ca_dfatd_sema_sanctions: "Canada SEMA Sanctions List",
  un_1718_vessels: "UN Security Council 1718 DPRK Vessels List",
  fr_tresor_gels_avoir: "France Trésor Asset Freeze List",
  mc_fund_freezes: "Monaco Fund Freezes List",
  us_cbp_forced_labor: "U.S. CBP Forced Labor List",
  be_fod_sanctions: "Belgium FOD Sanctions List",
  ae_local_terrorists: "UAE Local Terrorist List",
  paris_mou_banned: "Paris MOU Banned Vessels List",
  black_sea_mou_detention: "Black Sea MOU Detention List",
  tokyo_mou_detention: "Tokyo MOU Detention List",
  ext_tokyo_mou_psc: "Tokyo MOU Port State Control Records",
  abuja_mou_detention: "Abuja MOU Detention List",
  ext_abuja_mou_psc: "Abuja MOU Port State Control Records",
};

const TOPIC_LABELS: Record<string, string> = {
  sanction: "Sanctions record",
  "mare.detained": "Maritime detention record",
  watchlist: "Watchlist record",
};

type PayloadLike = Record<string, unknown> | null | undefined;

export function getHumanReadableSanctionSource(evidenceOrPayload: PayloadLike): string {
  return compactLabel(getHumanReadableSanctionSources(evidenceOrPayload));
}

export function getHumanReadableSanctionSources(evidenceOrPayload: PayloadLike): string[] {
  const payload = unwrapPayload(evidenceOrPayload);
  if (!payload) return ["OpenSanctions maritime record"];

  const datasets = unique([
    ...values(payload.datasets),
    ...values(asRecord(payload.raw_csv_row)?.datasets),
  ]);
  const mappedDatasets = unique(datasets.map((value) => MARITIME_DATASET_LABELS[value]).filter(Boolean));
  if (mappedDatasets.length > 0) {
    return mappedDatasets;
  }

  const topics = unique(values(payload.topics));
  const mappedTopics = unique(topics.map((value) => TOPIC_LABELS[value]).filter(Boolean));
  if (mappedTopics.length > 0) {
    return mappedTopics;
  }

  if (datasets.length > 0) {
    return datasets.map(toTitleCase);
  }

  const source = String(payload.source ?? "").trim();
  if (source && source.toLowerCase().includes("opensanctions")) {
    return ["OpenSanctions maritime record"];
  }
  return [source || "OpenSanctions maritime record"];
}

function unwrapPayload(value: PayloadLike): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.raw_payload) ?? record;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value === "string") {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value == null ? [] : [String(value).trim()].filter(Boolean);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    const normalized = key.toLowerCase();
    if (!key || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(key);
  }
  return out;
}

function compactLabel(labels: string[]): string {
  const uniqueLabels = unique(labels);
  const first = uniqueLabels[0] ?? "OpenSanctions maritime record";
  return uniqueLabels.length > 1 ? `${first} + ${uniqueLabels.length - 1} more` : first;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
