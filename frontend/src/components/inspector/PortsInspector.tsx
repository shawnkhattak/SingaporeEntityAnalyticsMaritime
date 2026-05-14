import { ChevronDown, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPortActivity, runPortActivity } from "../../api";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import type { VesselEvent } from "../../types";
import { formatDate } from "../../format";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { InspectorShell } from "./InspectorShell";

const TABS = [
  { label: "Due to arrive", kind: "due-arrive" as const },
  { label: "Due to depart", kind: "due-depart" as const },
  { label: "All ports", kind: "all" as const },
];

type Cached = { arrive?: VesselEvent[]; depart?: VesselEvent[] };

function currentDateParam() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function PortsInspector() {
  const [cached, setCached] = useState<Cached>({});
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activityDate] = useState(() => currentDateParam());
  const loadedDateRef = useRef<string | null>(null);
  const runJob = useJobRunner();

  useEffect(() => {
    if (loadedDateRef.current === activityDate) return;
    loadedDateRef.current = activityDate;
    setLoading(true);
    Promise.all([loadKind("due-arrive"), loadKind("due-depart")])
      .then(([a, d]) => setCached({ arrive: a, depart: d }))
      .finally(() => setLoading(false));
  }, [activityDate]);

  const kind = TABS[tab].kind;
  const events: VesselEvent[] = useMemo(() => {
    if (kind === "all") return [...(cached.arrive ?? []), ...(cached.depart ?? [])];
    return kind === "due-arrive" ? cached.arrive ?? [] : cached.depart ?? [];
  }, [kind, cached]);

  const grouped = useMemo(() => {
    const m = new Map<string, VesselEvent[]>();
    for (const e of events) {
      const key = e.port_code ?? e.port_name ?? "Unassigned";
      const list = m.get(key) ?? [];
      list.push(e);
      m.set(key, list);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [events]);

  function toggle(code: string) {
    setExpanded((curr) => {
      const next = new Set(curr);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function refreshKind(k: "due-arrive" | "due-depart") {
    return runJob(`ports-${k}`, async () => {
      await runPortActivity(k, activityDate);
      const fresh = await getPortActivity(k, 100, activityDate);
      setCached((curr) => ({ ...curr, [k === "due-arrive" ? "arrive" : "depart"]: fresh }));
    }, {
      successTitle: `Port ${k === "due-arrive" ? "arrivals" : "departures"} refreshed`,
      errorTitle: "Port activity failed",
    });
  }

  async function loadKind(k: "due-arrive" | "due-depart") {
    try {
      await runPortActivity(k, activityDate);
      return await getPortActivity(k, 100, activityDate);
    } catch {
      return [];
    }
  }

  const emptyActionKind = kind === "due-depart" ? "due-depart" : "due-arrive";
  const emptyActionLabel = emptyActionKind === "due-arrive" ? "Pull arrivals now" : "Pull departures now";

  return (
    <InspectorShell
      breadcrumb="Ports"
      title={`Ports · ${events.length}`}
      tabs={TABS.map((t) => ({
        label: t.label,
        count: t.kind === "all" ? (cached.arrive?.length ?? 0) + (cached.depart?.length ?? 0) : t.kind === "due-arrive" ? cached.arrive?.length ?? 0 : cached.depart?.length ?? 0,
      }))}
      activeTab={tab}
      onTabChange={setTab}
      onClose={() => window.history.back()}
      footer={
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" leadingIcon={<RefreshCw size={12} />} onClick={() => refreshKind("due-arrive")}>Pull arrivals</Button>
          <Button size="sm" leadingIcon={<RefreshCw size={12} />} onClick={() => refreshKind("due-depart")}>Pull departures</Button>
        </div>
      }
    >
      {loading && <Skeleton height={48} />}
      {!loading && grouped.length === 0 && (
        <EmptyState
          compact
          icon={<MapPin size={18} />}
          title="No port activity yet"
          body={`No OCEANS-X ${kind === "due-depart" ? "departures" : "arrivals"} returned for ${activityDate}.`}
          action={
            <Button size="sm" variant="primary" leadingIcon={<RefreshCw size={11} />} onClick={() => refreshKind(emptyActionKind)}>
              {emptyActionLabel}
            </Button>
          }
        />
      )}
      <div className="col" style={{ gap: 6 }}>
        {grouped.map(([code, evts]) => {
          const open = expanded.has(code);
          return (
            <div key={code} className="card">
              <button type="button" className="row" onClick={() => toggle(code)} style={{ width: "100%", padding: "10px 12px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <MapPin size={14} color="var(--risk-medium)" />
                <strong style={{ flex: 1 }}>{evts[0].port_name ?? code}</strong>
                <span className="t-faded mono" style={{ fontSize: 11 }}>{code}</span>
                <span className="pill info">{evts.length}</span>
              </button>
              {open && (
                <div style={{ padding: "0 12px 10px" }}>
                  {evts.map((e) => (
                    <div key={e.id} className="row" style={{ padding: "6px 0", borderTop: "1px solid var(--gray-100)", fontSize: 12 }}>
                      <span className="pill info" style={{ fontSize: 10 }}>{e.event_type}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong>{e.vessel?.name ?? `Vessel #${e.vessel_id ?? "?"}`}</strong>
                        <span className="t-faded mono" style={{ marginLeft: 6, fontSize: 11 }}>
                          {[e.vessel?.imo, e.vessel?.call_sign, e.vessel?.flag_country_code].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(e.event_time ?? e.created_at)}</span>
                      <EvidenceLink id={e.evidence_id} variant="inline" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </InspectorShell>
  );
}
