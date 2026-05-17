import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  Globe,
  Map as MapIcon,
  Newspaper,
  Play,
  RefreshCw,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  Ship,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  browseDevVessels,
  getDevTableCounts,
  getRecentObservations,
  getReferenceSummary,
  loadDevState,
  runGeoLive,
  runNewsLive,
  runPositionsSnapshot,
  runRefreshLive,
  runRiskRecompute,
  runSanctionsCsv,
  runSanctionsCsvUrl,
  runSanctionsLive,
  runTestJob,
  searchVessels,
  runMovements,
  runMapParticulars,
  runParticulars,
} from "../../api";
import { usePoll } from "../../hooks/usePoll";
import { useApp, useJobRunner, useRunningJobs } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { classifyHealth, classifyJob, HealthPill, JobPill, RiskPill } from "../primitives/Pill";
import { Modal } from "../primitives/Modal";
import { Skeleton } from "../primitives/Skeleton";
import type {
  DevVesselBrowseRow,
  HealthStatus,
  IngestionJob,
  IngestionLog,
  SourceHealth,
  VesselObservation,
  VesselSearchResult,
} from "../../types";
import { formatDate, formatRelative, parseBackendDate } from "../../format";
import { countryName, flagEmoji, vesselTypeLabel } from "../../labels";

const PAGE_SIZE = 25;
const SOURCE_STALE_AFTER_MS = 15 * 60 * 1000;
const SOURCE_STALE_OVERRIDES_MS: Array<{ match: (key: string) => boolean; ms: number }> = [
  { match: (k) => k === "oceans-x" || k === "oceansx" || k.startsWith("oceansx.") || k.startsWith("oceans-x."), ms: 60 * 60 * 1000 },
  { match: (k) => k === "internal-test" || k === "internal.test" || k.startsWith("internal-test.") || k.startsWith("internal."), ms: 24 * 60 * 60 * 1000 },
];

function staleThresholdFor(source: string): number {
  const key = source.toLowerCase();
  for (const rule of SOURCE_STALE_OVERRIDES_MS) {
    if (rule.match(key)) return rule.ms;
  }
  return SOURCE_STALE_AFTER_MS;
}

/* ---------- Friendly-label maps -------------------------------------- */

const TABLE_LABELS: Record<string, string> = {
  vessels: "Vessels",
  vessel_positions_latest: "Latest vessel positions",
  vessel_positions: "Vessel position history",
  port_events: "Port events",
  entities: "Entities",
  relationships: "Relationships",
  risk_flags: "Risk flags",
  sanctions_records: "Sanctions records",
  news_articles: "News articles",
  news_links: "News links",
  reference_data: "Reference data",
  ingestion_jobs: "Ingestion jobs",
  ingestion_logs: "Ingestion logs",
  source_health: "Source health",
  source_observations: "Source observations",
};

const CORE_KEYS = ["vessels", "vessel_positions_latest", "port_events", "entities", "relationships"];
const RISK_KEYS = ["risk_flags", "sanctions_records", "news_articles", "news_links"];
const SYSTEM_KEYS = ["ingestion_jobs", "ingestion_logs", "source_health", "source_observations"];

const TABLE_TOOLTIPS: Record<string, string> = {
  vessels: "All ships we're tracking, with their identities and specs.",
  vessel_positions_latest: "Each ship's most recent location on the water.",
  vessel_positions: "Historical track points showing where ships have been.",
  port_events: "Records of ships arriving at and departing from ports.",
  entities: "People, companies, and organizations linked to maritime activity.",
  relationships: "Known connections between people, companies, and ships (e.g. owners, operators).",
  risk_flags: "Concerns we've raised on a ship or entity — sanctions matches, suspicious behavior, news hits.",
  sanctions_records: "People and entities on government sanctions lists.",
  news_articles: "Maritime news stories we've collected from public sources.",
  news_links: "Connections between news stories and the ships, people, or companies they mention.",
  reference_data: "Background lookup data — countries, ports, vessel types, and similar lists.",
  ingestion_jobs: "Background tasks that pull fresh data in from outside sources.",
  ingestion_logs: "Step-by-step records of what each data pull did, including any errors.",
  source_health: "How well each external data source is responding right now.",
  source_observations: "Recent snapshots of each source's status over time.",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  "oceansx.positions_snapshot": "Vessel positions snapshot",
  "oceansx.vessel_particulars": "OCEANS-X vessel particulars",
  "oceansx.vessel_particulars_bulk": "Bulk vessel particulars",
  "oceansx.vessel_movements": "OCEANS-X vessel movements",
  "oceansx.port_activity": "OCEANS-X port activity",
  "internal.test": "Internal test job",
};

const SOURCE_LABELS: Record<string, string> = {
  oceansx: "OCEANS-X",
  "oceansx.positions": "OCEANS-X positions",
  "oceansx.particulars": "OCEANS-X vessel particulars",
  "oceansx.movements": "OCEANS-X vessel movements",
  "oceansx.port_activity": "OCEANS-X port activity",
  "oceansx.geo": "OCEANS-X geo layers",
  sanctions: "Sanctions",
  opensanctions: "OpenSanctions",
  news: "News (RSS)",
};

const SOURCE_AREA_HINTS: Record<string, string> = {
  "oceansx.positions": "Vessel positions",
  "oceansx.particulars": "Vessel particulars",
  "oceansx.movements": "Vessel movements",
  "oceansx.port_activity": "Port arrivals / departures",
  "oceansx.geo": "Geo layers (ports, anchorages, fairways)",
  oceansx: "OCEANS-X live feeds",
  sanctions: "Sanctions list",
  opensanctions: "Sanctions list",
  news: "Maritime news",
};

function humanize(raw: string): string {
  return raw
    .replace(/[._\-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tableLabel(key: string): string {
  return TABLE_LABELS[key] ?? humanize(key);
}

function jobTypeLabel(jobType: string): string {
  return JOB_TYPE_LABELS[jobType] ?? humanize(jobType);
}

function sourceLabel(source: string): string {
  const key = source.toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  // Try parent (e.g. "oceansx.port_activity.due-arrive" → "oceansx.port_activity")
  const parent = key.split(".").slice(0, 2).join(".");
  if (SOURCE_LABELS[parent]) return SOURCE_LABELS[parent];
  return humanize(source);
}

function sourceAreaHint(source: string): string {
  const key = source.toLowerCase();
  if (SOURCE_AREA_HINTS[key]) return SOURCE_AREA_HINTS[key];
  const parent = key.split(".").slice(0, 2).join(".");
  return SOURCE_AREA_HINTS[parent] ?? sourceLabel(source);
}

function classifySourceHealth(health: SourceHealth): HealthStatus {
  const status = classifyHealth(health.status);
  if (status === "fail") return "fail";
  const timestamp = health.last_success_at ?? health.last_checked_at;
  if (!timestamp) return status;
  const ageMs = Date.now() - parseBackendDate(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return "ok";
  return ageMs > staleThresholdFor(health.source) ? "stale" : "ok";
}

function suggestedActionForSource(source: string): string {
  const key = source.toLowerCase();
  if (key.includes("port_activity")) return "Check OCEANS-X subscription scope, then retry the port activity pull.";
  if (key.includes("oceansx")) return "Verify OCEANS-X credentials and retry the source from the Action Center.";
  if (key.includes("sanctions") || key.includes("opensanctions")) {
    return "Sanctions API quota may be exhausted — submit a CSV in the meantime.";
  }
  if (key.includes("news")) return "Check RSS feed availability and retry the news refresh.";
  return "Retry the source from the Action Center.";
}

function suggestedActionForJobType(jobType: string): string {
  if (jobType === "oceansx.port_activity") return "Retry the port activity pull or check OCEANS-X scope.";
  if (jobType.startsWith("oceansx.")) return "Retry from the Action Center.";
  return "Retry from the Action Center.";
}

/* ---------- Component ----------------------------------------------- */

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
  const [flagFilter, setFlagFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [missingIdFilter, setMissingIdFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"risk" | "updated" | "name" | "type">("risk");
  const [page, setPage] = useState(0);
  const [logLevel, setLogLevel] = useState<"all" | "info" | "warning" | "error">("all");
  const [confirmSanctions, setConfirmSanctions] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [vesselQuery, setVesselQuery] = useState("");
  const [vesselSuggestions, setVesselSuggestions] = useState<VesselSearchResult[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<VesselSearchResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPortDetails, setShowPortDetails] = useState(false);
  const [dismissedBulkParticularsJobId, setDismissedBulkParticularsJobId] = useState<number | null>(null);

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

  /* ----- Derived datasets ------------------------------------------ */

  const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  const flagOptions = useMemo(() => {
    const set = new Set<string>();
    browseRows.forEach((r) => r.flag_country_code && set.add(r.flag_country_code));
    return Array.from(set).sort();
  }, [browseRows]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    browseRows.forEach((r) => r.vessel_type_code && set.add(r.vessel_type_code));
    return Array.from(set).sort();
  }, [browseRows]);

  const filteredBrowse = useMemo(() => {
    const filtered = browseRows.filter((row) => {
      if (riskFilter === "flagged" && row.risk_flags_count <= 0) return false;
      if (riskFilter !== "all" && riskFilter !== "flagged" && row.highest_risk_severity !== riskFilter) return false;
      if (flagFilter !== "all" && row.flag_country_code !== flagFilter) return false;
      if (typeFilter !== "all" && row.vessel_type_code !== typeFilter) return false;
      if (missingIdFilter && row.imo && row.mmsi) return false;
      return true;
    });
    const sorted = filtered.slice();
    if (sortBy === "risk") {
      sorted.sort((a, b) => (SEVERITY_RANK[b.highest_risk_severity ?? ""] ?? 0) - (SEVERITY_RANK[a.highest_risk_severity ?? ""] ?? 0));
    } else if (sortBy === "updated") {
      sorted.sort((a, b) => timeOf(b.latest_position?.position_timestamp ?? b.source_updated_at) - timeOf(a.latest_position?.position_timestamp ?? a.source_updated_at));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "type") {
      sorted.sort((a, b) => vesselTypeLabel(a.vessel_type_code).localeCompare(vesselTypeLabel(b.vessel_type_code)));
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseRows, riskFilter, flagFilter, typeFilter, missingIdFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredBrowse.length / PAGE_SIZE));
  const visible = filteredBrowse.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const visibleLogs = useMemo(() => {
    if (logLevel === "all") return logs;
    return logs.filter((l) => l.level.toLowerCase() === logLevel);
  }, [logs, logLevel]);

  // Group repeated error messages.
  const groupedErrors = useMemo(() => {
    const groups = new Map<string, { message: string; count: number; lastAt: string }>();
    for (const l of logs) {
      if (l.level.toLowerCase() !== "error") continue;
      const key = l.message;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (parseBackendDate(l.created_at).getTime() > parseBackendDate(existing.lastAt).getTime()) {
          existing.lastAt = l.created_at;
        }
      } else {
        groups.set(key, { message: key, count: 1, lastAt: l.created_at });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  const bulkParticularsJob = useMemo(
    () => state.jobs.find((job) => job.job_type === "oceansx.vessel_particulars_bulk") ?? null,
    [state.jobs],
  );
  const bulkParticularsActive = bulkParticularsJob?.status === "queued" || bulkParticularsJob?.status === "running";
  const visibleBulkParticularsJob =
    bulkParticularsJob && (bulkParticularsActive || dismissedBulkParticularsJobId !== bulkParticularsJob.id)
      ? bulkParticularsJob
      : null;

  /* ----- System status + active issues ----------------------------- */

  const failingSources = useMemo(
    () => state.health.filter((h) => classifySourceHealth(h) !== "ok"),
    [state.health],
  );
  const healthySources = state.health.length - failingSources.length;
  const recentFailedJobs = useMemo(
    () => state.jobs.filter((j) => classifyJob(j.status) === "failure"),
    [state.jobs],
  );
  const failedJobsByType = useMemo(() => {
    const groups = new Map<string, { jobType: string; count: number; lastAt: string | null }>();
    for (const j of recentFailedJobs) {
      const existing = groups.get(j.job_type);
      const at = j.finished_at ?? j.started_at;
      if (existing) {
        existing.count += 1;
        if (at && (!existing.lastAt || timeOf(at) > timeOf(existing.lastAt))) existing.lastAt = at;
      } else {
        groups.set(j.job_type, { jobType: j.job_type, count: 1, lastAt: at });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [recentFailedJobs]);

  const lastSuccessfulLive = useMemo(() => {
    // Prefer SourceHealth.last_success_at (authoritative); fall back to job history.
    const fromHealth = state.health
      .map((h) => h.last_success_at)
      .filter((s): s is string => !!s)
      .sort((a, b) => timeOf(b) - timeOf(a))[0];
    if (fromHealth) return fromHealth;
    const fromJobs = state.jobs
      .filter((j) => classifyJob(j.status) === "success")
      .map((j) => j.finished_at)
      .filter((s): s is string => !!s)
      .sort((a, b) => timeOf(b) - timeOf(a))[0];
    return fromJobs ?? null;
  }, [state.health, state.jobs]);

  const overall: "healthy" | "partial" | "attention" = useMemo(() => {
    if (failingSources.length === 0 && failedJobsByType.length === 0) return "healthy";
    if (failingSources.length > 1 || failedJobsByType.some((g) => g.count >= 3)) return "attention";
    return "partial";
  }, [failingSources, failedJobsByType]);

  const topIssue = failingSources[0] ?? null;
  const topIssueSummary = topIssue
    ? `${sourceLabel(topIssue.source)} is failing.`
    : failedJobsByType[0]
      ? `${jobTypeLabel(failedJobsByType[0].jobType)} failed ${failedJobsByType[0].count} time${failedJobsByType[0].count === 1 ? "" : "s"}.`
      : "All ingestion sources nominal.";

  /* ----- Timeline ---------------------------------------------------- */

  type TimelineEvent = {
    id: string;
    at: string;
    kind: "job-success" | "job-failure" | "job-running" | "log-error";
    title: string;
    detail?: string;
  };

  const timeline: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    for (const j of state.jobs.slice(0, 25)) {
      const at = j.finished_at ?? j.started_at ?? j.created_at;
      if (!at) continue;
      const kind = classifyJob(j.status);
      events.push({
        id: `job-${j.id}`,
        at,
        kind: kind === "success" ? "job-success" : kind === "failure" ? "job-failure" : "job-running",
        title: `${jobTypeLabel(j.job_type)} ${kind === "success" ? "completed" : kind === "failure" ? "failed" : kind}`,
      });
    }
    for (const l of logs.slice(0, 15)) {
      if (l.level.toLowerCase() !== "error") continue;
      events.push({
        id: `log-${l.id}`,
        at: l.created_at,
        kind: "log-error",
        title: l.message,
      });
    }
    events.sort((a, b) => timeOf(b.at) - timeOf(a.at));
    return events.slice(0, 12);
  }, [state.jobs, logs]);

  /* ----- Handlers --------------------------------------------------- */

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

  /* ----- Render ----------------------------------------------------- */

  return (
    <div className="col" style={{ gap: 14, paddingBottom: 30 }}>
      {/* ===== Header =============================================== */}
      <header className="row" style={{ marginBottom: 4, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="t-caption">Data operations</div>
          <h1 className="t-display" style={{ margin: 0, fontSize: 22 }}>Operations Center</h1>
          <p className="t-sm" style={{ margin: "6px 0 0", color: "var(--slate-500)" }}>
            Monitor live maritime data, refresh sources, review ingestion issues, and manage risk intelligence.
          </p>
          <p className="t-faded" style={{ margin: "4px 0 0", fontSize: 11 }}>
            Live sources only. Fixture replay removed.
          </p>
        </div>
        <Button leadingIcon={<RefreshCw size={14} />} onClick={refreshDev}>Refresh</Button>
        <Button
          variant="primary"
          leadingIcon={<Play size={14} />}
          onClick={() =>
            runJob("refresh-live", runRefreshLive, {
              successTitle: "All live sources refreshed",
              errorTitle: "Refresh all failed",
            }).then(refreshDev)
          }
        >
          Refresh all live
        </Button>
      </header>

      {/* ===== System status strip ================================== */}
      <SystemStatusStrip
        overall={overall}
        healthyCount={healthySources}
        totalSources={state.health.length}
        failedJobs={recentFailedJobs.length}
        lastSuccess={lastSuccessfulLive}
        topIssueSummary={topIssueSummary}
      />

      {/* ===== Source health + Active issues ======================== */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        <Panel title="Source health" icon={<Activity size={14} />}>
          {state.health.length === 0 ? (
            <p className="t-faded">No source health rows yet.</p>
          ) : (
            <div className="col" style={{ gap: 4 }}>
              {state.health.map((h: SourceHealth) => (
                <div
                  key={h.id}
                  className="row"
                  style={{ padding: "8px 10px", borderTop: "1px solid var(--gray-100)", alignItems: "flex-start" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{sourceLabel(h.source)}</div>
                    <div className="t-faded" style={{ fontSize: 11 }}>
                      {h.last_success_at
                        ? `Last success ${formatRelative(h.last_success_at)}`
                        : "No successful run yet"}
                    </div>
                    {showAdvanced && (
                      <div className="mono t-faded" style={{ fontSize: 10, marginTop: 2 }}>{h.source}</div>
                    )}
                  </div>
                  <HealthPill status={classifySourceHealth(h)} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <ActiveIssuesCard
          failingSources={failingSources}
          failedJobGroups={failedJobsByType}
        />
      </div>

      {/* ===== Action center ======================================== */}
      <ActionCenter
        runJob={runJob}
        refreshDev={refreshDev}
        isRunning={isRunning}
        bulkParticularsJob={visibleBulkParticularsJob}
        bulkParticularsActive={bulkParticularsActive}
        onDismissBulkParticulars={() => bulkParticularsJob && setDismissedBulkParticularsJobId(bulkParticularsJob.id)}
        onOpenSanctionsConfirm={() => setConfirmSanctions(true)}
        csvText={csvText}
        setCsvText={setCsvText}
        onCsvFile={handleSanctionsCsvFile}
        vesselQuery={vesselQuery}
        setVesselQuery={setVesselQuery}
        vesselSuggestions={vesselSuggestions}
        setVesselSuggestions={setVesselSuggestions}
        selectedVessel={selectedVessel}
        setSelectedVessel={setSelectedVessel}
        showPortDetails={showPortDetails}
        setShowPortDetails={setShowPortDetails}
      />

      {/* ===== Data overview ======================================== */}
      <DataOverview
        tableCounts={tableCounts}
        lastSuccess={lastSuccessfulLive}
        referenceSummary={referenceSummary}
      />

      {/* ===== Recent activity ====================================== */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12, alignItems: "stretch" }}>
        <Panel title="Operations timeline" icon={<Sparkles size={14} />}>
          {timeline.length === 0 ? (
            <p className="t-faded">No recent activity.</p>
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {timeline.map((ev) => (
                <TimelineRow key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Recent jobs"
          icon={<ClipboardList size={14} />}
          shimmer={Object.keys(state.runningJobs).length > 0}
          fill
        >
          <div className="table-wrap scroll" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {sortJobsFailFirst(state.jobs).map((job: IngestionJob) => {
                  const isFail = classifyJob(job.status) === "failure";
                  return (
                    <tr key={job.id} className={isFail ? "stripe-crit" : undefined}>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{jobTypeLabel(job.job_type)}</div>
                        {showAdvanced && (
                          <div className="mono t-faded" style={{ fontSize: 10 }}>#{job.id} · {job.job_type}</div>
                        )}
                      </td>
                      <td><JobPill status={classifyJob(job.status)} label={job.status} /></td>
                      <td className="t-faded" style={{ fontSize: 11 }}>{String(job.parameters?.mode ?? "—")}</td>
                      <td className="t-faded" style={{ fontSize: 11 }}>{formatDate(job.started_at)}</td>
                    </tr>
                  );
                })}
                {state.jobs.length === 0 && <tr><td colSpan={4} className="t-faded">No jobs yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent logs" fill>
          <div className="row" style={{ gap: 4, paddingBottom: 8 }}>
            {(["all", "info", "warning", "error"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`chip ${logLevel === lvl ? "selected" : ""}`}
                onClick={() => setLogLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          {groupedErrors.length > 1 && logLevel !== "info" && logLevel !== "warning" && (
            <div className="col" style={{ gap: 4, marginBottom: 8 }}>
              <div className="t-caption" style={{ fontSize: 10 }}>Repeated errors</div>
              {groupedErrors.slice(0, 3).map((g) => (
                <div
                  key={g.message}
                  className="row"
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    background: "rgba(198,40,40,.06)",
                    border: "1px solid rgba(198,40,40,.16)",
                    borderRadius: "var(--r-card)",
                  }}
                >
                  <AlertTriangle size={12} color="var(--risk-critical)" />
                  <span style={{ flex: 1 }}>{g.message}</span>
                  <span className="pill crit" style={{ fontSize: 10 }}>{g.count}×</span>
                </div>
              ))}
            </div>
          )}

          <div
            className="scroll"
            style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}
          >
            {visibleLogs.length === 0 ? (
              <p className="t-faded">No logs.</p>
            ) : (
              visibleLogs.map((log) => (
                <div
                  key={log.id}
                  className="row"
                  style={{ padding: "6px 8px", fontSize: 11, borderBottom: "1px solid var(--gray-100)" }}
                >
                  <span className={`pill ${logColor(log.level)}`}>{log.level}</span>
                  <span className="mono" style={{ flex: 1 }}>{log.message}</span>
                  <span className="t-faded">{formatDate(log.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* ===== Vessel browser ======================================= */}
      <Panel title="Vessel browser" icon={<Database size={14} />}>
        <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <label className="input search" style={{ flex: "1 1 240px" }}>
            <Search />
            <input
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Search name, IMO, MMSI, call sign"
            />
          </label>
          <select
            className="select"
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value as typeof riskFilter);
              setPage(0);
            }}
            title="Risk level"
          >
            <option value="all">Any risk</option>
            <option value="flagged">Any flag</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="select"
            value={flagFilter}
            onChange={(e) => {
              setFlagFilter(e.target.value);
              setPage(0);
            }}
            title="Flag country"
          >
            <option value="all">Any flag country</option>
            {flagOptions.map((code) => (
              <option key={code} value={code}>
                {flagEmoji(code)} {countryName(code) || code}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            title="Vessel type"
          >
            <option value="all">Any type</option>
            {typeOptions.map((code) => (
              <option key={code} value={code}>{vesselTypeLabel(code)}</option>
            ))}
          </select>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy);
              setPage(0);
            }}
            title="Sort by"
          >
            <option value="risk">Sort: Risk</option>
            <option value="updated">Sort: Updated</option>
            <option value="name">Sort: Name</option>
            <option value="type">Sort: Type</option>
          </select>
          <label className="row" style={{ gap: 4, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={missingIdFilter}
              onChange={(e) => {
                setMissingIdFilter(e.target.checked);
                setPage(0);
              }}
            />
            Missing IMO/MMSI
          </label>
          <Button size="sm" onClick={exportBrowseCsv}>Export CSV</Button>
        </div>
        <div className="table-wrap scroll" style={{ maxHeight: 420, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Vessel</th>
                <th>IMO/MMSI</th>
                <th>Position</th>
                <th>Flag</th>
                <th>Type</th>
                <th>Risk</th>
                <th>Flags</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="t-faded" style={{ padding: 20, textAlign: "center" }}>
                    {browseQuery || riskFilter !== "all" || flagFilter !== "all" || typeFilter !== "all" || missingIdFilter
                      ? "No vessels match these filters. Try clearing one."
                      : "No vessels loaded yet."}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.vessel_id}>
                    <td><a href={`/vessels/${row.vessel_id}`}>{row.name}</a></td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {row.imo ?? row.mmsi ?? row.call_sign ?? "—"}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {row.latest_position
                        ? `${row.latest_position.latitude.toFixed(2)}, ${row.latest_position.longitude.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="t-sm">
                      {row.flag_country_code ? (
                        <span
                          title={countryName(row.flag_country_code) || row.flag_country_code}
                          aria-label={countryName(row.flag_country_code) || row.flag_country_code}
                          style={{ fontSize: 16, lineHeight: 1, cursor: "help" }}
                        >
                          {flagEmoji(row.flag_country_code) || row.flag_country_code}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="t-sm">{vesselTypeLabel(row.vessel_type_code)}</td>
                    <td>
                      {row.highest_risk_severity ? (
                        <RiskPill severity={row.highest_risk_severity as never} />
                      ) : (
                        <span className="t-faded">—</span>
                      )}
                    </td>
                    <td className="t-sm">{row.risk_flag_types.join(", ") || "—"}</td>
                    <td className="t-faded" style={{ fontSize: 11 }}>
                      {formatDate(row.latest_position?.position_timestamp ?? row.source_updated_at)}
                    </td>
                    <td>
                      <a href={`/vessels/${row.vessel_id}`} className="row" style={{ gap: 4, fontSize: 11 }}>
                        <MapIcon size={11} /> View profile
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
          <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="t-muted">{filteredBrowse.length} vessels · page {page + 1} / {pageCount}</span>
          <Button
            size="sm"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </Panel>

      {/* ===== Advanced / developer ================================ */}
      <Panel
        title={
          <button
            type="button"
            className="row"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              gap: 6,
              border: 0,
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--navy-900)",
            }}
          >
            {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Settings size={14} />
            Advanced / Developer
          </button>
        }
      >
        {showAdvanced ? (
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <Button
                size="sm"
                leadingIcon={<Play size={12} />}
                onClick={() =>
                  runJob("test", runTestJob, {
                    successTitle: "Test job done",
                    errorTitle: "Test failed",
                  }).then(refreshDev)
                }
              >
                Run test job
              </Button>
              <span className="t-faded" style={{ fontSize: 11, alignSelf: "center" }}>
                Seeds an `internal.test` job for hook smoke-testing.
              </span>
            </div>

            <div>
              <div className="t-caption" style={{ paddingBottom: 6 }}>Raw table counts</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {Object.entries(tableCounts).map(([name, count]) => (
                  <div key={name} className="metric">
                    <div className="metric-label mono" style={{ textTransform: "none" }}>{name}</div>
                    <div className="metric-value" style={{ fontSize: 18 }}>{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="t-caption" style={{ paddingBottom: 6 }}>Recent observations</div>
              <div className="col scroll" style={{ maxHeight: 220, overflow: "auto", gap: 4 }}>
                {observations.length === 0 ? (
                  <p className="t-faded">No observations yet.</p>
                ) : (
                  observations.map((obs) => (
                    <a
                      key={obs.id}
                      href={`/evidence/${obs.id}`}
                      className="row"
                      style={{
                        padding: "6px 8px",
                        textDecoration: "none",
                        color: "inherit",
                        borderBottom: "1px solid var(--gray-100)",
                        fontSize: 12,
                      }}
                    >
                      <span className="mono" style={{ flex: 1 }}>{obs.source} · {obs.observation_type}</span>
                      <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(obs.fetched_at)}</span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="t-faded" style={{ fontSize: 12, margin: 0 }}>
            Hidden: raw table names, job IDs, source observations, and the test-job control.
          </p>
        )}
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
            runJob("sanctions", runSanctionsLive, {
              successTitle: "Sanctions refreshed",
              errorTitle: "Sanctions failed",
            }).then(refreshDev);
          },
        }}
      >
        This will consume <strong>1 OpenSanctions quota request</strong>. Quota usage is shared.
      </Modal>
    </div>
  );
}

/* ====== Sub-components ============================================== */

function SystemStatusStrip({
  overall,
  healthyCount,
  totalSources,
  failedJobs,
  lastSuccess,
  topIssueSummary,
}: {
  overall: "healthy" | "partial" | "attention";
  healthyCount: number;
  totalSources: number;
  failedJobs: number;
  lastSuccess: string | null;
  topIssueSummary: string;
}) {
  const tone: HealthStatus = overall === "healthy" ? "ok" : overall === "partial" ? "stale" : "fail";
  const headline =
    overall === "healthy" ? "System status: Healthy" :
      overall === "partial" ? "System status: Partial issue" :
        "System status: Needs attention";
  const accent =
    overall === "healthy" ? "var(--health-ok, #2E8F5B)" :
      overall === "partial" ? "var(--risk-medium)" :
        "var(--risk-critical)";

  return (
    <section
      className="panel-solid"
      style={{
        padding: 16,
        borderLeft: `4px solid ${accent}`,
        display: "grid",
        gridTemplateColumns: "minmax(280px, 1.6fr) repeat(3, minmax(145px, 1fr))",
        gap: 14,
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <HealthPill status={tone} label={headline.replace("System status: ", "")} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{headline}</span>
        </div>
        <p className="t-sm" style={{ margin: 0, color: "var(--slate-500)" }}>{topIssueSummary}</p>
      </div>
      <StatusMetric label="Healthy sources" value={`${healthyCount} / ${totalSources || "—"}`} />
      <StatusMetric label="Recent failed jobs" value={String(failedJobs)} tone={failedJobs > 0 ? "fail" : undefined} />
      <StatusMetric
        label="Last successful update"
        value={lastSuccess ? formatRelative(lastSuccess) : "—"}
        sub={lastSuccess ? formatDate(lastSuccess) : "No successful run yet"}
      />
    </section>
  );
}

function StatusMetric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "fail" }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="metric-label">{label}</div>
      <div
        className="metric-value"
        style={{ fontSize: 20, color: tone === "fail" ? "var(--risk-critical)" : undefined }}
      >
        {value}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function ActiveIssuesCard({
  failingSources,
  failedJobGroups,
}: {
  failingSources: SourceHealth[];
  failedJobGroups: { jobType: string; count: number; lastAt: string | null }[];
}) {
  const empty = failingSources.length === 0 && failedJobGroups.length === 0;
  return (
    <Panel title="Active issues" icon={<AlertTriangle size={14} />}>
      {empty ? (
        <div className="row" style={{ gap: 8, padding: "12px 4px", color: "var(--health-ok, #2E8F5B)" }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: 13 }}>No active ingestion issues detected.</span>
        </div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {failingSources.map((h) => (
            <IssueRow
              key={`src-${h.id}`}
              tone={classifySourceHealth(h) === "fail" ? "crit" : "med"}
              title={`${sourceLabel(h.source)} is ${classifySourceHealth(h) === "fail" ? "failing" : "stale"}`}
              when={h.last_checked_at ?? h.last_success_at}
              area={sourceAreaHint(h.source)}
              suggestion={suggestedActionForSource(h.source)}
            />
          ))}
          {failedJobGroups.map((g) => (
            <IssueRow
              key={`job-${g.jobType}`}
              tone="crit"
              title={`${jobTypeLabel(g.jobType)} failed${g.count > 1 ? ` (${g.count} times)` : ""}`}
              when={g.lastAt}
              area={sourceAreaHint(g.jobType)}
              suggestion={suggestedActionForJobType(g.jobType)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function IssueRow({
  tone,
  title,
  when,
  area,
  suggestion,
}: {
  tone: "crit" | "med";
  title: string;
  when: string | null | undefined;
  area: string;
  suggestion: string;
}) {
  const accent = tone === "crit" ? "var(--risk-critical)" : "var(--risk-medium)";
  const bg = tone === "crit" ? "rgba(198,40,40,.05)" : "rgba(229,148,19,.06)";
  return (
    <div
      style={{
        padding: 10,
        background: bg,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "var(--r-card)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy-900)" }}>{title}</div>
      <div className="t-faded" style={{ fontSize: 11 }}>
        Last seen {when ? formatDate(when) : "unknown"} · Affects {area}
      </div>
      <div style={{ fontSize: 12, color: "var(--slate-500)" }}>
        <strong style={{ color: "var(--navy-700)" }}>Suggested action:</strong> {suggestion}
      </div>
    </div>
  );
}

type ActionCenterProps = {
  runJob: ReturnType<typeof useJobRunner>;
  refreshDev: () => void;
  isRunning: (slug: string) => boolean;
  bulkParticularsJob: IngestionJob | null;
  bulkParticularsActive: boolean;
  onDismissBulkParticulars: () => void;
  onOpenSanctionsConfirm: () => void;
  csvText: string;
  setCsvText: (v: string) => void;
  onCsvFile: (file: File) => void;
  vesselQuery: string;
  setVesselQuery: (v: string) => void;
  vesselSuggestions: VesselSearchResult[];
  setVesselSuggestions: (v: VesselSearchResult[]) => void;
  selectedVessel: VesselSearchResult | null;
  setSelectedVessel: (v: VesselSearchResult | null) => void;
  showPortDetails: boolean;
  setShowPortDetails: (v: boolean) => void;
};

function ActionCenter(props: ActionCenterProps) {
  const {
    runJob,
    refreshDev,
    isRunning,
    bulkParticularsJob,
    bulkParticularsActive,
    onDismissBulkParticulars,
    onOpenSanctionsConfirm,
    csvText,
    setCsvText,
    onCsvFile,
    vesselQuery,
    setVesselQuery,
    vesselSuggestions,
    setVesselSuggestions,
    selectedVessel,
    setSelectedVessel,
    showPortDetails,
    setShowPortDetails,
  } = props;

  return (
    <Panel title="Action center" icon={<Play size={14} />}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
        {/* --- Refresh live --- */}
        <div className="col" style={{ gap: 8 }}>
          <div className="t-caption">Refresh live sources</div>
          <RunButton
            label="Vessel positions snapshot"
            icon={<Ship size={12} />}
            running={isRunning("positions-snapshot")}
            onClick={() =>
              runJob("positions-snapshot", runPositionsSnapshot, {
                successTitle: "Snapshot complete",
                errorTitle: "Snapshot failed",
              }).then(refreshDev)
            }
          />
          <RunButton
            label="Internal ingestion test"
            icon={<CheckCircle2 size={12} />}
            running={isRunning("test")}
            onClick={() =>
              runJob("test", runTestJob, {
                successTitle: "Internal test complete",
                errorTitle: "Internal test failed",
              }).then(refreshDev)
            }
          />
          <RunButton
            label="Singapore vessel particulars"
            icon={<Ship size={12} />}
            running={bulkParticularsActive || isRunning("map-particulars")}
            onClick={() =>
              runJob("map-particulars", () => runMapParticulars(0.1), {
                successTitle: "Bulk particulars started",
                errorTitle: "Bulk particulars failed",
                successBody: (job) => `${Number(job.parameters.total ?? 0).toLocaleString()} Singapore-flagged map vessels queued.`,
              }).then(refreshDev)
            }
          />
          {bulkParticularsJob && <BulkParticularsProgress job={bulkParticularsJob} onDismiss={onDismissBulkParticulars} />}
          <RunButton
            label="Geo layers"
            icon={<Globe size={12} />}
            running={isRunning("geo-layers")}
            onClick={() =>
              runJob("geo-layers", runGeoLive, {
                successTitle: "Geo layers refreshed",
                errorTitle: "Geo layers failed",
              }).then(refreshDev)
            }
          />
          <RunButton
            label="News (RSS)"
            icon={<Newspaper size={12} />}
            running={isRunning("news")}
            onClick={() =>
              runJob("news", runNewsLive, {
                successTitle: "News refreshed",
                errorTitle: "News failed",
              }).then(refreshDev)
            }
          />
          <RunButton
            label="Recompute risk"
            icon={<ShieldAlert size={12} />}
            running={isRunning("risk-recompute")}
            onClick={() =>
              runJob("risk-recompute", () => runRiskRecompute(), {
                successTitle: "Risk recomputed",
                errorTitle: "Risk failed",
              }).then(refreshDev)
            }
          />
        </div>

        {/* --- Sanctions --- */}
        <div className="col" style={{ gap: 8 }}>
          <div className="t-caption row" style={{ gap: 6 }}>
            <Scale size={11} /> Sanctions
          </div>
          <Button
            variant="danger"
            size="sm"
            leadingIcon={<RefreshCw size={12} />}
            onClick={onOpenSanctionsConfirm}
          >
            Pull configured sanctions API…
          </Button>
          <Button
            size="sm"
            onClick={() =>
              runJob("sanctions-csv-url", runSanctionsCsvUrl, {
                successTitle: "CSV URL ingested",
                errorTitle: "CSV URL failed",
              }).then(refreshDev)
            }
          >
            Pull configured sanctions URL
          </Button>
          <CsvDropZone onFile={onCsvFile} />
          <textarea
            className="textarea"
            rows={3}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Or paste CSV: entity,name,country,..."
            style={{ fontSize: 11 }}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!csvText.trim()}
            onClick={() =>
              runJob("sanctions-csv-paste", () => runSanctionsCsv(csvText), {
                successTitle: "CSV ingested",
                errorTitle: "CSV failed",
              }).then(() => {
                setCsvText("");
                refreshDev();
              })
            }
          >
            Submit pasted CSV
          </Button>
        </div>

        {/* --- Per-vessel + port activity --- */}
        <div className="col" style={{ gap: 8 }}>
          <div className="t-caption row" style={{ gap: 6 }}>
            <Ship size={11} /> Per-vessel actions
          </div>
          <label className="input">
            <Search />
            <input
              value={vesselQuery}
              onChange={(e) => setVesselQuery(e.target.value)}
              placeholder="Search vessel by name / IMO / MMSI"
            />
          </label>
          {vesselSuggestions.length > 0 && (
            <div className="col" style={{ gap: 4 }}>
              {vesselSuggestions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="card row"
                  style={{
                    padding: "6px 8px",
                    textAlign: "left",
                    background: selectedVessel?.id === v.id ? "var(--ocean-50)" : "var(--white)",
                    cursor: "pointer",
                    border: "1px solid var(--gray-200)",
                  }}
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
          <div className="row" style={{ gap: 6 }}>
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

          <div className="t-caption row" style={{ gap: 6, marginTop: 8 }}>
            <MapIcon size={11} /> Port activity
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Button size="sm" disabled>Arrivals paused</Button>
            <Button size="sm" disabled>Departures paused</Button>
          </div>
          <p className="t-faded" style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            OCEANS-X port activity ingestion is paused for now. Vessel positions, particulars,
            movements, and internal tests can continue independently.
          </p>
          <button
            type="button"
            onClick={() => setShowPortDetails(!showPortDetails)}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              fontSize: 11,
              color: "var(--ocean-500)",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            {showPortDetails ? "Hide" : "Show"} technical details
          </button>
          {showPortDetails && (
            <p className="t-faded" style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              These actions hit <code className="mono">duetoarrive</code> /{" "}
              <code className="mono">duetodepart</code> endpoints. HTTP 400 from OCEANS-X usually
              means your subscription does not include these endpoints.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

function DataOverview({
  tableCounts,
  lastSuccess,
  referenceSummary,
}: {
  tableCounts: Record<string, number>;
  lastSuccess: string | null;
  referenceSummary: Record<string, number>;
}) {
  const loaded = Object.keys(tableCounts).length > 0;
  return (
    <Panel title="Data overview" icon={<Database size={14} />}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        <DataGroup
          title="Core maritime data"
          keys={CORE_KEYS}
          tableCounts={tableCounts}
          loaded={loaded}
          freshness={lastSuccess}
        />
        <DataGroup
          title="Risk intelligence"
          keys={RISK_KEYS}
          tableCounts={tableCounts}
          loaded={loaded}
          freshness={lastSuccess}
        />
        <DataGroup
          title="System data"
          keys={SYSTEM_KEYS}
          tableCounts={tableCounts}
          loaded={loaded}
        />
      </div>

      {Object.keys(referenceSummary).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--gray-100)" }}>
          <div className="t-caption" style={{ paddingBottom: 2 }}>Reference data</div>
          <div style={{ fontSize: 10, color: "var(--gray-500)", lineHeight: 1.3, paddingBottom: 6 }}>
            Background lookup values used to label and enrich records.
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {Object.entries(referenceSummary).map(([domain, n]) => (
              <span key={domain} className="pill none" style={{ fontSize: 11 }}>
                {humanize(domain)} · <strong style={{ marginLeft: 4 }}>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function DataGroup({
  title,
  keys,
  tableCounts,
  loaded,
  freshness,
}: {
  title: string;
  keys: string[];
  tableCounts: Record<string, number>;
  loaded: boolean;
  freshness?: string | null;
}) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="t-caption">{title}</div>
      <div className="col" style={{ gap: 4 }}>
        {keys.map((key) => (
          <a
            key={key}
            href={`/data/${encodeURIComponent(key)}`}
            className="row"
            style={{
              padding: "8px 10px",
              border: "1px solid var(--gray-100)",
              borderRadius: "var(--r-card)",
              background: "var(--white)",
              alignItems: "flex-start",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12 }}>{tableLabel(key)}</span>
              {TABLE_TOOLTIPS[key] && (
                <span style={{ fontSize: 10, color: "var(--gray-500)", lineHeight: 1.3 }}>
                  {TABLE_TOOLTIPS[key]}
                </span>
              )}
            </div>
            <span
              className="mono"
              style={{ fontWeight: 700, fontSize: 13, color: "var(--navy-900)" }}
            >
              {loaded ? (tableCounts[key] ?? 0).toLocaleString() : <Skeleton width={32} height={14} rounded={3} />}
            </span>
          </a>
        ))}
      </div>
      {freshness && (
        <div className="t-faded" style={{ fontSize: 11 }}>
          Last update {formatRelative(freshness)}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ ev }: { ev: { id: string; at: string; kind: string; title: string } }) {
  const palette: Record<string, { color: string; bg: string; dotIcon?: React.ReactNode }> = {
    "job-success": { color: "var(--health-ok, #2E8F5B)", bg: "rgba(46,143,91,.10)" },
    "job-failure": { color: "var(--risk-critical)", bg: "rgba(198,40,40,.10)" },
    "job-running": { color: "var(--ocean-500)", bg: "rgba(58,127,184,.10)" },
    "log-error": { color: "var(--risk-critical)", bg: "rgba(198,40,40,.10)" },
  };
  const tone = palette[ev.kind] ?? palette["job-running"];
  return (
    <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: tone.color,
          marginTop: 6,
          flex: "0 0 auto",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--navy-900)" }}>{ev.title}</div>
        <div className="t-faded" style={{ fontSize: 10 }}>
          {formatRelative(ev.at)} · {formatDate(ev.at)}
        </div>
      </div>
    </div>
  );
}

/* ====== Helpers ===================================================== */

function timeOf(s: string | null | undefined): number {
  if (!s) return 0;
  const t = parseBackendDate(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortJobsFailFirst(jobs: IngestionJob[]): IngestionJob[] {
  return jobs.slice().sort((a, b) => {
    const af = classifyJob(a.status) === "failure" ? 0 : 1;
    const bf = classifyJob(b.status) === "failure" ? 0 : 1;
    if (af !== bf) return af - bf;
    return timeOf(b.started_at) - timeOf(a.started_at);
  });
}

function logColor(level: string): "info" | "med" | "crit" | "none" {
  const lvl = level.toLowerCase();
  if (lvl === "error") return "crit";
  if (lvl === "warning" || lvl === "warn") return "med";
  if (lvl === "info") return "info";
  return "none";
}

function Panel({
  title,
  icon,
  children,
  shimmer,
  fill,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  shimmer?: boolean;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`panel-solid ${shimmer ? "shimmer" : ""}`.trim()}
      style={{
        padding: 14,
        ...(fill ? { display: "flex", flexDirection: "column", minHeight: 0, height: "100%" } : {}),
      }}
    >
      <div className="row" style={{ paddingBottom: 8 }}>
        {icon}
        {typeof title === "string" ? (
          <strong style={{ flex: 1, fontSize: 13 }}>{title}</strong>
        ) : (
          <div style={{ flex: 1 }}>{title}</div>
        )}
      </div>
      {fill ? <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>{children}</div> : children}
    </section>
  );
}

function BulkParticularsProgress({ job, onDismiss }: { job: IngestionJob; onDismiss: () => void }) {
  const total = numberParam(job.parameters.total);
  const completed = numberParam(job.parameters.completed);
  const succeeded = numberParam(job.parameters.succeeded);
  const failed = numberParam(job.parameters.failed);
  const skipped = numberParam(job.parameters.skipped);
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const active = job.status === "queued" || job.status === "running";
  return (
    <div
      style={{
        padding: 10,
        borderRadius: "var(--r-card)",
        marginBottom: 4,
        background: "var(--gray-50)",
        border: "1px solid var(--gray-100)",
      }}
    >
      <div className="row" style={{ gap: 8, fontSize: 11 }}>
        <span className="mono" style={{ flex: 1 }}>
          Particulars {completed.toLocaleString()} / {total.toLocaleString()}
        </span>
        <JobPill status={classifyJob(job.status)} label={job.status} />
        {!active && (
          <button
            type="button"
            className="btn ghost icon sm"
            onClick={onDismiss}
            aria-label="Dismiss completed bulk particulars progress"
            title="Dismiss completed progress"
          >
            {failed > 0 ? <X size={12} /> : <CheckCircle2 size={12} />}
          </button>
        )}
      </div>
      <div
        aria-label="Bulk particulars progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        role="progressbar"
        style={{
          height: 8,
          background: "var(--gray-100)",
          borderRadius: 999,
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          className={active ? "shimmer" : ""}
          style={{
            width: `${pct}%`,
            height: "100%",
            background: failed > 0 ? "var(--risk-medium)" : "var(--ocean-500)",
            transition: "width var(--motion-base) var(--ease-out)",
          }}
        />
      </div>
      <div className="row t-faded" style={{ marginTop: 6, gap: 8, fontSize: 11 }}>
        <span>{pct}%</span>
        <span style={{ flex: 1 }}>
          {succeeded.toLocaleString()} saved · {failed.toLocaleString()} failed · {skipped.toLocaleString()} skipped
        </span>
      </div>
    </div>
  );
}

function numberParam(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function RunButton({
  label,
  onClick,
  running,
  icon,
}: {
  label: string;
  onClick: () => void;
  running: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn ${running ? "shimmer" : ""}`.trim()}
      style={{ justifyContent: "space-between" }}
      disabled={running}
    >
      <span className="row" style={{ gap: 6 }}>
        {icon}
        {label}
      </span>
      <RefreshCw size={12} />
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
        gap: 4,
        padding: 12,
        background: hover ? "var(--ocean-50)" : "var(--gray-50)",
        border: `1.5px dashed ${hover ? "var(--ocean-500)" : "var(--gray-300)"}`,
        borderRadius: "var(--r-card)",
        textAlign: "center",
        cursor: "pointer",
        fontSize: 11,
      }}
    >
      <Upload size={16} color="var(--slate-500)" />
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
