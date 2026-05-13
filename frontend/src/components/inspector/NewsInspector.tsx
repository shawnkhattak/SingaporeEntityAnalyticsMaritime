import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getRecentObservations, runNewsLive } from "../../api";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import type { VesselObservation } from "../../types";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

function isNews(o: VesselObservation) {
  const src = (o.source ?? "").toLowerCase();
  return src.startsWith("news") || src.startsWith("rss") || o.observation_type === "news";
}

export function NewsInspector() {
  const [observations, setObservations] = useState<VesselObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const runJob = useJobRunner();

  function load() {
    setLoading(true);
    getRecentObservations()
      .then(setObservations)
      .catch(() => setObservations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // TODO(api): GET /api/news?limit=50 — see design/wiring.md §14.2.
  const news = useMemo(() => observations.filter(isNews), [observations]);

  return (
    <InspectorShell
      breadcrumb="News"
      title={`News · ${news.length}`}
      onClose={() => window.history.back()}
      footer={
        <Button size="sm" variant="primary" leadingIcon={<RefreshCw size={12} />} onClick={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News failed" }).then(load)}>
          Refresh RSS
        </Button>
      }
    >
      {loading && <Skeleton height={64} />}
      {!loading && news.length === 0 && (
        <EmptyState
          compact
          icon={<Newspaper size={18} />}
          title="No news ingested yet"
          body="Pull the latest from your configured RSS feeds to populate this view."
          action={
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<RefreshCw size={11} />}
              onClick={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News failed" }).then(load)}
            >
              Refresh RSS now
            </Button>
          }
        />
      )}
      <div className="col" style={{ gap: 6 }}>
        {news.map((n) => {
          const payload = n.raw_payload as Record<string, unknown>;
          const title = (payload?.title as string) ?? n.source_record_id ?? "Untitled";
          const url = payload?.url as string | undefined;
          return (
            <div key={n.id} className="card" style={{ padding: "10px 12px" }}>
              <div className="row">
                <Newspaper size={14} color="var(--ocean-500)" />
                <span className="t-h2" style={{ flex: 1 }}>{title}</span>
                <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(n.observed_at ?? n.fetched_at)}</span>
              </div>
              <div className="t-faded mono" style={{ fontSize: 11, marginTop: 4 }}>{n.source}</div>
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <a href={`/evidence/${n.id}`} className="mono" style={{ fontSize: 11 }}>Evidence #{n.id}</a>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4, fontSize: 12 }}>
                    Open <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </InspectorShell>
  );
}
