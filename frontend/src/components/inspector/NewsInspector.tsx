import { ExternalLink, Globe2, Landmark, Newspaper, RefreshCw, Rss } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getNewsList, runNewsLive, type NewsArticleItem } from "../../api";
import { closeInspectorRoute } from "../../hooks/useRoute";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import { Tabs } from "../primitives/Tabs";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

type SourceMeta = {
  label: string;
  icon: ReactNode;
  className: string;
};

const NEWS_TABS = [
  { label: "All", bundle: null },
  { label: "Social", bundle: "SEAM Singapore Social Media Intel" },
  { label: "Watchlist", bundle: "SEAM Entity Watchlist" },
  { label: "Intel", bundle: "SEAM Singapore Maritime Intel" },
] as const;

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14.4 10.6 22.1 2h-1.8l-6.7 7.5L8.3 2H2.1l8.1 11.6L2.1 22h1.8l7.1-7.9 5.7 7.9h6.2l-8.5-11.4Zm-2.5 2.8-.8-1.2L4.6 3.4h2.8l5.2 7.1.8 1.2 6.9 9h-2.8l-5.6-7.3Z" />
    </svg>
  );
}

function getSourceMeta(sourceBadge: string | null, source: string): SourceMeta {
  const label = sourceBadge || source || "Unknown source";
  const key = label.toLowerCase();
  const rawSource = source.toLowerCase();

  if (key.includes("twitter") || key === "x" || rawSource.includes("twitter")) {
    return { label: "Twitter/X", icon: <XIcon />, className: "news-source-badge source-x" };
  }
  if (key.includes("gcaptain") || rawSource.includes("gcaptain")) {
    return { label: "gCaptain", icon: <Globe2 size={11} />, className: "news-source-badge source-gcaptain" };
  }
  if (key.includes("maritime executive") || rawSource.includes("maritime executive")) {
    return { label: "The Maritime Executive", icon: <Newspaper size={11} />, className: "news-source-badge source-maritime-executive" };
  }
  if (key.includes("government") || rawSource.includes("mpa singapore")) {
    return { label: "Government Source", icon: <Landmark size={11} />, className: "news-source-badge source-government" };
  }
  if (key.includes("lloyd")) {
    return { label: "Lloyd’s List", icon: <Newspaper size={11} />, className: "news-source-badge source-lloyds" };
  }
  if (key.includes("tradewinds")) {
    return { label: "TradeWinds", icon: <Globe2 size={11} />, className: "news-source-badge source-tradewinds" };
  }
  if (key.includes("splash")) {
    return { label: "Splash 24/7", icon: <Globe2 size={11} />, className: "news-source-badge source-splash" };
  }
  if (key.includes("rss") || key.includes("search feed")) {
    return { label: label === "RSS.app Search Feed" ? "RSS.app Search" : label, icon: <Rss size={11} />, className: "news-source-badge source-rss" };
  }
  if (key.includes("maritime news")) {
    return { label: "Maritime News", icon: <Newspaper size={11} />, className: "news-source-badge source-maritime-news" };
  }
  return { label, icon: <Globe2 size={11} />, className: "news-source-badge source-unknown" };
}

export function NewsInspector() {
  const [allNews, setAllNews] = useState<NewsArticleItem[] | null>(null);
  const [bundleNews, setBundleNews] = useState<Record<string, NewsArticleItem[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const runJob = useJobRunner();
  const activeBundle = NEWS_TABS[activeTab]?.bundle ?? null;
  const visibleNews = activeBundle ? bundleNews[activeBundle] ?? [] : allNews ?? [];
  const tabItems = NEWS_TABS.map((tab) => ({
    label: tab.label,
    count: tab.bundle ? bundleNews[tab.bundle]?.length ?? 0 : allNews?.length ?? 0,
  }));
  const hasLoaded = allNews !== null;
  const hasAnyNews = (allNews?.length ?? 0) > 0 || Object.values(bundleNews).some((items) => items.length > 0);

  function load() {
    setError(null);
    setAllNews(null);
    setBundleNews({});
    Promise.all([
      getNewsList(50),
      ...NEWS_TABS.filter((tab) => tab.bundle).map((tab) => getNewsList(200, tab.bundle ?? undefined).then((items) => [tab.bundle, items] as const)),
    ])
      .then(([latest, ...bundles]) => {
        setAllNews(latest);
        setBundleNews(Object.fromEntries(bundles) as Record<string, NewsArticleItem[]>);
      })
      .catch((e) => {
        setAllNews([]);
        setBundleNews({});
        setError(e instanceof Error ? e.message : String(e));
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <InspectorShell
      breadcrumb="News"
      title={`News · ${visibleNews.length}`}
      onClose={closeInspectorRoute}
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
      {!hasLoaded && !error && <Skeleton height={64} />}
      {hasLoaded && !hasAnyNews && !error && (
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
      {hasLoaded && hasAnyNews && (
        <Tabs items={tabItems} active={activeTab} onChange={setActiveTab} className="news-tabs" />
      )}
      {hasLoaded && hasAnyNews && visibleNews.length === 0 && !error && (
        <EmptyState compact icon={<Newspaper size={18} />} title="No stories in this feed" body="Refresh RSS to pull the latest articles for this bundle." />
      )}
      <div className="col" style={{ gap: 6 }}>
        {visibleNews.map((n) => {
          const source = getSourceMeta(n.source_badge, n.source);
          return (
            <article key={n.id} className="card news-card">
              <div className="news-card-meta">
                <span className={source.className}>
                  {source.icon}
                  <span>{source.label}</span>
                </span>
                <span className="news-card-date">{formatDate(n.published_at)}</span>
              </div>
              <h3 className="news-card-title">{n.title}</h3>
              {n.summary && <p className="news-card-summary">{n.summary}</p>}
              {n.url && (
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="news-card-link">
                  Open original <ExternalLink size={11} />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </InspectorShell>
  );
}
