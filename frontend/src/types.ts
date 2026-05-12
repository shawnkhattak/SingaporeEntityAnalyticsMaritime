export type IngestionJob = {
  id: number;
  job_type: string;
  status: string;
  requested_by: string | null;
  parameters: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type IngestionLog = {
  id: number;
  job_id: number;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
};

export type SourceHealth = {
  id: number;
  source: string;
  status: string;
  last_checked_at: string | null;
  last_success_at: string | null;
};

export type VesselPosition = {
  latitude: number;
  longitude: number;
  speed_knots: number | null;
  course_degrees: number | null;
  heading_degrees: number | null;
  navigational_status: string | null;
  position_timestamp: string;
  evidence_id: number | null;
};

export type VesselMapFeature = VesselPosition & {
  vessel_id: number;
  name: string;
  imo: string | null;
  mmsi: string | null;
  call_sign: string | null;
  flag_country_code: string | null;
  vessel_type_code: string | null;
};

export type DevVesselBrowseRow = {
  vessel_id: number;
  name: string;
  imo: string | null;
  mmsi: string | null;
  call_sign: string | null;
  flag_country_code: string | null;
  vessel_type_code: string | null;
  source_updated_at: string | null;
  latest_position: VesselPosition | null;
  risk_flags_count: number;
  highest_risk_severity: string | null;
  risk_flag_types: string[];
};

export type VesselSummary = {
  id: number;
  imo: string | null;
  mmsi: string | null;
  name: string;
  call_sign: string | null;
  flag_country_code: string | null;
  vessel_type_code: string | null;
  source_updated_at: string | null;
};

export type VesselSearchResult = VesselSummary & {
  latest_position: VesselPosition | null;
  match_fields: string[];
};

export type VesselDetail = {
  vessel: VesselSummary;
  latest_position: VesselPosition | null;
  evidence_ids: number[];
  source_timestamps: Record<string, string | null>;
};

export type VesselObservation = {
  id: number;
  source: string;
  observation_type: string;
  source_record_id: string | null;
  observed_at: string | null;
  fetched_at: string;
  payload_hash: string;
  raw_payload: Record<string, unknown>;
};

export type VesselEvent = {
  id: number;
  vessel_id: number | null;
  port_code: string | null;
  port_name: string | null;
  event_type: string;
  event_time: string | null;
  evidence_id: number | null;
  created_at: string;
};

export type DevState = {
  jobs: IngestionJob[];
  logs: IngestionLog[];
  health: SourceHealth[];
};

export type Entity = {
  id: number;
  entity_type: string;
  name: string;
  country_code: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EntityRelationship = {
  id: number;
  relationship_type: string;
  confidence: string;
  evidence_id: number | null;
  evidence_summary: string | null;
  vessel: VesselSummary | null;
};

export type RiskFlag = {
  id: number;
  vessel_id: number | null;
  entity_id: number | null;
  flag_type: string;
  severity: string;
  summary: string;
  evidence_id: number | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type GraphNode = { id: string; type: string; label: string; summary: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; type: string; confidence: string | null; evidence_id: number | null; summary: string | null };
export type GraphRead = { nodes: GraphNode[]; edges: GraphEdge[] };

export type SchemaGraph = {
  nodes: { id: string; label: string; domain: string; columns: string[] }[];
  edges: { source: string; target: string; label: string }[];
};
