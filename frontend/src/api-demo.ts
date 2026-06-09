import type {
  DevState,
  DevVesselBrowseRow,
  Entity,
  EntityRelationship,
  IngestionJob,
  RiskFeedItem,
  RiskFlag,
  SchemaGraph,
  VesselDetail,
  VesselEvent,
  VesselMapFeature,
  VesselObservation,
  VesselSearchResult,
  VesselSummary,
} from "./types";
import { DEMO_VESSELS, DEMO_RISK_FEED, DEMO_NEWS, DEMO_ENTITIES, DEMO_ENTITY_VESSELS, DEMO_HEALTH, DEMO_TABLE_COUNTS, DEMO_PORT_EVENTS, DEMO_GEO_PORTS } from "./demo-data";
import "./demo-overrides.css";

export type { AiNewsOverviewResponse, NewsArticleItem, EvidenceDetail, ReferenceItem, TableBrowseResponse } from "./api";
export type * from "./api";

export const apiBaseUrl = "";
export const DEMO_MODE = true;

const vessels = DEMO_VESSELS as unknown as VesselMapFeature[];
const riskFeed = DEMO_RISK_FEED as unknown as RiskFeedItem[];
const news = DEMO_NEWS as unknown as import("./api").NewsArticleItem[];
const entities = DEMO_ENTITIES as unknown as Entity[];
const health = DEMO_HEALTH as unknown as import("./types").SourceHealth[];
const tableCounts = DEMO_TABLE_COUNTS as unknown as Record<string, number>;
const DEMO_PORT_RADIUS_METERS = 9000;

function toSummary(v: VesselMapFeature): VesselSummary {
  return { id: v.vessel_id, name: v.name, imo: v.imo, mmsi: v.mmsi, call_sign: v.call_sign, flag_country_code: v.flag_country_code, vessel_type_code: v.vessel_type_code, source_updated_at: v.position_timestamp, year_built: v.year_built, deadweight: v.deadweight, gross_tonnage: v.gross_tonnage, length_meters: v.length_meters, breadth_meters: v.breadth_meters, depth_meters: v.depth_meters };
}

function toSearch(v: VesselMapFeature): VesselSearchResult {
  return { ...toSummary(v), latest_position: { latitude: v.latitude, longitude: v.longitude, speed_knots: v.speed_knots, course_degrees: v.course_degrees, heading_degrees: v.heading_degrees, navigational_status: v.navigational_status, position_timestamp: v.position_timestamp, evidence_id: v.evidence_id }, match_fields: ["name"] };
}

type DemoPortPoint = {
  code: string | null;
  name: string;
  latitude: number;
  longitude: number;
};

function portName(properties: Record<string, unknown>, index: number): string {
  const value = properties.OBJNAM ?? properties.objnam ?? properties.S52_DISPLA ?? properties.LNAM;
  return typeof value === "string" && value.trim() ? value.trim() : `Port service point ${index + 1}`;
}

function portCode(properties: Record<string, unknown>): string | null {
  const value = properties.UNLOCODE ?? properties.unlocode ?? properties.LNAM ?? properties.NOID;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function demoPorts(): DemoPortPoint[] {
  const features = ((DEMO_GEO_PORTS as { features?: unknown[] }).features ?? []);
  return features.flatMap((feature, index) => {
    const item = feature as { geometry?: { type?: string; coordinates?: unknown[] }; properties?: Record<string, unknown> };
    const coordinates = item.geometry?.coordinates;
    if (item.geometry?.type !== "Point" || !Array.isArray(coordinates)) return [];
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const properties = item.properties ?? {};
    return [{ code: portCode(properties), name: portName(properties, index), latitude, longitude }];
  });
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radius = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function nearestDemoPort(vessel: VesselMapFeature) {
  const position = { latitude: vessel.latitude, longitude: vessel.longitude };
  return demoPorts().reduce<({ port: DemoPortPoint; distance: number } | null)>((best, port) => {
    const distance = distanceMeters(position, port);
    return !best || distance < best.distance ? { port, distance } : best;
  }, null);
}

function currentDemoPort(vessel: VesselMapFeature): VesselDetail["current_port"] {
  const nearest = nearestDemoPort(vessel);
  if (!nearest || nearest.distance > DEMO_PORT_RADIUS_METERS) return null;
  return {
    code: nearest.port.code,
    name: nearest.port.name,
    distance_meters: nearest.distance,
    detected_at: vessel.position_timestamp,
    radius_meters: DEMO_PORT_RADIUS_METERS,
  };
}

function syntheticPortEvent(vessel: VesselMapFeature): VesselEvent | null {
  const currentPort = currentDemoPort(vessel);
  if (!currentPort) return null;
  return {
    id: 900000 + vessel.vessel_id,
    vessel_id: vessel.vessel_id,
    vessel: toSummary(vessel),
    port_code: currentPort.code,
    port_name: currentPort.name,
    event_type: "port_proximity",
    event_time: currentPort.detected_at,
    distance_meters: currentPort.distance_meters,
    evidence_id: vessel.evidence_id,
    created_at: vessel.position_timestamp,
  };
}

const noop = () => Promise.resolve({} as any);

export async function loadDevState(): Promise<DevState> {
  return { jobs: [], logs: [], health };
}
export const browseDevVessels = () => Promise.resolve([] as DevVesselBrowseRow[]);
export const browseTable = () => Promise.resolve({ table: "", columns: [], rows: [], total: 0, limit: 50, offset: 0 });
export const runTestJob = noop;
export const runPositionsSnapshot = noop;
export const runParticulars = noop;
export const runMapParticulars = noop;
export const cancelMapParticulars = noop;
export const runMovements = noop;
export const runPortActivity = noop;
export const runRefreshLive = noop;
export const runGeoLive = noop;
export const runSanctionsLive = noop;
export const runNewsLive = noop;
export const runRiskRecompute = noop;
export const clearActiveIssues = noop;
export const runSanctionsCsv = noop;
export const runSanctionsCsvUrl = noop;

export function loadMapVessels() { return Promise.resolve(vessels); }

export function searchVessels(query: string, limit = 20) {
  const q = query.toLowerCase();
  return Promise.resolve(
    vessels.filter(v => v.name.toLowerCase().includes(q) || (v.imo?.includes(q) ?? false) || (v.mmsi?.includes(q) ?? false)).slice(0, limit).map(toSearch)
  );
}

export function getVessel(vesselId: number): Promise<VesselDetail> {
  const v = vessels.find(v => v.vessel_id === vesselId);
  if (!v) return Promise.reject(new Error("Not found"));
  return Promise.resolve({
    vessel: toSummary(v),
    latest_position: { latitude: v.latitude, longitude: v.longitude, speed_knots: v.speed_knots, course_degrees: v.course_degrees, heading_degrees: v.heading_degrees, navigational_status: v.navigational_status, position_timestamp: v.position_timestamp, evidence_id: v.evidence_id },
    evidence_ids: (v.risk_flags ?? []).map(f => f.evidence_id).filter((id): id is number => id !== null),
    source_timestamps: { "OCEANS-X": v.position_timestamp },
    linked_entities: [],
    current_port: currentDemoPort(v),
  });
}

export function getVesselObservations() { return Promise.resolve([] as VesselObservation[]); }
export function getVesselEvents(vesselId: number) {
  const v = vessels.find(v => v.vessel_id === vesselId);
  const bakedEvents = (DEMO_PORT_EVENTS as unknown as VesselEvent[]).filter(event => event.vessel_id === vesselId);
  const inferredEvent = v ? syntheticPortEvent(v) : null;
  const hasCurrentPortEvent = inferredEvent && bakedEvents.some(event => event.port_name === inferredEvent.port_name && event.event_type === inferredEvent.event_type);
  return Promise.resolve([
    ...bakedEvents,
    ...(inferredEvent && !hasCurrentPortEvent ? [inferredEvent] : []),
  ]);
}

export function searchEntities(query: string, limit = 20, offset = 0) {
  const q = query.toLowerCase();
  return Promise.resolve(entities.filter(e => e.name.toLowerCase().includes(q)).slice(offset, offset + limit));
}

export function getEntity(entityId: number) {
  return Promise.resolve(entities.find(e => e.id === entityId) ?? entities[0]);
}
export function getEntityVessels(entityId: number) {
  const data = DEMO_ENTITY_VESSELS[String(entityId)];
  return Promise.resolve((data ?? []) as VesselSummary[]);
}
export function getEntityRelationships() { return Promise.resolve([] as EntityRelationship[]); }
export function getEntityRiskFlags(entityId: number) {
  return Promise.resolve(riskFeed.filter(r => r.entity_id === entityId).map(r => r.flag));
}
export function getVesselRiskFlags(vesselId: number) {
  return Promise.resolve(riskFeed.filter(r => r.vessel_id === vesselId));
}
export function getRiskFeed(_limit?: number, _includeResolved?: boolean, flagTypes?: string[]) {
  let feed = riskFeed;
  if (flagTypes && flagTypes.length > 0) feed = feed.filter(r => flagTypes.includes(r.flag.flag_type));
  return Promise.resolve(feed);
}
export function getEntitiesList(limit = 50, offset = 0) {
  return Promise.resolve(entities.slice(offset, offset + limit));
}
export function getNewsList(limit = 50, bundleName?: string) {
  let items = news;
  if (bundleName) items = items.filter(n => n.bundle_name === bundleName);
  return Promise.resolve(items.slice(0, limit));
}

const DEMO_WEEKLY_BRIEF: import("./api").AiNewsOverviewResponse = {
  id: 1,
  status: "ready",
  disabled_reason: null,
  scope: "demo",
  window_hours: 168,
  generated_at: "2026-05-26T23:30:00Z",
  article_count: 95,
  source_count: 8,
  model_provider: "demo",
  model_name: "stored-rss-analyst-brief",
  overview: {
    headline: "Singapore ammonia bunkering, shipbuilding orders, and digital cargo operations lead the week",
    executive_summary: "For a Singapore-focused watchlist, the clearest signal is MPA's authorization of ITOCHU-linked ammonia bunkering trials, which moves future-fuel operations from policy discussion toward controlled port execution. The rest of the brief is commercial and operational rather than incident-led: Singapore-linked fleet ordering, Strategic Marine's CTV work, and autonomous cargo technology all point to how local maritime players are positioning around energy transition, offshore support, and port-adjacent digital operations.",
    key_developments: [
      {
        id: "exec-1",
        label: "MPA authorization moves Singapore ammonia bunkering from concept toward controlled trials.",
        facts: ["Clustered from four stored articles covering the same ITOCHU/MOL ammonia bunkering development.", "Lead source is the stored government-source item; additional trade and social items were treated as supporting coverage."],
        source_type: "mixed",
        confidence: "source_linked",
        why_shown: "Regulatory action by Singapore's port authority directly matches the Singapore bunker and maritime-energy watchlist.",
        support_ids: ["article:225", "article:228", "article:212", "article:236"],
        article_ids: [225, 228, 212, 236],
        evidence_ids: [279246, 292048],
        citations: [
          { id: 225, title: "Singapore Issues First Authorization for Ammonia Bunkering Trials", source: "MPA Singapore Media Releases", url: "https://maritime-executive.com/article/singapore-issues-first-authorization-for-ammonia-bunkering-trials" },
          { id: 228, title: "Singapore Authorises ITOCHU's Ammonia Bunkering Trials At Major Shipping Hub", source: "Marine Insight", url: "https://www.marineinsight.com/singapore-authorises-itochus-ammonia-bunkering-trials-at-major-shipping-hub/" },
        ],
      },
      {
        id: "exec-2",
        label: "Singapore-linked fleet and shipbuilding activity is the main commercial signal.",
        facts: ["Stored articles include Wealth Holdings' large multipurpose order and Strategic Marine's CTV contracts.", "These are commercial capacity signals rather than immediate operational disruptions."],
        source_type: "trade",
        confidence: "source_linked",
        why_shown: "Singapore-linked company activity matches the portfolio watchlist and points to future vessel availability or offshore support demand.",
        support_ids: ["article:233", "article:154"],
        article_ids: [233, 154],
        evidence_ids: [],
        citations: [
          { id: 233, title: "Wealth Holdings expands into large multipurpose segment with four newbuildings", source: "TradeWinds", url: "https://www.tradewindsnews.com/bulkers/wealth-holdings-expands-into-large-multipurpose-segment-with-four-newbuildings/2-1-1993572" },
          { id: 154, title: "Strategic Marine lands order for two new CTVs from Mainprize Offshore", source: "Splash 24/7", url: "https://splash247.com/strategic-marine-lands-order-for-two-new-ctvs-from-mainprize-offshore/" },
        ],
      },
      {
        id: "exec-3",
        label: "Digital cargo operations remain relevant but lower priority than bunkering and fleet signals.",
        facts: ["Stored coverage links Singapore to autonomous cargo operations and virtual twin technology.", "This is an operational-efficiency signal, not an immediate port disruption."],
        source_type: "trade",
        confidence: "source_linked",
        why_shown: "Singapore topic match with relevance to port-adjacent logistics technology and cargo workflow design.",
        support_ids: ["article:177"],
        article_ids: [177],
        evidence_ids: [],
        citations: [
          { id: 177, title: "Dassault Systèmes, iHawk Deploy Virtual Twin Technology for Autonomous Cargo Operations", source: "Maritime News", url: "https://www.marinelink.com/news/dassault-systmes-ihawk-deploy-virtual-539443" },
        ],
      },
    ],
    metric_cards: [
      {
        label: "Selected news",
        value: "4",
        delta: null,
        tone: "neutral",
        why_shown: "Deduplicated from stored RSS and social-feed articles after ranking for operational, regulatory, commercial, and compliance relevance.",
        support_ids: ["article:225", "article:233", "article:154", "article:177"],
        article_ids: [225, 233, 154, 177],
        evidence_ids: [],
        citations: [],
      },
    ],
    vessel_risk_changes: [],
    entity_linkage_changes: [],
    operational_context: [],
    grouped_risk_changes: [],
    grouped_entity_changes: [],
    grouped_operational_context: [],
    news_rows: [
      {
        title: "Singapore authorizes ITOCHU ammonia bunkering trials",
        source: "MPA Singapore Media Releases",
        published_at: "2026-05-22T22:35:18Z",
        url: "https://maritime-executive.com/article/singapore-issues-first-authorization-for-ammonia-bunkering-trials",
        summary: "Singapore's MPA authorized ITOCHU-related ammonia bunkering trials, with supporting stored coverage also naming MOL and planned 2027 demonstrations. This matters because it is a port-authority action tied to alternative-fuel bunkering operations in Singapore. Confidence: High; four stored sources clustered, led by an official/government-source item. Watchlist: Singapore bunker, maritime energy, port operations.",
        source_quality: "Government or port authority source, supported by trade and social-feed coverage",
        source_class: "official",
        matched_to: { type: "topic", label: "Singapore bunkering and alternative marine fuels" },
        why_shown: "Direct regulatory action by the port authority and a strong match to Singapore bunker watchlist terms.",
        support_ids: ["article:225", "article:228", "article:212", "article:236"],
        article_ids: [225, 228, 212, 236],
        evidence_ids: [279246, 292048],
        citations: [
          { id: 225, title: "Singapore Issues First Authorization for Ammonia Bunkering Trials", source: "MPA Singapore Media Releases", url: "https://maritime-executive.com/article/singapore-issues-first-authorization-for-ammonia-bunkering-trials" },
          { id: 228, title: "Singapore Authorises ITOCHU's Ammonia Bunkering Trials At Major Shipping Hub", source: "Marine Insight", url: "https://www.marineinsight.com/singapore-authorises-itochus-ammonia-bunkering-trials-at-major-shipping-hub/" },
        ],
      },
      {
        title: "Wealth Holdings orders large multipurpose newbuildings",
        source: "TradeWinds",
        published_at: "2026-05-25T04:16:24Z",
        url: "https://www.tradewindsnews.com/bulkers/wealth-holdings-expands-into-large-multipurpose-segment-with-four-newbuildings/2-1-1993572",
        summary: "Singapore newcomer Wealth Holdings reportedly ordered four 62,000 dwt multipurpose vessels on a speculative basis. This is lower priority than incidents and regulation, but it signals future project-cargo and multipurpose tonnage availability. Confidence: Medium; single trade-publication article. Watchlist: Singapore shipping companies and fleet availability.",
        source_quality: "Trade publication; single-source commercial order report",
        source_class: "trade",
        matched_to: { type: "topic", label: "Singapore fleet and multipurpose tonnage" },
        why_shown: "Commercial fleet-capacity signal; ranked below incident, security, and regulatory items.",
        support_ids: ["article:233"],
        article_ids: [233],
        evidence_ids: [294449],
        citations: [{ id: 233, title: "Wealth Holdings expands into large multipurpose segment with four newbuildings", source: "TradeWinds", url: "https://www.tradewindsnews.com/bulkers/wealth-holdings-expands-into-large-multipurpose-segment-with-four-newbuildings/2-1-1993572" }],
      },
      {
        title: "Strategic Marine lands CTV order from Mainprize Offshore",
        source: "Splash 24/7",
        published_at: "2026-05-19T11:00:00Z",
        url: "https://splash247.com/strategic-marine-lands-order-for-two-new-ctvs-from-mainprize-offshore/",
        summary: "Singapore-based Strategic Marine signed shipbuilding contracts with Mainprize Offshore for two 33 m Supa Swath crew transfer vessels. The item is commercially relevant because it points to continued demand for Singapore-built offshore support tonnage. Watchlist: Singapore shipbuilding, offshore wind support, CTV capacity.",
        source_quality: "Trade publication; single-source commercial order report",
        source_class: "trade",
        matched_to: { type: "topic", label: "Singapore shipbuilding and offshore support" },
        why_shown: "Singapore company and offshore support vessel relevance.",
        support_ids: ["article:154"],
        article_ids: [154],
        evidence_ids: [251830],
        citations: [{ id: 154, title: "Strategic Marine lands order for two new CTVs from Mainprize Offshore", source: "Splash 24/7", url: "https://splash247.com/strategic-marine-lands-order-for-two-new-ctvs-from-mainprize-offshore/" }],
      },
      {
        title: "Virtual twin technology deployed for Singapore-linked autonomous cargo operations",
        source: "Maritime News",
        published_at: "2026-05-20T12:13:33Z",
        url: "https://www.marinelink.com/news/dassault-systmes-ihawk-deploy-virtual-539443",
        summary: "Stored coverage says Dassault Systèmes and iHawk deployed virtual twin technology for autonomous cargo operations with Singapore relevance. This is not an immediate operational disruption, but it is relevant to port-adjacent automation, cargo workflow design, and future logistics controls. Watchlist: Singapore maritime technology, autonomous cargo operations.",
        source_quality: "Trade publication; single-source technology item",
        source_class: "trade",
        matched_to: { type: "topic", label: "Singapore maritime technology" },
        why_shown: "Singapore topic match with cargo-operations relevance.",
        support_ids: ["article:177"],
        article_ids: [177],
        evidence_ids: [269550],
        citations: [{ id: 177, title: "Dassault Systèmes, iHawk Deploy Virtual Twin Technology for Autonomous Cargo Operations", source: "Maritime News", url: "https://www.marinelink.com/news/dassault-systmes-ihawk-deploy-virtual-539443" }],
      },
    ],
    method_note: "Source-linked facts only. Duplicate ammonia-bunkering articles were clustered; single-source items are labeled in the summaries.",
    metadata: {
      evidence_record_count: 49242,
      active_positioned_vessel_count: 3227,
      candidate_article_count: 95,
      source_health: [],
      gaps: [
        "The stored RSS snapshot provides article titles and summaries, not full article text for every item.",
        "Non-Singapore global incident stories were excluded from this demo brief even when operationally important.",
      ],
      method: [
        "Ranked for operational, commercial, legal, compliance, and strategic relevance.",
        "Clustered duplicate ITOCHU/ammonia bunkering coverage into one development.",
        "Included only articles with direct Singapore, Singapore-company, Singapore-port, or Singapore-watchlist relevance.",
      ],
    },
    platform_signals: {
      new_risk_flags: 49,
      new_port_events: 111,
      new_evidence_records: 18819,
      since: "2026-05-25T17:29:25.832873Z",
    },
    coverage_gaps: [
      "Global vessel incidents were omitted unless the stored article had a direct Singapore link.",
      "No legal, market, or operational conclusion is inferred beyond the stored article metadata.",
      "Low-priority PR was omitted unless tied to Singapore maritime operations, companies, ports, or fleet availability.",
    ],
  },
  debug: {
    input_hash: "demo-stored-rss-analyst-brief",
    cache_hit: true,
    candidate_article_count: 95,
    selected_article_count: 4,
    selected_article_ids: [225, 228, 212, 236, 233, 154, 177],
    reason: "demo_static_brief_rewritten_from_stored_rss",
    warnings: [],
    schema_valid: true,
    input_tokens: null,
    output_tokens: null,
    estimated_cost_usd: null,
  },
};

export function getAiNewsOverview() {
  return Promise.resolve(DEMO_WEEKLY_BRIEF);
}
export const recomputeAiNewsOverview = getAiNewsOverview;
export function getSchemaGraph(): Promise<SchemaGraph> { return Promise.resolve({ nodes: [], edges: [] }); }
export function getGeoLayers() { return Promise.resolve([{ name: "ports_p", endpoint: "" }]); }
export function getGeoLayer(name: string) {
  if (name === "ports_p") return Promise.resolve(DEMO_GEO_PORTS);
  return Promise.resolve({ type: "FeatureCollection", features: [] });
}
export function getDevTableCounts() { return Promise.resolve(tableCounts); }
export function getRecentObservations() { return Promise.resolve([] as VesselObservation[]); }
export function getHealth() { return Promise.resolve({ status: "ok", database: true }); }
export function getPortActivity() {
  return Promise.resolve(DEMO_PORT_EVENTS as unknown as VesselEvent[]);
}
export function getReferenceDomain() { return Promise.resolve([]); }
export function getReferenceSummary() { return Promise.resolve({}); }
export function getEvidence(id: number) {
  return Promise.resolve({ id, source: "OCEANS-X", observation_type: "position_snapshot", observed_at: "2026-05-25T07:32:00Z", fetched_at: "2026-05-25T07:32:00Z", source_record_id: String(id), payload_hash: "a1b2c3d4e5f6", raw_payload: { demo: true, note: "Evidence payload frozen for portfolio demo" } });
}
