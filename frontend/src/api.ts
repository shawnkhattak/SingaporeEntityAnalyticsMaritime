import type {
  DevState,
  DevVesselBrowseRow,
  Entity,
  EntityRelationship,
  GraphRead,
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

export type EvidenceDetail = {
  id: number;
  source: string;
  observation_type: string;
  observed_at: string | null;
  fetched_at: string;
  source_record_id: string | null;
  payload_hash: string;
  raw_payload: Record<string, unknown>;
};

export type ReferenceItem = { code: string; label: string };

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, path));
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await errorMessage(response, path));
  }
  return response.json() as Promise<T>;
}

async function errorMessage(response: Response, path: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // Fall through to a concise transport-level message.
  }
  return `API request failed (${response.status}): ${path}`;
}

let mapVesselsInFlight: Promise<VesselMapFeature[]> | null = null;

export async function loadDevState(): Promise<DevState> {
  const [jobs, logs, health] = await Promise.all([
    getJson<DevState["jobs"]>("/api/dev/ingestion/jobs"),
    getJson<DevState["logs"]>("/api/dev/ingestion/logs"),
    getJson<DevState["health"]>("/api/dev/source-health"),
  ]);
  return { jobs, logs, health };
}

export function browseDevVessels(query = "", limit = 5000) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  return getJson<DevVesselBrowseRow[]>(`/api/dev/vessels?${params.toString()}`);
}

export type TableBrowseResponse = {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
};

export function browseTable(table: string, query = "", limit = 50, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  return getJson<TableBrowseResponse>(`/api/dev/table/${encodeURIComponent(table)}?${params.toString()}`);
}

export function runTestJob() {
  return postJson<IngestionJob>("/api/dev/ingestion/test");
}

export function runPositionsSnapshot() {
  return postJson<IngestionJob>("/api/dev/ingestion/positions-snapshot?mode=live");
}

export function runParticulars(vesselId: number) {
  return postJson<IngestionJob>(`/api/dev/ingestion/vessel-particulars/${vesselId}?mode=live`);
}

export function runMapParticulars(delaySeconds = 0.1) {
  return postJson<IngestionJob>(`/api/dev/ingestion/vessel-particulars-map?delay_seconds=${delaySeconds}`);
}

export function runMovements(vesselId: number) {
  return postJson<IngestionJob>(`/api/dev/ingestion/vessel-movements/${vesselId}?mode=live`);
}

export function runPortActivity(kind: "due-arrive" | "due-depart", date?: string) {
  const params = new URLSearchParams({ kind, mode: "live" });
  if (date) {
    params.set("date", date);
  }
  return postJson<IngestionJob>(`/api/dev/ingestion/port-activity?${params.toString()}`);
}

export function runRefreshLive() {
  return postJson<Record<string, unknown>>("/api/dev/ingestion/refresh-live");
}

export function runGeoLive() {
  return postJson<Record<string, unknown>>("/api/dev/ingestion/geo-layers");
}

export function runSanctionsLive() {
  return postJson<Record<string, unknown>>("/api/dev/ingestion/sanctions?confirm_live=true");
}

export function runNewsLive() {
  return postJson<Record<string, unknown>>("/api/dev/ingestion/news");
}

export function runRiskRecompute(vesselId?: number) {
  return postJson<Record<string, unknown>>(`/api/dev/risk/recompute${vesselId ? `?vessel_id=${vesselId}` : ""}`);
}

export function loadMapVessels(limit = 250) {
  if (limit === 5000 && mapVesselsInFlight) return mapVesselsInFlight;
  const promise = getJson<VesselMapFeature[]>(`/api/map/vessels?limit=${limit}&scope=latest-snapshot`)
    .finally(() => {
      if (mapVesselsInFlight === promise) mapVesselsInFlight = null;
    });
  if (limit === 5000) {
    mapVesselsInFlight = promise;
    return mapVesselsInFlight;
  }
  return promise;
}

export function searchVessels(query: string, limit = 20) {
  return getJson<VesselSearchResult[]>(`/api/vessels/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function getVessel(vesselId: number) {
  return getJson<VesselDetail>(`/api/vessels/${vesselId}`);
}

export function getVesselObservations(vesselId: number) {
  return getJson<VesselObservation[]>(`/api/vessels/${vesselId}/observations?limit=20`);
}

export function getVesselEvents(vesselId: number) {
  return getJson<VesselEvent[]>(`/api/vessels/${vesselId}/events?limit=20`);
}

export function searchEntities(query: string, limit = 20) {
  return getJson<Entity[]>(`/api/entities/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function getEntity(entityId: number) {
  return getJson<Entity>(`/api/entities/${entityId}`);
}

export function getEntityVessels(entityId: number) {
  return getJson<VesselSummary[]>(`/api/entities/${entityId}/vessels`);
}

export function getEntityRelationships(entityId: number) {
  return getJson<EntityRelationship[]>(`/api/entities/${entityId}/relationships`);
}

export function getEntityRiskFlags(entityId: number) {
  return getJson<RiskFlag[]>(`/api/entities/${entityId}/risk-flags`);
}

export function getVesselRiskFlags(vesselId: number) {
  return getJson<RiskFlag[]>(`/api/vessels/${vesselId}/risk-flags`);
}

export function getRiskFeed(limit = 250, includeResolved = false, flagTypes?: string[]) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (includeResolved) {
    params.set("include_resolved", "true");
  }
  if (flagTypes && flagTypes.length > 0) {
    for (const t of flagTypes) params.append("flag_types", t);
  }
  return getJson<RiskFeedItem[]>(`/api/risk/feed?${params.toString()}`);
}

export function getEntitiesList(limit = 50) {
  return getJson<Entity[]>(`/api/entities?limit=${limit}`);
}

export type NewsArticleItem = {
  id: number;
  source: string;
  source_badge: string | null;
  bundle_name: string | null;
  title: string;
  url: string;
  published_at: string | null;
  summary: string | null;
  image: string | null;
};

export function getNewsList(limit = 50, bundleName?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (bundleName) {
    params.set("bundle_name", bundleName);
  }
  return getJson<NewsArticleItem[]>(`/api/news?${params.toString()}`);
}

export function getVesselGraph(vesselId: number) {
  return getJson<GraphRead>(`/api/graph/vessels/${vesselId}`);
}

export function getEntityGraph(entityId: number) {
  return getJson<GraphRead>(`/api/graph/entities/${entityId}`);
}

export function getSchemaGraph() {
  return getJson<SchemaGraph>("/api/meta/schema-graph");
}

export function getGeoLayers() {
  return getJson<{ name: string; endpoint: string }[]>("/api/geo/layers");
}

export function getGeoLayer(name: string) {
  return getJson<Record<string, unknown>>(`/api/geo/layers/${name}`);
}

export function getDevTableCounts() {
  return getJson<Record<string, number>>("/api/dev/table-counts");
}

export function getRecentObservations() {
  return getJson<VesselObservation[]>("/api/dev/observations?limit=20");
}

// ===== New helpers (design/wiring.md §7.2) =====

export function getHealth() {
  return getJson<{ status: string; database: boolean }>("/api/health");
}

export function getPortActivity(kind: "due-arrive" | "due-depart", limit = 100, date?: string) {
  const params = new URLSearchParams({ kind, limit: String(limit) });
  if (date) {
    params.set("date", date);
  }
  return getJson<VesselEvent[]>(`/api/ports/activity?${params.toString()}`);
}

export function getReferenceDomain(domain: string) {
  return getJson<ReferenceItem[]>(`/api/reference/${domain}`);
}

export function getReferenceSummary() {
  return getJson<Record<string, number>>("/api/dev/reference/summary");
}

export function getEvidence(id: number) {
  return getJson<EvidenceDetail>(`/api/evidence/${id}`);
}

export async function runSanctionsCsv(csv: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl}/api/dev/ingestion/sanctions-csv`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csv,
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "/api/dev/ingestion/sanctions-csv"));
  }
  return (await response.json()) as Record<string, unknown>;
}

export function runSanctionsCsvUrl() {
  return postJson<Record<string, unknown>>("/api/dev/ingestion/sanctions-csv-url");
}
