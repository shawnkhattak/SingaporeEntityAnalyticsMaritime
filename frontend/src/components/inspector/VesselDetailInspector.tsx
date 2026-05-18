import {
  Anchor,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Copy,
  Database,
  FileText,
  Gauge,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  Ship,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getVessel, getVesselEvents, getVesselObservations, getVesselRiskFlags, runMovements, runParticulars, runRiskRecompute } from "../../api";
import { formatDate, formatRelative, parseBackendDate } from "../../format";
import { closeInspectorRoute, navigateBack, useRoute } from "../../hooks/useRoute";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { countryName, displaySeverity, flagEmoji, riskLabel, vesselTypeLabel } from "../../labels";
import { recordRecentVessel, useApp, useJobRunner, useSelection, useToasts } from "../../state/AppState";
import type { RiskFlag, VesselDetail, VesselEvent, VesselObservation, VesselPosition, VesselSummary } from "../../types";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { ErrorState } from "../primitives/ErrorState";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { Skeleton } from "../primitives/Skeleton";
import { Tabs } from "../primitives/Tabs";
import { InspectorShell } from "./InspectorShell";
import { RiskCard } from "./RiskCard";

type Loaded = {
  detail: VesselDetail;
  observations: VesselObservation[];
  events: VesselEvent[];
  risk: RiskFlag[];
};

type RiskTone = "critical" | "high" | "medium" | "low" | "clear" | "unknown";

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function VesselDetailInspector({ id }: { id: number }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const { dispatch } = useApp();
  const { select } = useSelection();
  const runJob = useJobRunner();
  const toasts = useToasts();
  const route = useRoute();

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getVessel(id), getVesselObservations(id), getVesselEvents(id), getVesselRiskFlags(id)])
      .then(([detail, observations, events, risk]) => {
        const loaded = { detail, observations, events, risk };
        setData(loaded);
        dispatch({ type: "CACHE_VESSEL_RISK", id, flags: risk });
        select({ kind: "vessel", id });
        recordRecentVessel(id);
        if (detail.latest_position) {
          requestMapCenter({
            lng: detail.latest_position.longitude,
            lat: detail.latest_position.latitude,
            zoom: 12,
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

  if (loading && !data) {
    const fallback = route.name === "vessel-detail" && route.from === "risk" ? "/risk" : "/vessels";
    return (
      <InspectorShell
        breadcrumb="Vessel"
        title="Loading vessel"
        onBack={() => navigateBack(fallback)}
        backLabel={fallback === "/risk" ? "Back to Risk & Sanctions" : "Back to vessels"}
        onClose={closeInspectorRoute}
      >
        <div className="vessel-panel-loading">
          <Skeleton height={92} />
          <Skeleton height={58} />
          <Skeleton height={180} />
        </div>
      </InspectorShell>
    );
  }

  if (error || !data) {
    const fallback = route.name === "vessel-detail" && route.from === "risk" ? "/risk" : "/vessels";
    return (
      <InspectorShell
        breadcrumb="Vessel"
        title="Could not load"
        onBack={() => navigateBack(fallback)}
        backLabel={fallback === "/risk" ? "Back to Risk & Sanctions" : "Back to vessels"}
        onClose={closeInspectorRoute}
      >
        <ErrorState title="Vessel unavailable" body={error ?? "No data."} onRetry={load} />
      </InspectorShell>
    );
  }

  const v = data.detail.vessel;
  const latest = data.detail.latest_position;
  const activeRisk = data.risk.filter((flag) => flag.status !== "resolved");
  const topRisk = highestRisk(activeRisk);
  const riskTone = topRisk?.severity ? (displaySeverity(topRisk.severity) as RiskTone) : activeRisk.length > 0 ? "unknown" : "clear";
  const sourceCounts = sourceConfidence(data.observations, data.events, data.risk);
  const positionObservations = data.observations.filter((obs) => obs.observation_type === "vessel_position");
  const detailFallback = route.name === "vessel-detail" && route.from === "risk" ? "/risk" : "/vessels";
  const detailBackLabel = detailFallback === "/risk" ? "Back to Risk & Sanctions" : "Back to vessels";

  const fromRisk = (() => {
    try { return sessionStorage.getItem("seam:return-to-risk") === "1"; } catch { return false; }
  })();

  async function copySummary() {
    const summary = [
      `${v.name}`,
      [v.imo && `IMO ${v.imo}`, v.mmsi && `MMSI ${v.mmsi}`, v.call_sign && `Call sign ${v.call_sign}`].filter(Boolean).join(" | "),
      `Flag: ${formatFlag(v.flag_country_code)}`,
      `Type: ${vesselTypeLabel(v.vessel_type_code)}`,
      `Risk: ${riskSummary(activeRisk)}`,
      latest ? `Last seen: ${formatDate(latest.position_timestamp)} at ${formatCoordinatePair(latest.latitude, latest.longitude)}` : "Last seen: Unknown",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      toasts.push({ variant: "success", title: "Vessel summary copied" });
    } catch {
      toasts.push({ variant: "error", title: "Copy failed", body: "Clipboard access was blocked by the browser." });
    }
  }

  const refreshParticulars = () =>
    runJob(`particulars-${id}`, () => runParticulars(id), {
      successTitle: "Particulars refreshed",
      errorTitle: "Particulars failed",
    }).then(load);
  const refreshMovements = () =>
    runJob(`movements-${id}`, () => runMovements(id), {
      successTitle: "Movements refreshed",
      errorTitle: "Movements failed",
    }).then(load);
  const refreshRisk = () =>
    runJob(`risk-recompute-${id}`, () => runRiskRecompute(id), {
      successTitle: "Risk recomputed",
      errorTitle: "Risk recompute failed",
    }).then(load);
  async function refreshAll() {
    await refreshParticulars().catch(() => undefined);
    await refreshMovements().catch(() => undefined);
    await refreshRisk().catch(() => undefined);
  }

  const footer = (
    <div className="vessel-action-bar">
      <Button variant="primary" size="sm" leadingIcon={<RefreshCw size={12} />} onClick={refreshAll}>
        Refresh vessel data
      </Button>
      <MoreActionsMenu
        items={[
          { label: "Refresh particulars", icon: <RefreshCw size={12} />, onClick: refreshParticulars },
          { label: "Refresh movement data", icon: <RefreshCw size={12} />, onClick: refreshMovements },
          { label: "Refresh risk", icon: <ShieldAlert size={12} />, onClick: refreshRisk },
          { label: "Copy summary", icon: <Copy size={12} />, onClick: copySummary },
        ]}
      />
    </div>
  );

  return (
    <InspectorShell
      breadcrumb={fromRisk ? "Risk Feed › Vessel" : "Vessel"}
      title={v.name}
      onBack={() => navigateBack(detailFallback)}
      backLabel={detailBackLabel}
      onClose={() => {
        try { sessionStorage.removeItem("seam:return-to-risk"); } catch { /* ignore */ }
        closeInspectorRoute();
      }}
      footer={footer}
    >
      <div className="vessel-profile">
        <VesselSummaryCard
          vessel={v}
          latest={latest}
          riskTone={riskTone}
          riskReasons={uniqueRiskTitles(activeRisk)}
        />

        <Tabs
          className="vessel-subtabs"
          items={[
            { label: "Overview" },
            { label: "History & Sources", count: data.observations.length + data.events.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 0 && (
          <div className="vessel-tab-surface">
            <MovementSummaryCard latest={latest} />

            {data.risk.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={18} />} title="No risk flags" body="This vessel currently has no active or historical risk signals." />
            ) : (
              <div className="vessel-risk-list">
                {data.risk.map((flag) => (
                  <RiskCard key={flag.id} flag={flag} subject={v.name} vesselId={id} hideSubject onOpenSubject={() => undefined} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="vessel-tab-surface">
            <PositionHistory observations={positionObservations.length > 0 ? positionObservations : data.observations} />
            <PortCalls events={data.events} onRefreshMovements={refreshMovements} />
            <SourcesView
              detail={data.detail}
              events={data.events}
              risk={data.risk}
              sourceCounts={sourceCounts}
              onRefreshParticulars={refreshParticulars}
              onRefreshMovements={refreshMovements}
              onRefreshRisk={refreshRisk}
            />
          </div>
        )}
      </div>
    </InspectorShell>
  );
}

function VesselSummaryCard({
  vessel,
  latest,
  riskTone,
  riskReasons,
}: {
  vessel: VesselSummary;
  latest: VesselPosition | null;
  riskTone: RiskTone;
  riskReasons: string[];
}) {
  const specs: { label: string; value: string }[] = [];
  if (vessel.year_built != null) specs.push({ label: "Year built", value: String(vessel.year_built) });
  if (vessel.deadweight != null) specs.push({ label: "Deadweight", value: `${vessel.deadweight.toLocaleString()} t` });
  if (vessel.gross_tonnage != null) specs.push({ label: "Gross tonnage", value: vessel.gross_tonnage.toLocaleString() });
  if (vessel.net_tonnage != null) specs.push({ label: "Net tonnage", value: vessel.net_tonnage.toLocaleString() });
  if (vessel.length_meters != null) specs.push({ label: "Length", value: `${vessel.length_meters} m` });
  if (vessel.breadth_meters != null) specs.push({ label: "Breadth", value: `${vessel.breadth_meters} m` });
  if (vessel.depth_meters != null) specs.push({ label: "Depth", value: `${vessel.depth_meters} m` });

  const visibleReasons = riskReasons.slice(0, 4);
  const hiddenReasonCount = Math.max(0, riskReasons.length - visibleReasons.length);
  const statusLine = latest
    ? `Last seen ${formatRelative(latest.position_timestamp)}${latest.speed_knots != null ? ` · ${latest.speed_knots.toFixed(1)} kn` : ""}`
    : "Last seen unknown";

  return (
    <section className={`vessel-hero vessel-summary-v2 vessel-risk-${riskTone}`}>
      <div className="vessel-hero-title-row">
        <div className="vessel-hero-subtitle">
          <span>{vesselTypeLabel(vessel.vessel_type_code)}</span>
          <span>{formatFlag(vessel.flag_country_code)}</span>
        </div>
        <RiskStatusBadge tone={riskTone} />
      </div>
      {visibleReasons.length > 0 && (
        <div className={`vessel-risk-reasons vessel-risk-${riskTone}`}>
          {visibleReasons.map((reason) => (
            <span key={reason} className="vessel-risk-reason-chip">{reason}</span>
          ))}
          {hiddenReasonCount > 0 && (
            <span className="vessel-risk-reason-chip is-more">+{hiddenReasonCount} more</span>
          )}
        </div>
      )}
      <div className="vessel-hero-seen">
        <Clock size={12} />
        <span>{statusLine}</span>
      </div>
      <div className="vessel-hero-meta">
        <span>{formatIdentifier("IMO", vessel.imo)}</span>
        <span>{formatIdentifier("MMSI", vessel.mmsi)}</span>
        <span>{formatIdentifier("Call Sign", vessel.call_sign)}</span>
      </div>
      {specs.length > 0 && (
        <div className="vessel-spec-row">
          {specs.map((s) => (
            <div className="vessel-status-item" key={s.label}>
              <span className="vessel-status-label">{s.label}</span>
              <span className="vessel-status-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MoreActionsMenu({
  items,
}: {
  items: { label: string; icon: ReactNode; onClick: () => void | Promise<unknown> }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current) return;
      if (event.target instanceof Node && wrapRef.current.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="more-actions-menu" ref={wrapRef}>
      <Button
        size="sm"
        leadingIcon={<MoreHorizontal size={12} />}
        trailingIcon={<ChevronDown size={12} />}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        More actions
      </Button>
      {open && (
        <div className="more-actions-popover" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="more-actions-item"
              onClick={() => {
                setOpen(false);
                Promise.resolve(item.onClick()).catch(() => undefined);
              }}
            >
              <span className="more-actions-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MovementSummaryCard({ latest }: { latest: VesselPosition | null }) {
  const isStationary = latest?.speed_knots == null || latest.speed_knots < 0.5;
  const title = isStationary ? "Current position" : "Current movement";
  const coords = latest ? formatCoordinatePair(latest.latitude, latest.longitude) : "Unknown";
  const speed = latest ? formatKnots(latest.speed_knots) : "Unknown";
  const lastReport = latest ? formatRelative(latest.position_timestamp) : "Unknown";
  return (
    <section className="movement-compact">
      <div className="movement-compact-head">
        <Compass size={13} />
        <strong>{title}</strong>
        {latest?.evidence_id != null && (
          <a className="movement-compact-action" href={`/evidence/${latest.evidence_id}`}>View track</a>
        )}
      </div>
      <div className="movement-compact-row">
        <span><MapPin size={11} /> {coords}</span>
        <span><Gauge size={11} /> {speed}</span>
        <span><Clock size={11} /> {lastReport}</span>
      </div>
    </section>
  );
}

function PositionHistory({ observations }: { observations: VesselObservation[] }) {
  if (observations.length === 0) {
    return <EmptyState icon={<MapPin size={18} />} title="No position history" body="No recorded vessel source observations are available yet." />;
  }

  type Group = { firstObs: VesselObservation; lat: string; lon: string; speed: string; source: string; count: number };
  const groups: Group[] = [];
  for (const obs of observations) {
    const row = observationPosition(obs);
    const stationary = row.speed !== "Unknown" && row.speed.startsWith("0.0");
    const prev = groups[groups.length - 1];
    if (
      prev &&
      stationary &&
      prev.source === obs.source &&
      prev.lat === row.lat &&
      prev.lon === row.lon &&
      prev.speed.startsWith("0.0")
    ) {
      prev.count += 1;
      continue;
    }
    groups.push({ firstObs: obs, lat: row.lat, lon: row.lon, speed: row.speed, source: obs.source, count: 1 });
  }

  return (
    <SectionCard title="Position history" icon={<FileText size={15} />}>
      <div className="position-history-table">
        <div className="position-history-head">
          <span>Time</span><span>Position</span><span>Speed</span><span>Source</span>
        </div>
        {groups.map((group) => (
          <div key={group.firstObs.id} className="position-history-group">
            <a href={`/evidence/${group.firstObs.id}`} className="position-history-row">
              <span>{formatDate(group.firstObs.observed_at ?? group.firstObs.fetched_at)}</span>
              <span className="mono">{group.lat}, {group.lon}</span>
              <span>{group.speed}</span>
              <span>{group.source}</span>
            </a>
            {group.count > 1 && (
              <div className="position-history-note">
                Repeated stationary reports from {group.source} (×{group.count})
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PortCalls({ events, onRefreshMovements }: { events: VesselEvent[]; onRefreshMovements: () => void }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Anchor size={18} />}
        title="No port calls available"
        body="No arrival or departure events have been recorded yet."
        action={
          <Button size="sm" leadingIcon={<RefreshCw size={12} />} onClick={onRefreshMovements}>
            Refresh movement data
          </Button>
        }
      />
    );
  }
  return (
    <SectionCard title="Port calls" icon={<Anchor size={15} />}>
      <div className="port-call-table">
        <div className="port-call-head">
          <span>Port</span><span>Country</span><span>Arrival</span><span>Departure</span><span>Duration</span><span>Confidence</span>
        </div>
        {events.map((event) => (
          <div key={event.id} className="port-call-row">
            <span>{event.port_name ?? event.port_code ?? "Unknown port"}</span>
            <span>{event.port_code ?? "Unknown"}</span>
            <span>{event.event_type.toLowerCase().includes("arriv") ? formatDate(event.event_time ?? event.created_at) : "Unknown"}</span>
            <span>{event.event_type.toLowerCase().includes("depart") ? formatDate(event.event_time ?? event.created_at) : "Unknown"}</span>
            <span>Unknown</span>
            <span>{event.evidence_id ? <EvidenceLink id={event.evidence_id} variant="chip" /> : <span className="t-faded">Source event</span>}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SourcesView({
  detail,
  events,
  risk,
  sourceCounts,
  onRefreshParticulars,
  onRefreshMovements,
  onRefreshRisk,
}: {
  detail: VesselDetail;
  events: VesselEvent[];
  risk: RiskFlag[];
  sourceCounts: SourceCounts;
  onRefreshParticulars: () => void;
  onRefreshMovements: () => void;
  onRefreshRisk: () => void;
}) {
  return (
    <div className="sources-view">
      <details className="sources-collapsed">
        <summary>
          <RefreshCw size={12} />
          <span>Source controls</span>
        </summary>
        <div className="source-refresh-grid">
          <SourceRefreshItem title="Identity sources" sub={`${sourceCounts.identity} sources · last ${latestTimestampLabel(detail.source_timestamps)}`} action="Refresh particulars" onClick={onRefreshParticulars} />
          <SourceRefreshItem title="Movement sources" sub={`${events.length} port events · ${sourceCounts.movements} movement sources`} action="Refresh movement data" onClick={onRefreshMovements} />
          <SourceRefreshItem title="Risk sources" sub={`${risk.length} risk flags · ${risk.filter((f) => f.evidence_id != null).length} evidence links`} action="Refresh risk" onClick={onRefreshRisk} />
        </div>
      </details>
    </div>
  );
}

function SectionCard({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="vessel-section-card">
      <div className="vessel-section-head">
        <div className="row" style={{ gap: 7 }}>{icon}<strong>{title}</strong></div>
        {action && <div className="vessel-section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function SourceRefreshItem({ title, sub, action, onClick }: { title: string; sub: string; action: string; onClick: () => void }) {
  return (
    <div className="source-refresh-item">
      <div>
        <strong>{title}</strong>
        <span>{sub}</span>
      </div>
      <Button size="sm" leadingIcon={<RefreshCw size={12} />} onClick={onClick}>{action}</Button>
    </div>
  );
}

function RiskStatusBadge({ tone }: { tone: RiskTone }) {
  const label = tone === "clear" ? "No active risk found" : `${titleCase(tone)} Risk`;
  return <span className={`risk-status-badge vessel-risk-${tone}`}>{label}</span>;
}

type SourceCounts = {
  identity: number;
  position: number;
  movements: number;
  risk: number;
  totalSources: number;
};

function sourceConfidence(observations: VesselObservation[], events: VesselEvent[], risk: RiskFlag[]): SourceCounts {
  const allSources = new Set<string>();
  const identitySources = new Set<string>();
  const positionSources = new Set<string>();
  const movementSources = new Set<string>();
  for (const obs of observations) {
    allSources.add(obs.source);
    if (obs.observation_type.includes("particular") || obs.observation_type.includes("identity")) identitySources.add(obs.source);
    if (obs.observation_type.includes("position")) positionSources.add(obs.source);
    if (obs.observation_type.includes("movement")) movementSources.add(obs.source);
  }
  if (events.length > 0) movementSources.add("Port events");
  if (risk.length > 0) allSources.add("SEAM risk engine");
  return {
    identity: identitySources.size || (observations.length > 0 ? allSources.size : 0),
    position: positionSources.size,
    movements: movementSources.size,
    risk: risk.length > 0 ? 1 : 0,
    totalSources: allSources.size + (events.length > 0 && !allSources.has("Port events") ? 1 : 0),
  };
}

function uniqueRiskTitles(flags: RiskFlag[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const flag of flags) {
    const title = riskLabel(flag.flag_type).title;
    if (!seen.has(title)) {
      seen.add(title);
      out.push(title);
    }
  }
  return out;
}

function highestRisk(flags: RiskFlag[]): RiskFlag | null {
  return flags.slice().sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))[0] ?? null;
}

function riskSummary(flags: RiskFlag[]): string {
  const top = highestRisk(flags);
  if (!top) return "Clear";
  return `${titleCase(top.severity)} - ${flags.length} active flag${flags.length === 1 ? "" : "s"}`;
}

function formatIdentifier(label: string, value: string | null | undefined): string {
  return `${label} ${value || "Unknown"}`;
}

function formatFlag(code: string | null | undefined): string {
  if (!code) return "Unknown flag";
  const name = countryName(code);
  const emoji = flagEmoji(code);
  return `${emoji ? `${emoji} ` : ""}${name || code}`;
}

function formatCoordinate(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "Unknown";
}

function formatCoordinatePair(lat: number | null | undefined, lon: number | null | undefined): string {
  if (typeof lat !== "number" || typeof lon !== "number") return "Unknown";
  return `${formatCoordinate(lat)}, ${formatCoordinate(lon)}`;
}

function formatKnots(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} kn` : "Unknown speed";
}

function observationPosition(obs: VesselObservation): { lat: string; lon: string; speed: string; course: string } {
  const payload = obs.raw_payload ?? {};
  const particulars = typeof payload.vesselParticulars === "object" && payload.vesselParticulars ? payload.vesselParticulars as Record<string, unknown> : {};
  const lat = pickNumber(payload, particulars, "latitude", "lat", "latitudeDegrees", "latitude_degrees");
  const lon = pickNumber(payload, particulars, "longitude", "lon", "lng", "longitudeDegrees", "longitude_degrees");
  const speed = pickNumber(payload, particulars, "speed", "speedKnots", "speed_knots");
  const course = pickNumber(payload, particulars, "course", "courseDegrees", "course_degrees", "heading", "headingDegrees");
  return {
    lat: typeof lat === "number" ? formatCoordinate(lat) : "Unknown",
    lon: typeof lon === "number" ? formatCoordinate(lon) : "Unknown",
    speed: typeof speed === "number" ? formatKnots(speed) : "Unknown",
    course: typeof course === "number" ? `${Math.round(course)} deg` : "Unknown",
  };
}

function pickNumber(primary: Record<string, unknown>, secondary: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = primary[key] ?? secondary[key];
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function latestTimestampLabel(sourceTimestamps: Record<string, string | null>): string {
  const values = Object.values(sourceTimestamps).filter(Boolean) as string[];
  if (values.length === 0) return "never";
  const latest = values.sort((a, b) => parseBackendDate(b).getTime() - parseBackendDate(a).getTime())[0];
  return formatRelative(latest);
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
