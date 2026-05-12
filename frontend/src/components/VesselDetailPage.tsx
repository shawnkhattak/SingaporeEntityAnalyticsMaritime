import { Database, FileText, RefreshCw, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { getVessel, getVesselEvents, getVesselObservations, runMovements, runParticulars } from "../api";
import { formatDate } from "../format";
import type { VesselDetail, VesselEvent, VesselObservation } from "../types";

type VesselDetailPageProps = {
  vesselId: number;
};

export function VesselDetailPage({ vesselId }: VesselDetailPageProps) {
  const [detail, setDetail] = useState<VesselDetail | null>(null);
  const [observations, setObservations] = useState<VesselObservation[]>([]);
  const [events, setEvents] = useState<VesselEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingMovements, setIsRefreshingMovements] = useState(false);

  async function load() {
    setError(null);
    const [nextDetail, nextObservations, nextEvents] = await Promise.all([
      getVessel(vesselId),
      getVesselObservations(vesselId),
      getVesselEvents(vesselId),
    ]);
    setDetail(nextDetail);
    setObservations(nextObservations);
    setEvents(nextEvents);
  }

  async function refreshParticulars() {
    setIsRefreshing(true);
    setError(null);
    try {
      await runParticulars(vesselId);
      await load();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh particulars.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshMovements() {
    setIsRefreshingMovements(true);
    setError(null);
    try {
      await runMovements(vesselId);
      await load();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh movements.");
    } finally {
      setIsRefreshingMovements(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    load()
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "Unable to load vessel."))
      .finally(() => setIsLoading(false));
  }, [vesselId]);

  if (isLoading) {
    return <div className="empty-row">Loading vessel detail.</div>;
  }

  if (!detail) {
    return <div className="empty-row">Vessel not found.</div>;
  }

  const vessel = detail.vessel;
  const latest = detail.latest_position;

  return (
    <>
      <section className="hero compact" aria-labelledby="vessel-title">
        <p className="eyebrow">Vessel detail</p>
        <h1 id="vessel-title">{vessel.name}</h1>
        <p className="lede">{[vessel.imo && `IMO ${vessel.imo}`, vessel.mmsi && `MMSI ${vessel.mmsi}`, vessel.call_sign && `Call sign ${vessel.call_sign}`].filter(Boolean).join(" · ")}</p>
      </section>
      <div className="actions detail-actions">
        <button type="button" onClick={() => void refreshParticulars()} disabled={isRefreshing}>
          <RefreshCw aria-hidden="true" />
          {isRefreshing ? "Refreshing" : "Refresh particulars"}
        </button>
        <button type="button" className="button-secondary" onClick={() => void refreshMovements()} disabled={isRefreshingMovements}>
          <RefreshCw aria-hidden="true" />
          {isRefreshingMovements ? "Refreshing" : "Refresh movements"}
        </button>
        <a className="button-link" href={`/graph?vessel=${vessel.id}`}>Open graph</a>
      </div>
      {error ? <p className="status-message status-message--error">{error}</p> : null}
      <section className="detail-grid">
        <article className="metric-card">
          <Ship aria-hidden="true" />
          <span>Identity</span>
          <strong>{vessel.flag_country_code ?? "No flag"}</strong>
          <p>Type {vessel.vessel_type_code ?? "-"} · Updated {formatDate(vessel.source_updated_at)}</p>
        </article>
        <article className="metric-card">
          <Database aria-hidden="true" />
          <span>Latest position</span>
          <strong>{latest ? `${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}` : "No position"}</strong>
          <p>{latest ? `${formatDate(latest.position_timestamp)} · Evidence ${latest.evidence_id ?? "-"}` : "Run positions ingestion to populate position data."}</p>
        </article>
        <article className="metric-card">
          <FileText aria-hidden="true" />
          <span>Evidence</span>
          <strong>{detail.evidence_ids.length}</strong>
          <p>{detail.evidence_ids.length > 0 ? detail.evidence_ids.map((id) => `#${id}`).join(", ") : "No evidence linked yet."}</p>
        </article>
      </section>
      <section className="logs-section" aria-label="Port activity timeline">
        <h3>Port activity</h3>
        <div className="log-list">
          {events.length === 0 ? (
            <div className="empty-row">No port events linked to this vessel yet.</div>
          ) : (
            events.map((event) => (
              <div className="log-row" key={event.id}>
                <span>{event.event_type}</span>
                <p>{event.port_name ?? event.port_code ?? "Unknown port"} · Evidence {event.evidence_id ?? "-"}</p>
                <time>{formatDate(event.event_time ?? event.created_at)}</time>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="logs-section" aria-label="Raw evidence observations">
        <h3>Evidence observations</h3>
        <div className="log-list">
          {observations.length === 0 ? (
            <div className="empty-row">No observations linked to this vessel yet.</div>
          ) : (
            observations.map((observation) => (
              <div className="log-row" key={observation.id}>
                <span>{observation.source} · {observation.observation_type}</span>
                <p>Evidence #{observation.id} · {observation.source_record_id ?? observation.payload_hash.slice(0, 10)}</p>
                <time>{formatDate(observation.observed_at ?? observation.fetched_at)}</time>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
