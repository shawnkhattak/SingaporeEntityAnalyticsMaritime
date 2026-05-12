import type { DevState, DevVesselBrowseRow, Entity, EntityRelationship, GraphRead, IngestionJob, RiskFlag, SchemaGraph, VesselDetail, VesselEvent, VesselMapFeature, VesselObservation, VesselSearchResult, VesselSummary } from "./types";

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

export async function loadDevState(): Promise<DevState & { vessels: VesselMapFeature[] }> {
  const [jobs, logs, health, vessels] = await Promise.all([
    getJson<DevState["jobs"]>("/api/dev/ingestion/jobs"),
    getJson<DevState["logs"]>("/api/dev/ingestion/logs"),
    getJson<DevState["health"]>("/api/dev/source-health"),
    getJson<VesselMapFeature[]>("/api/map/vessels?limit=25"),
  ]);
  return { jobs, logs, health, vessels };
}

export function browseDevVessels(query = "", limit = 5000) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  return getJson<DevVesselBrowseRow[]>(`/api/dev/vessels?${params.toString()}`);
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

export function runMovements(vesselId: number) {
  return postJson<IngestionJob>(`/api/dev/ingestion/vessel-movements/${vesselId}?mode=live`);
}

export function runPortActivity(kind: "due-arrive" | "due-depart") {
  return postJson<IngestionJob>(`/api/dev/ingestion/port-activity?kind=${kind}&mode=live`);
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
  return getJson<VesselMapFeature[]>(`/api/map/vessels?limit=${limit}`);
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
