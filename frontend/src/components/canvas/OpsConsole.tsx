import { Activity, ClipboardList, Database, Map as MapIcon, Play, RefreshCw, Search, Ship, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  browseDevVessels,
  getDevTableCounts,
  getRecentObservations,
  getReferenceSummary,
  loadDevState,
  runGeoLive,
  runNewsLive,
  runPortActivity,
  runPositionsSnapshot,
  runRefreshLive,
  runRiskRecompute,
  runSanctionsCsv,
  runSanctionsCsvUrl,
  runSanctionsLive,
  runTestJob,
  searchVessels,
  runMovements,
  runParticulars,
} from "../../api";
import { usePoll } from "../../hooks/usePoll";
import { useApp, useJobRunner, useRunningJobs } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { classifyHealth, classifyJob, HealthPill, JobPill, RiskPill } from "../primitives/Pill";
import { Modal } from "../primitives/Modal";
import { Skeleton } from "../primitives/Skeleton";
import type { DevVesselBrowseRow, IngestionJob, IngestionLog, SourceHealth, VesselObservation, VesselSearchResult } from "../../types";
import { formatDate } from "../../format";

const PAGE_SIZE = 25;

export function OpsConsole() {
  const { state, dispatch } = useApp();
  const runJob = useJobRunner();
  const { isRunning } = useRunningJobs();
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [observations, setObservations] = useState<VesselObservation[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [referenceSummary, setReferenceSummary] = useState<Record<string, number>>({});
  const [browseRows, setBrowseRows] = useState<DevVesselBrowseRow[]>([]);
  const [browseQuery, setBrowseQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "flagged" | "critical" | "high" | "medium" | "low">("all");
  const [page, setPage] = useState(0);
  const [logLevel, setLogLevel] = useState<"all" | "info" | "warning" | "error">("all");
  const [confirmSanctions, setConfirmSanctions] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [vesselQuery, setVesselQuery] = useState("");
  const [vesselSuggestions, setVesselSuggestions] = useState<VesselSearchResult[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<VesselSearchResult | null>(null);

  async function refreshDev() {
    try {
      const dev = await loadDevState();
      dispatch({ type: "SET_JOBS", jobs: dev.jobs });
      dispatch({ type: "SET_HEALTH", health: dev.health });
      setLogs(dev.logs);
      const [counts, obs, ref, rows] = await Promise.all([
        getDevTableCounts().catch(() => ({})),
        getRecentObservations().catch(() => []),
        getReferenceSummary().catch(() => ({})),
        browseDevVessels(browseQuery).catch(() => []),
      ]);
      setTableCounts(counts);
      setObservations(obs);
      setReferenceSummary(ref);
      setBrowseRows(rows);
      dispatch({ type: "SET_TABLE_COUNTS", counts });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refreshDev();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePoll(refreshDev, 10_000);

  // Debounce browse query.
  useEffect(() => {
    const id = window.setTimeout(() => {
      browseDevVessels(browseQuery).then((rows) => {
        setBrowseRows(rows);
        setPage(0);
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(id);
  }, [browseQuery]);

  // Vessel autocomplete for manual actions.
  useEffect(() => {
    const trimmed = vesselQuery.trim();
    if (!trimmed) {
      setVesselSuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      searchVessels(trimmed, 6).then(setVesselSuggestions).catch(() => setVesselSuggestions([]));
    }, 200);
    return () => window.clearTimeout(id);
  }, [vesselQuery]);

  const filteredBrowse = useMemo(() => {
    return browseRows.filter((row) => {
      if (riskFilter === "all") return true;
      if (riskFilter === "flagged") return row.risk_flags_count > 0;
      return row.highest_risk_severity === riskFilter;
    });
  }, [browseRows, riskFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredBrowse.length / PAGE_SIZE));
  const visible = filteredBrowse.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function logColor(level: string): "info" | "med" | "crit" | "default" {
    const lvl = level.toLowerCase();
    if (lvl === "error") return "crit";
    if (lvl === "warning" || lvl === "warn") return "med";
    if (lvl === "info") return "info";
    return "default";
  }

  const visibleLogs = useMemo(() => {
    if (logLevel === "all") return logs;
    return logs.filter((l) => l.level.toLowerCase() === logLevel);
  }, [logs, logLevel]);

  async function handleSanctionsCsvFile(file: File) {
    const text = await file.text();
    await runJob("sanctions-csv", () => runSanctionsCsv(text), {
      successTitle: "Sanctions CSV ingested",
      errorTitle: "Sanctions CSV failed",
    });
    refreshDev();
  }

  function exportBrowseCsv() {
    const header = ["vessel_id", "name", "imo", "mmsi", "flag", "type", "lat", "lon", "risk", "updated"];
    const rows = filteredBrowse.map((r) => [
      r.vessel_id,
      r.name,
      r.imo ?? "",
      r.mmsi ?? "",
      r.flag_country_code ?? "",
      r.vessel_type_code ?? "",
      r.latest_position?.latitude ?? "",
      r.latest_position?.longitude ?? "",
      r.highest_risk_severity ?? "",
      r.source_updated_at ?? "",
    ]);
    const csv = [header, ...rows].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "seam-vessels.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="col" style={{ gap: 12, paddingBottom: 30 }}>
      <header className="row" style={{ marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <div className="t-caption">Operations console</div>
          <h1 className="t-display" style={{ margin: 0, fontSize: 22 }}>Manual ingestion & data state</h1>
        </div>
        <Button leadingIcon={<RefreshCw size={14} />} onClick={refreshDev}>Refresh</Button>
        <Button
          variant="primary"
          leadingIcon={<Play size={14} />}
          onClick={() => runJob("refresh-live", runRefreshLive, { successTitle: "All live sources refreshed", errorTitle: "Refresh all failed" }).then(refreshDev)}
        >
          Refresh all live
        </Button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        {/* ===== Column 1: Source health + jobs + logs ===== */}
        <div className="col" style={{ gap: 12 }}>
          <Panel title="Source health" icon={<Activity size={14} />}>
            {state.health.length === 0 ? <p className="t-faded">No health rows yet. Run a test job to seed.</p> : (
              <div className="col" style={{ gap: 4 }}>
                {state.health.map((h: SourceHealth) => (
                  <div key={h.id} className="row" style={{ padding: "8px 10px", borderTop: "1px solid var(--gray-100)" }}>
                    <span className="mono" style={{ flex: 1 }}>{h.source}</span>
                    <HealthPill status={classifyHealth(h.status)} />
                    <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(h.last_checked_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent jobs" icon={<ClipboardList size={14} />} shimmer={Object.keys(state.runningJobs).length > 0}>
            <div className="table-wrap scroll" style={{ maxHeight: 260, overflow: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>ID</th><th>Type</th><th>Status</th><th>Mode</th><th>Started</th></tr>
                </thead>
                <tbody>
                  {state.jobs.map((job: IngestionJob) => (
                    <tr key={job.id}>
                      <td className="mono" style={{ fontSize: 11 }}>{job.id}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{job.job_type}</td>
                      <td><JobPill status={classifyJob(job.status)} label={job.status} /></td>
                      <td className="t-faded" style={{ fontSize: 11 }}>{String(job.parameters?.mode ?? "—")}</td>
                      <td className="t-faded" style={{ fontSize: 11 }}>{formatDate(job.started_at)}</td>
                    </tr>
                  ))}
                  {state.jobs.length === 0 && <tr><td colSpan={5} className="t-faded">No jobs yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Recent logs">
            <div className="row" style={{ gap: 4, paddingBottom: 8 }}>
              {(["all", "info", "warning", "error"] as const).map((lvl) => (
                <button key={lvl} type="button" className={`chip ${logLevel === lvl ? "selected" : ""}`} onClick={() => setLogLevel(lvl)}>
                  {lvl}
                </button>
              ))}
            </div>
            <div className="scroll" style={{ maxHeight: 240, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {visibleLogs.length === 0 ? <p className="t-faded">No logs.</p> : visibleLogs.map((log) => (
                <div key={log.id} className="row" style={{ padding: "6px 8px", fontSize: 11, borderBottom: "1px solid var(--gray-100)" }}>
                  <span className={`pill ${logColor(log.level) === "default" ? "none" : logColor(log.level)}`}>{log.level}</span>
                  <span className="mono" style={{ flex: 1 }}>{log.message}</span>
                  <span className="t-faded">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ===== Column 2: DB state ===== */}
        <div className="col" style={{ gap: 12 }}>
          <Panel title="Table counts">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.keys(tableCounts).length === 0
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={56} />)
                : Object.entries(tableCounts).map(([name, count]) => (
                    <div key={name} className="metric">
                      <div className="metric-label">{name}</div>
                      <div className="metric-value">{count}</div>
                    </div>
                  ))}
            </div>
          </Panel>

          <Panel title="Recent observations">
            <div className="col scroll" style={{ maxHeight: 260, overflow: "auto", gap: 4 }}>
              {observations.length === 0 ? <p className="t-faded">No observations yet.</p> : observations.map((obs) => (
                <a key={obs.id} href={`/evidence/${obs.id}`} className="row" style={{ padding: "6px 8px", textDecoration: "none", color: "inherit", borderBottom: "1px solid var(--gray-100)", fontSize: 12 }}>
                  <span className="mono" style={{ flex: 1 }}>{obs.source} · {obs.observation_type}</span>
                  <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(obs.fetched_at)}</span>
                </a>
              ))}
            </div>
          </Panel>

          <Panel title="Reference data">
            {Object.keys(referenceSummary).length === 0 ? <p className="t-faded">No reference data loaded.</p> : (
              <div className="col" style={{ gap: 4 }}>
                {Object.entries(referenceSummary).map(([domain, n]) => (
                  <div key={domain} className="row" style={{ padding: "6px 8px", fontSize: 12, borderBottom: "1px solid var(--gray-100)" }}>
                    <span className="mono" style={{ flex: 1 }}>{domain}</span>
                    <span className="mono">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ===== Column 3: Ingestion controls ===== */}
        <div className="col" style={{ gap: 12 }}>
          <Panel title="Live ingestion">
            <div className="col" style={{ gap: 6 }}>
              <RunButton label="Positions snapshot" running={isRunning("positions-snapshot")} onClick={() => runJob("positions-snapshot", runPositionsSnapshot, { successTitle: "Snapshot complete", errorTitle: "Snapshot failed" }).then(refreshDev)} />
              <RunButton label="Geo layers" running={isRunning("geo-layers")} onClick={() => runJob("geo-layers", runGeoLive, { successTitle: "Geo layers refreshed", errorTitle: "Geo layers failed" }).then(refreshDev)} />
              <RunButton label="News (RSS)" running={isRunning("news")} onClick={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News failed" }).then(refreshDev)} />
              <RunButton label="Risk recompute" running={isRunning("risk-recompute")} onClick={() => runJob("risk-recompute", () => runRiskRecompute(), { successTitle: "Risk recomputed", errorTitle: "Risk failed" }).then(refreshDev)} />
              <RunButton label="Test job" running={isRunning("test")} onClick={() => runJob("test", runTestJob, { successTitle: "Test job done", errorTitle: "Test failed" }).then(refreshDev)} icon={<Play size={12} />} />
              <Button variant="danger" leadingIcon={<RefreshCw size={12} />} onClick={() => setConfirmSanctions(true)}>Refresh sanctions API…</Button>
            </div>
          </Panel>

          <Panel title="Sanctions CSV" icon={<Upload size={14} />}>
            <CsvDropZone onFile={handleSanctionsCsvFile} />
            <div className="t-caption" style={{ marginTop: 10 }}>Or paste CSV</div>
            <textarea className="textarea" rows={4} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="entity,name,country,..." />
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <Button
                size="sm"
                variant="primary"
                disabled={!csvText.trim()}
                onClick={() =>
                  runJob("sanctions-csv-paste", () => runSanctionsCsv(csvText), { successTitle: "CSV ingested", errorTitle: "CSV failed" }).then(() => {
                    setCsvText("");
                    refreshDev();
                  })
                }
              >
                Submit pasted CSV
              </Button>
              <Button size="sm" onClick={() => runJob("sanctions-csv-url", runSanctionsCsvUrl, { successTitle: "CSV URL ingested", errorTitle: "CSV URL failed" }).then(refreshDev)}>
                Pull configured URL
              </Button>
            </div>
          </Panel>

          <Panel title="Manual vessel actions" icon={<Ship size={14} />}>
            <label className="input">
              <Search />
              <input value={vesselQuery} onChange={(e) => setVesselQuery(e.target.value)} placeholder="Search vessel by name / IMO / MMSI" />
            </label>
            {vesselSuggestions.length > 0 && (
              <div className="col" style={{ marginTop: 6, gap: 4 }}>
                {vesselSuggestions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="card row"
                    style={{ padding: "6px 8px", textAlign: "left", background: selectedVessel?.id === v.id ? "var(--ocean-50)" : "var(--white)", cursor: "pointer", border: "1px solid var(--gray-200)" }}
                    onClick={() => {
                      setSelectedVessel(v);
                      setVesselSuggestions([]);
                      setVesselQuery(v.name);
                    }}
                  >
                    <span style={{ flex: 1 }}>{v.name}</span>
                    <span className="mono t-faded" style={{ fontSize: 10 }}>{v.imo ?? v.mmsi ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <Button
                size="sm"
                disabled={!selectedVessel}
                onClick={() =>
                  selectedVessel &&
                  runJob(`particulars-${selectedVessel.id}`, () => runParticulars(selectedVessel.id), {
                    successTitle: "Particulars refreshed",
                    errorTitle: "Particulars failed",
                  })
                }
              >
                Refresh particulars
              </Button>
              <Button
                size="sm"
                disabled={!selectedVessel}
                onClick={() =>
                  selectedVessel &&
                  runJob(`movements-${selectedVessel.id}`, () => runMovements(selectedVessel.id), {
                    successTitle: "Movements refreshed",
                    errorTitle: "Movements failed",
                  })
                }
              >
                Refresh movements
              </Button>
            </div>
          </Panel>

          <Panel title="Port activity">
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" onClick={() => runJob("ports-arrive", () => runPortActivity("due-arrive"), { successTitle: "Arrivals updated", errorTitle: "Arrivals failed" }).then(refreshDev)}>Pull due-arrive</Button>
              <Button size="sm" onClick={() => runJob("ports-depart", () => runPortActivity("due-depart"), { successTitle: "Departures updated", errorTitle: "Departures failed" }).then(refreshDev)}>Pull due-depart</Button>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Vessel browser" icon={<Database size={14} />}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <label className="input search" style={{ flex: 1 }}>
            <Search />
            <input value={browseQuery} onChange={(e) => setBrowseQuery(e.target.value)} placeholder="Search name, IMO, MMSI, call sign" />
          </label>
          <select className="select" value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value as typeof riskFilter); setPage(0); }}>
            <option value="all">All vessels</option>
            <option value="flagged">Any risk flag</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button size="sm" onClick={exportBrowseCsv}>Export CSV</Button>
        </div>
        <div className="table-wrap scroll" style={{ maxHeight: 360, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Vessel</th><th>IMO/MMSI</th><th>Position</th><th>Risk</th><th>Flags</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? <tr><td colSpan={7} className="t-faded">No vessels.</td></tr> : visible.map((row) => (
                <tr key={row.vessel_id}>
                  <td><a href={`/vessels/${row.vessel_id}`}>{row.name}</a></td>
                  <td className="mono" style={{ fontSize: 11 }}>{row.imo ?? row.mmsi ?? row.call_sign ?? "—"}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{row.latest_position ? `${row.latest_position.latitude.toFixed(2)}, ${row.latest_position.longitude.toFixed(2)}` : "—"}</td>
                  <td>{row.highest_risk_severity ? <RiskPill severity={row.highest_risk_severity as never} /> : <span className="t-faded">—</span>}</td>
                  <td className="t-sm">{row.risk_flag_types.join(", ") || "—"}</td>
                  <td className="t-faded" style={{ fontSize: 11 }}>{formatDate(row.latest_position?.position_timestamp ?? row.source_updated_at)}</td>
                  <td><a href={`/vessels/${row.vessel_id}`} className="row" style={{ gap: 4, fontSize: 11 }}><MapIcon size={11} /> Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
          <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <span className="t-muted">{filteredBrowse.length} vessels · page {page + 1} / {pageCount}</span>
          <Button size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next</Button>
        </div>
      </Panel>

      <Modal
        open={confirmSanctions}
        title="Refresh sanctions from API?"
        onClose={() => setConfirmSanctions(false)}
        secondaryAction={{ label: "Cancel", onClick: () => setConfirmSanctions(false) }}
        primaryAction={{
          label: "Use 1 request",
          variant: "danger",
          onClick: () => {
            setConfirmSanctions(false);
            runJob("sanctions", runSanctionsLive, { successTitle: "Sanctions refreshed", errorTitle: "Sanctions failed" }).then(refreshDev);
          },
        }}
      >
        This will consume <strong>1 OpenSanctions quota request</strong>. Quota usage is shared.
      </Modal>
    </div>
  );
}

function Panel({ title, icon, children, shimmer }: { title: string; icon?: React.ReactNode; shimmer?: boolean; children: React.ReactNode }) {
  return (
    <section className={`panel-solid ${shimmer ? "shimmer" : ""}`.trim()} style={{ padding: 14 }}>
      <div className="row" style={{ paddingBottom: 8 }}>
        {icon}
        <strong style={{ flex: 1, fontSize: 13 }}>{title}</strong>
      </div>
      {children}
    </section>
  );
}

function RunButton({ label, onClick, running, icon }: { label: string; onClick: () => void; running: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn ${running ? "shimmer" : ""}`.trim()}
      style={{ justifyContent: "space-between" }}
      disabled={running}
    >
      <span>{label}</span>
      {icon ?? <RefreshCw size={12} />}
    </button>
  );
}

function CsvDropZone({ onFile }: { onFile: (file: File) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: 18,
        background: hover ? "var(--ocean-50)" : "var(--gray-50)",
        border: `1.5px dashed ${hover ? "var(--ocean-500)" : "var(--gray-300)"}`,
        borderRadius: "var(--r-card)",
        textAlign: "center",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      <Upload size={18} color="var(--slate-500)" />
      <span>Drop CSV here or click to upload</span>
      <input
        type="file"
        accept="text/csv,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

