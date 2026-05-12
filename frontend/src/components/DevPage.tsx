import { Activity, AlertTriangle, ClipboardList, Map, Play, RefreshCw, Search, Shield, Ship } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { browseDevVessels, getDevTableCounts, getRecentObservations, loadDevState, runGeoLive, runNewsLive, runPositionsSnapshot, runRefreshLive, runRiskRecompute, runSanctionsLive, runTestJob } from "../api";
import { formatCount, formatDate, formatInserted, formatPositionsSummary, formatUnknown } from "../format";
import type { DevState, DevVesselBrowseRow, VesselMapFeature, VesselObservation } from "../types";
import { VesselMapPreview } from "./VesselMapPreview";

const emptyDevState: DevState = {
  jobs: [],
  logs: [],
  health: [],
};

export function DevPage() {
  const [devState, setDevState] = useState<DevState>(emptyDevState);
  const [vessels, setVessels] = useState<VesselMapFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningPositions, setIsRunningPositions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState<VesselObservation[]>([]);
  const [browseRows, setBrowseRows] = useState<DevVesselBrowseRow[]>([]);
  const [vesselQuery, setVesselQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "flagged" | "critical" | "high" | "medium" | "low">("all");
  const [page, setPage] = useState(0);

  const latestJob = useMemo(() => devState.jobs[0], [devState.jobs]);
  const latestPositionsJob = useMemo(
    () => devState.jobs.find((job) => job.job_type === "oceansx.positions_snapshot"),
    [devState.jobs],
  );
  const positionsCounts = latestPositionsJob?.parameters ?? {};
  const filteredBrowseRows = useMemo(() => {
    return browseRows.filter((row) => {
      if (riskFilter === "all") return true;
      if (riskFilter === "flagged") return row.risk_flags_count > 0;
      return row.highest_risk_severity === riskFilter;
    });
  }, [browseRows, riskFilter]);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filteredBrowseRows.length / pageSize));
  const visibleBrowseRows = filteredBrowseRows.slice(page * pageSize, page * pageSize + pageSize);
  const mapVessels = useMemo(() => browseRows.flatMap(toMapFeature), [browseRows]);
  const riskSummary = useMemo(() => {
    return browseRows.reduce<Record<string, number>>((summary, row) => {
      const key = row.highest_risk_severity ?? "none";
      summary[key] = (summary[key] ?? 0) + 1;
      return summary;
    }, {});
  }, [browseRows]);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const state = await loadDevState();
      setDevState({ jobs: state.jobs, logs: state.logs, health: state.health });
      setVessels(state.vessels);
      const [counts, nextObservations, nextBrowseRows] = await Promise.all([getDevTableCounts(), getRecentObservations(), browseDevVessels(vesselQuery)]);
      setTableCounts(counts);
      setObservations(nextObservations);
      setBrowseRows(nextBrowseRows);
      setPage(0);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load dev state.");
    } finally {
      setIsLoading(false);
    }
  }

  async function run(action: "test" | "positions") {
    if (action === "test") {
      setIsRunning(true);
    } else {
      setIsRunningPositions(true);
    }
    setError(null);
    try {
      await (action === "test" ? runTestJob() : runPositionsSnapshot());
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to run ingestion.");
    } finally {
      setIsRunning(false);
      setIsRunningPositions(false);
      setIsLoading(false);
    }
  }

  async function runUtility(action: () => Promise<unknown>) {
    setIsRunning(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to run control.");
    } finally {
      setIsRunning(false);
    }
  }

  async function runSanctionsApi() {
    if (!window.confirm("This will spend one OpenSanctions API request from the monthly quota.")) {
      return;
    }
    await runUtility(runSanctionsLive);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      browseDevVessels(vesselQuery)
        .then((rows) => {
          setBrowseRows(rows);
          setPage(0);
        })
        .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "Unable to browse vessels."));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [vesselQuery]);

  return (
    <>
      <section className="hero compact" aria-labelledby="dev-page-title">
        <p className="eyebrow">Development operations</p>
        <h1 id="dev-page-title">Manual ingestion control surface</h1>
        <p className="lede">Live source controls, health, logs, and database-backed vessel positions. Fixture replay has been removed.</p>
      </section>

      <section className="dev-panel" aria-labelledby="dev-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Controls</p>
            <h2 id="dev-title">Ingestion jobs</h2>
          </div>
          <div className="actions">
            <button type="button" onClick={() => void run("positions")} disabled={isRunningPositions}>
              <Ship aria-hidden="true" />
              {isRunningPositions ? "Running" : "Run positions snapshot"}
            </button>
            <button type="button" onClick={() => void run("test")} disabled={isRunning}>
              <Play aria-hidden="true" />
              {isRunning ? "Running" : "Run test"}
            </button>
            <button type="button" className="button-secondary" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
            <button type="button" className="button-secondary" onClick={() => void runUtility(runRefreshLive)} disabled={isRunning}>Refresh live</button>
            <button type="button" className="button-secondary" onClick={() => void runUtility(runGeoLive)} disabled={isRunning}>Geo live</button>
            <button type="button" className="button-secondary" onClick={() => void runSanctionsApi()} disabled={isRunning}>Sanctions API</button>
            <button type="button" className="button-secondary" onClick={() => void runUtility(runNewsLive)} disabled={isRunning}>News RSS</button>
            <button type="button" className="button-secondary" onClick={() => void runUtility(() => runRiskRecompute())} disabled={isRunning}>Risk</button>
          </div>
        </div>

        {error ? <p className="status-message status-message--error">{error}</p> : null}

        <div className="ops-grid">
          <article className="metric-card">
            <Map aria-hidden="true" />
            <span>Map read model</span>
            <strong>{isLoading ? "Loading" : vessels.length}</strong>
            <p>{vessels.length > 0 ? `Newest position at ${formatDate(vessels[0].position_timestamp)}` : "Waiting for database-backed vessel positions."}</p>
          </article>
          <article className="metric-card">
            <Activity aria-hidden="true" />
            <span>Source health</span>
            <strong>{devState.health[0]?.status ?? (isLoading ? "Loading" : "No source")}</strong>
            <p>{devState.health[0] ? `${devState.health[0].source} checked ${formatDate(devState.health[0].last_checked_at)}` : "Run the test job to create a source health row."}</p>
          </article>
          <article className="metric-card">
            <ClipboardList aria-hidden="true" />
            <span>Latest job</span>
            <strong>{latestJob?.status ?? (isLoading ? "Loading" : "No jobs")}</strong>
            <p>{latestJob ? `${latestJob.job_type} at ${formatDate(latestJob.created_at)}` : "No ingestion jobs have been recorded yet."}</p>
          </article>
          <article className="metric-card">
            <Ship aria-hidden="true" />
            <span>Vessels loaded</span>
            <strong>{tableCounts.vessels ?? browseRows.length}</strong>
            <p>{latestPositionsJob ? formatPositionsSummary(positionsCounts) : "Run live positions ingestion to load OCEANS-X rows."}</p>
          </article>
          <article className="metric-card">
            <Shield aria-hidden="true" />
            <span>Active vessel risk</span>
            <strong>{formatCount((riskSummary.critical ?? 0) + (riskSummary.high ?? 0) + (riskSummary.medium ?? 0) + (riskSummary.low ?? 0))}</strong>
            <p>{riskSummary.critical ?? 0} critical, {riskSummary.high ?? 0} high, {riskSummary.medium ?? 0} medium, {riskSummary.low ?? 0} low.</p>
          </article>
        </div>

        <section className="dev-map-section" aria-label="Vessel map preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Map preview</p>
              <h2>All loaded vessel positions</h2>
            </div>
            <a className="button-link" href="/map">Open full map</a>
          </div>
          <VesselMapPreview vessels={mapVessels} />
        </section>

        <section className="logs-section" aria-label="Vessel browser">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Browse</p>
              <h2>Vessels and risk flags</h2>
            </div>
            <div className="browse-controls">
              <label className="search-control">
                <Search aria-hidden="true" />
                <input value={vesselQuery} onChange={(event) => setVesselQuery(event.target.value)} placeholder="Search name, IMO, MMSI, call sign" />
              </label>
              <select value={riskFilter} onChange={(event) => { setRiskFilter(event.target.value as typeof riskFilter); setPage(0); }}>
                <option value="all">All vessels</option>
                <option value="flagged">Any risk flag</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table className="browse-table">
              <thead>
                <tr>
                  <th>Vessel</th>
                  <th>IMO</th>
                  <th>Position</th>
                  <th>Risk</th>
                  <th>Flags</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleBrowseRows.map((row) => (
                  <tr key={row.vessel_id}>
                    <td><a href={`/vessels/${row.vessel_id}`}>{row.name}</a></td>
                    <td>{row.imo ?? row.mmsi ?? row.call_sign ?? "Unknown"}</td>
                    <td>{row.latest_position ? `${row.latest_position.latitude.toFixed(3)}, ${row.latest_position.longitude.toFixed(3)}` : "No position"}</td>
                    <td>{row.highest_risk_severity ? <span className={`pill risk-${row.highest_risk_severity}`}><AlertTriangle aria-hidden="true" />{row.highest_risk_severity}</span> : <span className="muted-inline">none</span>}</td>
                    <td>{row.risk_flag_types.length > 0 ? row.risk_flag_types.join(", ") : "None"}</td>
                    <td>{formatDate(row.latest_position?.position_timestamp ?? row.source_updated_at ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="button-secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button>
            <span>{filteredBrowseRows.length} vessels · page {page + 1} of {pageCount}</span>
            <button type="button" className="button-secondary" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1}>Next</button>
          </div>
        </section>

        <div className="table-layout">
          <section aria-label="Recent ingestion jobs">
            <h3>Recent jobs</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Mode</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {devState.jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.id}</td>
                      <td>{job.job_type}</td>
                      <td><span className="pill">{job.status}</span></td>
                      <td>{formatUnknown(job.parameters.mode)}</td>
                      <td>{formatDate(job.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Database-backed vessel positions">
            <h3>Newest map vessels</h3>
            <div className="log-list">
              {vessels.length === 0 ? (
                <div className="empty-row">No vessel positions have been stored yet.</div>
              ) : (
                vessels.map((vessel) => (
                  <a className="log-row linked-row" href={`/vessels/${vessel.vessel_id}`} key={vessel.vessel_id}>
                    <span>{vessel.imo ?? vessel.mmsi ?? "ID"}</span>
                    <p>{vessel.name}</p>
                    <time>{vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}</time>
                  </a>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="logs-section" aria-label="Recent ingestion logs">
          <h3>Recent logs</h3>
          <div className="log-list">
            {devState.logs.length === 0 ? (
              <div className="empty-row">No ingestion logs have been recorded yet.</div>
            ) : (
              devState.logs.map((log) => (
                <div className="log-row" key={log.id}>
                  <span>{log.level}</span>
                  <p>{log.message}</p>
                  <time>{formatDate(log.created_at)}</time>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="logs-section" aria-label="Database counts">
          <h3>Table counts</h3>
          <div className="results-grid">
            {Object.entries(tableCounts).map(([name, count]) => (
              <article className="metric-card" key={name}><span>{name}</span><strong>{count}</strong><p>Current persisted rows.</p></article>
            ))}
          </div>
        </section>
        <section className="logs-section" aria-label="Recent observations">
          <h3>Recent observations</h3>
          <div className="log-list">
            {observations.map((observation) => (
              <div className="log-row" key={observation.id}>
                <span>{observation.source} · {observation.observation_type}</span>
                <p>Evidence #{observation.id} · {observation.source_record_id ?? observation.payload_hash.slice(0, 8)}</p>
                <time>{formatDate(observation.fetched_at)}</time>
              </div>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function toMapFeature(row: DevVesselBrowseRow): VesselMapFeature[] {
  if (!row.latest_position) {
    return [];
  }
  return [{
    vessel_id: row.vessel_id,
    name: row.name,
    imo: row.imo,
    mmsi: row.mmsi,
    call_sign: row.call_sign,
    flag_country_code: row.flag_country_code,
    vessel_type_code: row.vessel_type_code,
    ...row.latest_position,
  }];
}
