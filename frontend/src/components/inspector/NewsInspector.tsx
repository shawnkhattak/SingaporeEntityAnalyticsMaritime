import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getNewsList, runNewsLive, type NewsArticleItem } from "../../api";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

export function NewsInspector() {
  const [news, setNews] = useState<NewsArticleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runJob = useJobRunner();

  function load() {
    setError(null);
    setNews(null);
    getNewsList(50)
      .then(setNews)
      .catch((e) => {
        setNews([]);
        setError(e instanceof Error ? e.message : String(e));
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <InspectorShell
      breadcrumb="News"
      title={`News · ${news?.length ?? 0}`}
      onClose={() => window.history.back()}
      footer={
        <Button
          size="sm"
          variant="primary"
          leadingIcon={<RefreshCw size={12} />}
          onClick={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News failed" }).then(load)}
        >
          Refresh RSS
        </Button>
      }
    >
      {news === null && !error && <Skeleton height={64} />}
      {news !== null && news.length === 0 && !error && (
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
      {error && (
        <EmptyState compact icon={<Newspaper size={18} />} title="Could not load news" body={error} action={<Button size="sm" onClick={load}>Retry</Button>} />
      )}
      <div className="col" style={{ gap: 6 }}>
        {news?.map((n) => (
          <div key={n.id} className="card" style={{ padding: "10px 12px" }}>
            <div className="row">
              <Newspaper size={14} color="var(--ocean-500)" />
              <span className="t-h2" style={{ flex: 1 }}>{n.title}</span>
              <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(n.published_at)}</span>
            </div>
            <div className="t-faded mono" style={{ fontSize: 11, marginTop: 4 }}>{n.source}</div>
            {n.summary && <div className="t-sm" style={{ marginTop: 4 }}>{n.summary}</div>}
            {n.url && (
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4, fontSize: 12 }}>
                  Open original <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </InspectorShell>
  );
}
