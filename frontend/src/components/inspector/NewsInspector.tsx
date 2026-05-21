import { ExternalLink, Globe2, Newspaper, RefreshCw, Rss } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getAiNewsOverview, getNewsList, recomputeAiNewsOverview, runNewsLive, type AiNewsOverviewResponse, type NewsArticleItem } from "../../api";
import { closeInspectorRoute } from "../../hooks/useRoute";
import { useApp, useInspectorState, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import { Tabs } from "../primitives/Tabs";
import { formatDate } from "../../format";
import { AiNewsOverviewCard } from "./AiNewsOverviewCard";
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

const AI_NEWS_WINDOW_HOURS = 168;

function SourceLogo({ src, alt, fallback }: { src: string; alt: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

function LogoIcon({ src, label, fallback }: { src: string; label: string; fallback?: ReactNode }) {
  return <SourceLogo src={src} alt={label} fallback={fallback ?? <Globe2 size={11} />} />;
}

function XFallbackIcon() {
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
    return { label: "Twitter/X", icon: <LogoIcon src="https://x.com/favicon.ico" label="Twitter/X" fallback={<XFallbackIcon />} />, className: "news-source-badge source-x" };
  }
  if (key.includes("gcaptain") || rawSource.includes("gcaptain")) {
    return { label: "gCaptain", icon: <LogoIcon src="https://gcaptain.com/favicon.ico" label="gCaptain" />, className: "news-source-badge source-gcaptain" };
  }
  if (key.includes("maritime executive") || rawSource.includes("maritime executive")) {
    return { label: "The Maritime Executive", icon: <LogoIcon src="https://maritime-executive.com/favicon.ico" label="The Maritime Executive" fallback={<Newspaper size={11} />} />, className: "news-source-badge source-maritime-executive" };
  }
  if (key.includes("government") || rawSource.includes("mpa singapore")) {
    return { label: "Government Source", icon: <LogoIcon src="https://www.mpa.gov.sg/favicon.ico" label="MPA Singapore" />, className: "news-source-badge source-government" };
  }
  if (key.includes("lloyd")) {
    return { label: "Lloyd’s List", icon: <LogoIcon src="https://www.lloydslist.com/favicon.ico" label="Lloyd’s List" fallback={<Newspaper size={11} />} />, className: "news-source-badge source-lloyds" };
  }
  if (key.includes("tradewinds")) {
    return { label: "TradeWinds", icon: <LogoIcon src="https://www.tradewindsnews.com/favicon.ico" label="TradeWinds" />, className: "news-source-badge source-tradewinds" };
  }
  if (key.includes("splash")) {
    return { label: "Splash 24/7", icon: <LogoIcon src="https://splash247.com/favicon.ico" label="Splash 24/7" />, className: "news-source-badge source-splash" };
  }
  if (key.includes("rss") || key.includes("search feed")) {
    return { label: label === "RSS.app Search Feed" ? "RSS.app Search" : label, icon: <LogoIcon src="https://rss.app/favicon.ico" label="RSS.app" fallback={<Rss size={11} />} />, className: "news-source-badge source-rss" };
  }
  if (key.includes("maritime news")) {
    return { label: "Maritime News", icon: <LogoIcon src="https://www.marinelink.com/favicon.ico" label="MarineLink" fallback={<Newspaper size={11} />} />, className: "news-source-badge source-maritime-news" };
  }
  return { label, icon: <Globe2 size={11} />, className: "news-source-badge source-unknown" };
}

export function NewsInspector() {
  const [allNews, setAllNews] = useState<NewsArticleItem[] | null>(null);
  const [bundleNews, setBundleNews] = useState<Record<string, NewsArticleItem[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [aiOverview, setAiOverview] = useState<AiNewsOverviewResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { dispatch } = useApp();
  const inspector = useInspectorState();
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

  function loadAiOverview() {
    setAiLoading(true);
    setAiError(null);
    getAiNewsOverview(AI_NEWS_WINDOW_HOURS)
      .then(setAiOverview)
      .catch((e) => {
        setAiOverview(null);
        setAiError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setAiLoading(false));
  }

  function regenerateAiOverview() {
    setAiRegenerating(true);
    setAiError(null);
    recomputeAiNewsOverview(AI_NEWS_WINDOW_HOURS)
      .then(setAiOverview)
      .catch((e) => setAiError(e instanceof Error ? e.message : String(e)))
      .finally(() => setAiRegenerating(false));
  }

  useEffect(() => {
    load();
    loadAiOverview();
    return () => dispatch({ type: "CLEAR_AI_FOCUS_VESSELS" });
  }, []);

  useEffect(() => {
    const previousWidth = inspector.width;
    inspector.resize(860);
    return () => inspector.resize(previousWidth);
    // Deliberately run once on News mount so this panel gets a richer first-glance layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InspectorShell
      breadcrumb="News"
      title={`News · ${visibleNews.length}`}
      onClose={closeInspectorRoute}
      footer={
        <div className="news-footer-actions">
          <Button
            size="sm"
            variant="default"
            className="ai-refresh-button"
            leadingIcon={<RefreshCw size={12} className={aiRegenerating ? "spin" : ""} />}
            onClick={regenerateAiOverview}
            disabled={aiRegenerating}
          >
            {aiRegenerating ? "Refreshing AI" : "Refresh Weekly Brief"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<RefreshCw size={12} />}
            onClick={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News failed" }).then(load)}
          >
            Refresh RSS
          </Button>
        </div>
      }
    >
      <AiNewsOverviewCard
        overview={aiOverview}
        loading={aiLoading}
        error={aiError}
        onRetry={loadAiOverview}
        regenerating={aiRegenerating}
      />
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
