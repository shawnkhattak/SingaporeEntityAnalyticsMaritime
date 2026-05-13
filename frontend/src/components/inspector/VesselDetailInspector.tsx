import { Database, FileText, Network, RefreshCw, Ship } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVessel, getVesselEvents, getVesselGraph, getVesselObservations, getVesselRiskFlags, runMovements, runParticulars, runRiskRecompute } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { recordRecentVessel, useApp, useJobRunner, useSelection } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { ErrorState } from "../primitives/ErrorState";
import { Skeleton } from "../primitives/Skeleton";
import type { GraphRead, RiskFlag, VesselDetail, VesselEvent, VesselObservation } from "../../types";
import { formatDate, formatRelative } from "../../format";
import { countryName, flagEmoji, vesselTypeLabel } from "../../labels";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { RiskCard } from "./RiskCard";
import { InspectorShell } from "./InspectorShell";

type Loaded = {
  detail: VesselDetail;
  observations: VesselObservation[];
  events: VesselEvent[];
  risk: RiskFlag[];
};

const TABS = ["Overview", "Port calls", "Evidence", "Risk", "Graph"];

export function VesselDetailInspector({ id }: { id: number }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [graph, setGraph] = useState<GraphRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const { dispatch } = useApp();
  const { select } = useSelection();
  const runJob = useJobRunner();

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getVessel(id), getVesselObservations(id), getVesselEvents(id), getVesselRiskFlags(id)])
      .then(([detail, obs, events, risk]) => {
        const loaded = { detail, observations: obs, events, risk };
        setData(loaded);
        dispatch({ type: "CACHE_VESSEL_RISK", id, flags: risk });
        select({ kind: "vessel", id });
        recordRecentVessel(id);
        if (detail.latest_position) {
          requestMapCenter({
            lng: detail.latest_position.longitude,
            lat: detail.latest_position.latitude,
            zoom: 8,
          });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab !== 4 || graph) return;
    getVesselGraph(id).then(setGraph).catch(() => setGraph({ nodes: [], edges: [] }));
  }, [tab, graph, id]);

  if (loading && !data) {
    return (
      <InspectorShell breadcrumb="Vessel" title="Loading…" onClose={() => window.history.back()}>
        <Skeleton height={32} />
        <div className="col" style={{ marginTop: 12, gap: 8 }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </InspectorShell>
    );
  }

  if (error || !data) {
    return (
      <InspectorShell breadcrumb="Vessel" title="Could not load" onClose={() => window.history.back()}>
        <ErrorState title="Vessel unavailable" body={error ?? "No data."} onRetry={load} />
      </InspectorShell>
    );
  }

  const v = data.detail.vessel;
  const latest = data.detail.latest_position;
  const tabItems = [
    { label: "Overview" },
    { label: "Port calls", count: data.events.length },
    { label: "Evidence", count: data.observations.length },
    { label: "Risk", count: data.risk.length },
    { label: "Graph" },
  ];

  return (
    <InspectorShell
      breadcrumb="Vessel"
      title={v.name}
      tabs={tabItems}
      activeTab={tab}
      onTabChange={setTab}
      onClose={() => window.history.back()}
      footer={
        tab === 0 ? (
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<RefreshCw size={12} />}
              onClick={() =>
                runJob(`particulars-${id}`, () => runParticulars(id), {
                  successTitle: "Particulars refreshed",
                  errorTitle: "Particulars failed",
                }).then(load)
              }
            >
              Refresh particulars
            </Button>
            <Button
              size="sm"
              leadingIcon={<RefreshCw size={12} />}
              onClick={() =>
                runJob(`movements-${id}`, () => runMovements(id), {
                  successTitle: "Movements refreshed",
                  errorTitle: "Movements failed",
                }).then(load)
              }
            >
              Refresh movements
            </Button>
            <Button size="sm" leadingIcon={<Network size={12} />} onClick={() => navigateTo(`/graph?subject=vessel&id=${id}`)}>
              Open in graph
            </Button>
          </div>
        ) : tab === 3 ? (
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<RefreshCw size={12} />}
            onClick={() =>
              runJob(`risk-recompute-${id}`, () => runRiskRecompute(id), {
                successTitle: "Risk recomputed",
                errorTitle: "Risk recompute failed",
              }).then(load)
            }
          >
            Recompute risk for this vessel
          </Button>
        ) : null
      }
    >
      {tab === 0 && (
        <div className="col" style={{ gap: 14 }}>
          <div className="mono t-muted" style={{ fontSize: 12 }}>
            {[v.imo && `IMO ${v.imo}`, v.mmsi && `MMSI ${v.mmsi}`, v.call_sign && v.call_sign].filter(Boolean).join(" · ") || "—"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Metric label="Latest position" value={latest ? `${latest.latitude.toFixed(3)}, ${latest.longitude.toFixed(3)}` : "—"} sub={latest ? formatDate(latest.position_timestamp) : "No position yet"} icon={<Ship size={14} />} />
            <Metric
              label="Identity"
              value={
                v.flag_country_code ? (
                  <span
                    title={countryName(v.flag_country_code) || v.flag_country_code}
                    aria-label={countryName(v.flag_country_code) || v.flag_country_code}
                    style={{ cursor: "help" }}
                  >
                    {flagEmoji(v.flag_country_code) || v.flag_country_code}
                  </span>
                ) : (
                  "No flag"
                )
              }
              sub={`Type ${vesselTypeLabel(v.vessel_type_code)}`}
              icon={<Database size={14} />}
            />
            <Metric label="Evidence" value={data.detail.evidence_ids.length} sub="linked observations" icon={<FileText size={14} />} />
            <Metric label="Open risk" value={data.risk.filter((f) => f.status !== "resolved").length} sub="active flags" icon={<RefreshCw size={14} />} />
          </div>
          {data.risk.length > 0 && (
            <div>
              <div className="t-caption" style={{ paddingBottom: 6 }}>Top risk flags</div>
              <div className="col" style={{ gap: 4 }}>
                {data.risk.slice(0, 3).map((flag) => (
                  <RiskCard key={flag.id} flag={flag} subject={v.name} vesselId={id} onOpenSubject={() => undefined} />
                ))}
              </div>
            </div>
          )}

          <SourceConfidence observations={data.observations} events={data.events} risk={data.risk} />

          {data.events.length > 0 && (
            <div>
              <div className="t-caption" style={{ paddingBottom: 6 }}>Recent movement</div>
              <div className="col" style={{ gap: 4 }}>
                {data.events.slice(0, 4).map((e) => (
                  <div key={e.id} className="card" style={{ padding: "8px 10px" }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="pill info" style={{ fontSize: 10 }}>{e.event_type}</span>
                      <span style={{ flex: 1, fontSize: 12 }}>{e.port_name ?? e.port_code ?? "Unknown port"}</span>
                      <span className="t-faded" style={{ fontSize: 11 }}>{formatRelative(e.event_time ?? e.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="col" style={{ gap: 6 }}>
          {data.events.length === 0 ? (
            <EmptyState icon={<Ship size={18} />} title="No port events yet" body="Refresh movements or wait for the next ingestion." />
          ) : (
            data.events.map((e) => (
              <div key={e.id} className="card" style={{ padding: "10px 12px" }}>
                <div className="row">
                  <span className="pill info">{e.event_type}</span>
                  <span style={{ flex: 1 }}>{e.port_name ?? e.port_code ?? "Unknown port"}</span>
                  <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(e.event_time ?? e.created_at)}</span>
                </div>
                <EvidenceLink id={e.evidence_id} variant="chip" />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="col" style={{ gap: 6 }}>
          {data.observations.length === 0 ? (
            <EmptyState title="No evidence observations" />
          ) : (
            data.observations.map((obs) => (
              <a key={obs.id} href={`/evidence/${obs.id}`} className="card" style={{ padding: "10px 12px", textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="row">
                  <span className="t-h2" style={{ flex: 1 }}>{obs.source}</span>
                  <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(obs.observed_at ?? obs.fetched_at)}</span>
                </div>
                <div className="t-faded mono" style={{ fontSize: 11 }}>
                  {obs.observation_type} · {obs.source_record_id ?? obs.payload_hash.slice(0, 10)}
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {tab === 3 && (
        <div className="col" style={{ gap: 6 }}>
          {data.risk.length === 0 ? (
            <EmptyState compact title="No risk flags" body="This vessel currently has no risk signals." />
          ) : (
            data.risk.map((flag) => <RiskCard key={flag.id} flag={flag} subject={v.name} vesselId={id} onOpenSubject={() => undefined} />)
          )}
        </div>
      )}

      {tab === 4 && <GraphPreview graph={graph} />}
    </InspectorShell>
  );
}

function Metric({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-label row" style={{ gap: 4 }}>{icon}{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function SourceConfidence({ observations, events, risk }: { observations: VesselObservation[]; events: VesselEvent[]; risk: RiskFlag[] }) {
  // Roll up distinct sources per data dimension. Empty cells render a
  // subtle "—" so the matrix still communicates "we have nothing on
  // this dimension yet".
  const bySource = useMemo(() => {
    const sources = new Set<string>();
    observations.forEach((o) => sources.add(o.source));
    return Array.from(sources);
  }, [observations]);
  const positionSources = useMemo(
    () => new Set(observations.filter((o) => o.observation_type === "positions" || o.observation_type === "position").map((o) => o.source)).size,
    [observations],
  );
  const movementsCount = events.length;
  const riskCount = risk.length;

  return (
    <div>
      <div className="t-caption" style={{ paddingBottom: 6 }}>Source confidence</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        <ConfidenceCell label="Identity" value={bySource.length || "—"} hint={bySource.join(", ") || "no sources"} />
        <ConfidenceCell label="Position" value={positionSources || "—"} hint={`${positionSources} reporting sources`} />
        <ConfidenceCell label="Movements" value={movementsCount || "—"} hint={`${movementsCount} port events`} />
        <ConfidenceCell label="Risk" value={riskCount || "—"} hint={`${riskCount} flags`} />
      </div>
    </div>
  );
}

function ConfidenceCell({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div className="card" style={{ padding: "6px 8px" }} title={hint}>
      <div className="t-caption" style={{ fontSize: 9 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: typeof value === "number" && value > 0 ? "var(--ocean-500)" : "var(--slate-400)" }}>
        {value}
      </div>
    </div>
  );
}

function GraphPreview({ graph }: { graph: GraphRead | null }) {
  if (!graph) return <Skeleton height={120} />;
  if (graph.nodes.length === 0) return <EmptyState title="No graph data" body="Try refreshing particulars or movements." />;
  const nodesByType = useMemo(() => {
    const out: Record<string, number> = {};
    graph.nodes.forEach((n) => {
      out[n.type] = (out[n.type] ?? 0) + 1;
    });
    return out;
  }, [graph]);
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="card" style={{ padding: 12 }}>
        <div className="t-caption">Graph summary</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {Object.entries(nodesByType).map(([type, count]) => (
            <span key={type} className="pill">{type} · {count}</span>
          ))}
        </div>
      </div>
      <Button leadingIcon={<Network size={14} />} onClick={() => navigateTo(`/graph?subject=vessel&id=${graph.nodes[0]?.id?.split(":")[1] ?? ""}`)}>
        Open full graph
      </Button>
    </div>
  );
}
