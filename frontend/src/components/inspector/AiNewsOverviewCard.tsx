import {
  AlertCircle,
  Bot,
  ChevronDown,
  Database,
  ExternalLink,
  ListChecks,
  Newspaper,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type {
  AiNewsOverviewResponse,
  BriefKeyDevelopment,
  BriefNewsRow,
  BriefSupportedItem,
  SourceClass,
} from "../../api";
import { formatRelative } from "../../format";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";

type Props = {
  overview: AiNewsOverviewResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRegenerate?: () => void;
  regenerating: boolean;
};

export function AiNewsOverviewCard({ overview, loading, error, onRetry, onRegenerate, regenerating }: Props) {
  const [debugOpen, setDebugOpen] = useState(false);

  if (loading) {
    return (
      <section className="ai-news-overview is-compact">
        <BriefHeader subtitle="Loading AI Weekly Brief..." />
        <Skeleton height={56} />
        <Skeleton height={120} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="ai-news-overview is-compact">
        <EmptyState
          compact
          icon={<AlertCircle size={18} />}
          title="AI Weekly Brief unavailable"
          body={error}
          action={<Button size="sm" onClick={onRetry}>Retry</Button>}
        />
      </section>
    );
  }

  if (!overview) return null;

  if (overview.status === "disabled") {
    return (
      <section className="ai-news-overview ai-news-disabled is-compact">
        <BriefHeader subtitle={overview.disabled_reason ?? "AI features are disabled."} mutedIcon />
      </section>
    );
  }

  const o = overview.overview;
  const keyDevelopments = o.key_developments ?? [];
  const newsRows = o.news_rows ?? [];
  const visibleKeyDevelopments = keyDevelopments.filter((item) => item.source_type !== "database").slice(0, 3);
  const importantItems = [
    ...newsRows.slice(0, 4).map((item, index) => ({ kind: "news" as const, item, score: 100 - index })),
  ].sort((a, b) => b.score - a.score).slice(0, 6);
  const visibleHeadline = visibleKeyDevelopments[0]?.label ?? newsRows[0]?.title ?? "No source-linked news in this window";
  const visibleSummary = newsRows.length > 0
    ? newsRows.slice(0, 2).map((item) => item.summary).filter(Boolean).join(" ")
    : "No external news items were selected for this window.";

  return (
    <section className="ai-news-overview is-compact">
      <BriefHeader
        windowHours={overview.window_hours}
        generatedAt={overview.generated_at}
        articleCount={overview.article_count}
        sourceCount={overview.source_count}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
      />

      <div className="ai-brief-headline-card">
        <h4>{visibleHeadline}</h4>
        {visibleSummary && <p className="ai-brief-bottom-line">{visibleSummary}</p>}
      </div>

      {visibleKeyDevelopments.length > 0 && (
        <div className="ai-key-devs">
          <div className="ai-brief-section-head">
            <ListChecks size={11} />
            <span>Important Key Developments</span>
          </div>
          <ol>
            {visibleKeyDevelopments.map((item) => (
              <KeyDevelopmentRow key={item.id || item.label} item={item} />
            ))}
          </ol>
        </div>
      )}

      {importantItems.length > 0 && (
        <BriefSection title="Most Important News" count={importantItems.length} icon={<Newspaper size={11} />}>
          <ul className="ai-weekly-list">
            {importantItems.map((entry, index) => <ImportantNewsRow key={`${entry.kind}-${index}`} entry={entry} />)}
          </ul>
        </BriefSection>
      )}

      <button type="button" className="ai-debug-toggle" onClick={() => setDebugOpen((open) => !open)}>
        <ChevronDown size={12} className={debugOpen ? "is-open" : ""} />
        Brief metadata
      </button>
      {debugOpen && (
        <div className="ai-debug-panel">
          <span>provider: {overview.model_provider}</span>
          <span>model: {overview.model_name}</span>
          <span>cache: {overview.debug.cache_hit ? "hit" : "miss"}</span>
          <span>input: {overview.debug.input_hash?.slice(0, 10) ?? "none"}</span>
          <span>articles: {overview.debug.selected_article_count}/{overview.debug.candidate_article_count}</span>
          {overview.debug.estimated_cost_usd != null && <span>cost: {formatCost(overview.debug.estimated_cost_usd)}</span>}
          {overview.debug.warnings.map((warning) => <span key={warning} className="warn">{warning}</span>)}
        </div>
      )}
    </section>
  );
}

function BriefHeader({
  subtitle,
  mutedIcon = false,
  windowHours,
  generatedAt,
  articleCount,
  sourceCount,
  onRegenerate,
  regenerating,
}: {
  subtitle?: string;
  mutedIcon?: boolean;
  windowHours?: number;
  generatedAt?: string | null;
  articleCount?: number;
  sourceCount?: number;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  return (
    <div className="ai-brief-header">
      <div className="row" style={{ gap: 8, minWidth: 0, alignItems: "center" }}>
        <span className={`ai-brief-icon ${mutedIcon ? "muted" : ""}`}>
          {mutedIcon ? <Bot size={13} /> : <Sparkles size={13} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6, alignItems: "center" }}>
            <h3>AI Weekly Brief</h3>
            {windowHours != null && <span className="ai-brief-window-text">· {formatWindow(windowHours)}</span>}
          </div>
          <p>
            {subtitle ?? (
              <>
                {generatedAt ? `Generated ${formatRelative(generatedAt)}` : "Awaiting first generation"}
                {articleCount != null && <> · {articleCount} articles</>}
                {sourceCount != null && <> · {sourceCount} sources</>}
              </>
            )}
          </p>
        </div>
      </div>
      {onRegenerate && (
        <Button size="sm" onClick={onRegenerate} disabled={regenerating} leadingIcon={<RefreshCw size={11} className={regenerating ? "spin" : ""} />}>
          {regenerating ? "Refreshing" : "Refresh"}
        </Button>
      )}
    </div>
  );
}

function BriefSection({ title, count, icon, children }: { title: string; count: number; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="ai-weekly-section">
      <div className="ai-brief-section-head">
        {icon}
        <span>{title}</span>
        <span className="ai-brief-section-count">{count}</span>
      </div>
      {children}
    </div>
  );
}

function KeyDevelopmentRow({ item }: { item: BriefKeyDevelopment }) {
  return (
    <li title={item.why_shown || undefined}>
      <span>{item.label}</span>
      <SourceButtons item={item} />
    </li>
  );
}

type ImportantEntry = { kind: "news"; item: BriefNewsRow; score: number };

function ImportantNewsRow({ entry }: { entry: ImportantEntry }) {
  return <NewsRow item={entry.item} />;
}

function NewsRow({ item }: { item: BriefNewsRow }) {
  return (
    <li className="ai-weekly-row severity-none">
      <span className="ai-row-icon"><Newspaper size={12} /></span>
      <div>
        <strong>{item.title}</strong>
        <span>
          <SourceBadge sourceClass={item.source_class} />
          {item.source_quality || item.source || "Source"}
          {item.published_at ? ` · ${formatRelative(item.published_at)}` : ""}
          {item.matched_to ? ` · ${matchedLabel(item.matched_to.type)}: ${item.matched_to.label}` : ""}
        </span>
        <p>{item.summary}</p>
        <WhyShown text={item.why_shown} />
      </div>
      <SourceButtons item={item} fallbackUrl={item.url ?? undefined} fallbackTitle={item.title} fallbackSource={item.source ?? undefined} />
    </li>
  );
}

function WhyShown({ text }: { text?: string }) {
  if (!text) return null;
  return <small className="ai-why" title={text}>Why shown: {text}</small>;
}

function SourceBadge({ sourceClass }: { sourceClass: SourceClass }) {
  return <b className={`ai-source-class source-${sourceClass}`} title={sourceClassTooltip(sourceClass)}>{sourceClassLabel(sourceClass)}</b>;
}

function CitationButton({ item }: { item: BriefSupportedItem }) {
  const supportCount = item.support_ids.length + item.article_ids.length + item.evidence_ids.length;
  if (supportCount === 0) return null;
  const label = [
    item.support_ids.length ? `${item.support_ids.length} support` : null,
    item.article_ids.length ? `${item.article_ids.length} article` : null,
    item.evidence_ids.length ? `${item.evidence_ids.length} evidence` : null,
  ].filter(Boolean).join(" · ");
  return (
    <button type="button" className="ai-citation-button" title={label}>
      <Database size={11} />
    </button>
  );
}

function SourceButtons({
  item,
  fallbackUrl,
  fallbackTitle,
  fallbackSource,
}: {
  item: BriefSupportedItem;
  fallbackUrl?: string;
  fallbackTitle?: string;
  fallbackSource?: string;
}) {
  const citations = item.citations.slice(0, 2);
  if (citations.length === 0 && fallbackUrl) {
    return (
      <a className="ai-citation-button" href={fallbackUrl} target="_blank" rel="noopener noreferrer" title={`${fallbackSource ?? "Source"}: ${fallbackTitle ?? fallbackUrl}`}>
        <ExternalLink size={11} />
      </a>
    );
  }
  if (citations.length === 0) return <CitationButton item={item} />;
  return (
    <span className="ai-source-buttons" aria-label="Sources">
      {citations.map((citation, index) => (
        <a
          key={citation.id}
          className="ai-citation-button"
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${citation.source}: ${citation.title}`}
        >
          {index + 1}
        </a>
      ))}
    </span>
  );
}

function formatWindow(hours: number) {
  if (hours === 168) return "Last 7 days";
  if (hours > 0 && hours % 24 === 0) return `Last ${hours / 24} days`;
  return `Last ${hours} hours`;
}

function sourceClassLabel(value: SourceClass) {
  return {
    official: "Official",
    trade: "Trade",
    social_unverified: "Social / Unverified",
    general_news: "General News",
    unknown: "Unknown",
  }[value];
}

function sourceClassTooltip(value: SourceClass) {
  return {
    official: "Government, port authority, regulator, or military source.",
    trade: "Maritime or logistics trade publication.",
    social_unverified: "Social source; useful context but not independently verified by SEAM.",
    general_news: "General news or search feed source.",
    unknown: "Source classification was not available.",
  }[value];
}

function matchedLabel(value: string) {
  if (value === "vessel") return "Vessel match";
  if (value === "entity") return "Entity match";
  return "Topic match";
}

function formatCost(value: number) {
  if (!Number.isFinite(value)) return "n/a";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}
