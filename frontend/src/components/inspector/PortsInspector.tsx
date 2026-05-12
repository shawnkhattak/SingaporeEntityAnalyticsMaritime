import { ChevronDown, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPortActivity, runPortActivity } from "../../api";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import type { VesselEvent } from "../../types";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

const TABS = [
  { label: "Due to arrive", kind: "due-arrive" as const },
  { label: "Due to depart", kind: "due-depart" as const },
  { label: "All ports", kind: "all" as const },
];

type Cached = { arrive?: VesselEvent[]; depart?: VesselEvent[] };

export function PortsInspector() {
  const [cached, setCached] = useState<Cached>({});
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const runJob = useJobRunner();

  useEffect(() => {
    setLoading(true);
    Promise.all([getPortActivity("due-arrive").catch(() => []), getPortActivity("due-depart").catch(() => [])])
      .then(([a, d]) => setCached({ arrive: a, depart: d }))
      .finally(() => setLoading(false));
  }, []);

  const kind = TABS[tab].kind;
  const events: VesselEvent[] = useMemo(() => {
    if (kind === "all") return [...(cached.arrive ?? []), ...(cached.depart ?? [])];
    return kind === "due-arrive" ? cached.arrive ?? [] : cached.depart ?? [];
  }, [kind, cached]);

  const grouped = useMemo(() => {
    const m = new Map<string, VesselEvent[]>();
    for (const e of events) {
      const key = e.port_code ?? e.port_name ?? "—";
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
      await runPortActivity(k);
      const fresh = await getPortActivity(k);
      setCached((curr) => ({ ...curr, [k === "due-arrive" ? "arrive" : "depart"]: fresh }));
    }, {
      successTitle: `Port ${k === "due-arrive" ? "arrivals" : "departures"} refreshed`,
      errorTitle: "Port activity failed",
    });
  }

  return (
    <InspectorShell
      breadcrumb="Ports"
      title={`Ports · ${grouped.length}`}
      tabs={TABS.map((t) => ({ label: t.label }))}
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
        <EmptyState icon={<MapPin size={22} />} title="No port activity" body="Pull due arrivals or departures to populate this view." />
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
                      <span style={{ flex: 1 }}>Vessel #{e.vessel_id ?? "?"}</span>
                      <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(e.event_time ?? e.created_at)}</span>
                      {e.evidence_id != null && <a href={`/evidence/${e.evidence_id}`} className="mono" style={{ fontSize: 11 }}>#{e.evidence_id}</a>}
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
