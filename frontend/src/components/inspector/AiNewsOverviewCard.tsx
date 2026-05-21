import {
  AlertCircle,
  AlertTriangle,
  Anchor,
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { AiNewsOverviewResponse, BriefWatchItem, AiWatchKind } from "../../api";
import { formatRelative } from "../../format";
import { navigateTo } from "../../hooks/useRoute";
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

const KIND_META: Record<AiWatchKind, { label: string; icon: typeof AlertTriangle }> = {
  action: { label: "Action", icon: AlertTriangle },
  investigate: { label: "Investigate", icon: Search },
  monitor: { label: "Monitor", icon: Eye },
};

export function AiNewsOverviewCard({ overview, loading, error, onRetry, onRegenerate, regenerating }: Props) {
  const [debugOpen, setDebugOpen] = useState(false);

  if (loading) {
    return (
      <section className="ai-news-overview is-compact">
        <BriefHeader subtitle="Building Singapore analyst brief…" />
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
          title="Singapore Brief unavailable"
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
        <h4>{o.headline}</h4>
        {o.bottom_line && (
          <p className="ai-brief-bottom-line">
            <strong>Bottom line.</strong> {o.bottom_line}
          </p>
        )}
      </div>

      <div className="ai-brief-twocol">
        <div>
          <div className="ai-brief-section-head">
            <Sparkles size={11} />
            <span>Watch list</span>
            <span className="ai-brief-section-count">{o.watch_items.length}</span>
          </div>
          {o.watch_items.length === 0 ? (
            <div className="ai-brief-empty-line">No Singapore watch items in window.</div>
          ) : (
            <ul className="ai-brief-watch-list">
              {o.watch_items.map((item, index) => (
                <WatchRow key={`${item.title}-${index}`} item={item} />
              ))}
            </ul>
          )}
        </div>

        <aside className="ai-brief-side">
          {o.themes.length > 0 && (
            <div>
              <div className="ai-brief-section-head">
                <span>Signals</span>
              </div>
              <ul className="ai-brief-themes-inline">
                {o.themes.map((theme) => (
                  <li key={theme.title}>
                    <span className="ai-theme-title">{theme.title}</span>
                    <span className="ai-theme-count">{theme.article_count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PlatformSignalsRow signals={o.platform_signals} />
        </aside>
      </div>

      {o.coverage_gaps.length > 0 && (
        <p className="ai-brief-gaps-line" title={o.coverage_gaps.join(" · ")}>
          <span className="ai-brief-kicker">Gaps</span> {o.coverage_gaps.join(" · ")}
        </p>
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
          {overview.debug.estimated_cost_usd != null && (
            <span>cost: {formatCost(overview.debug.estimated_cost_usd)}</span>
          )}
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
            <h3>Singapore Brief</h3>
            {windowHours != null && (
              <span className="ai-brief-window-text">· {formatWindow(windowHours)}</span>
            )}
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
          {regenerating ? "Regenerating" : "Regenerate"}
        </Button>
      )}
    </div>
  );
}

function WatchRow({ item }: { item: BriefWatchItem }) {
  const meta = KIND_META[item.kind] ?? KIND_META.monitor;
  const Icon = meta.icon;
  const lead = item.subject ? `${item.subject} — ${item.title}` : item.title;
  const firstCitation = item.citations[0];
  return (
    <li className={`ai-watch-row severity-${item.severity} kind-${item.kind}`}>
      <span className={`ai-watch-kind kind-${item.kind}`} title={`${meta.label} · ${item.summary}`}>
        <Icon size={10} />
        {meta.label}
      </span>
      <span className="ai-watch-lead" title={item.summary}>{lead}</span>
      {firstCitation && (
        <a
          href={firstCitation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ai-watch-source"
          title={firstCitation.title}
        >
          {firstCitation.source}
          <ExternalLink size={10} />
        </a>
      )}
    </li>
  );
}

function PlatformSignalsRow({ signals }: { signals: AiNewsOverviewResponse["overview"]["platform_signals"] }) {
  const total = signals.new_risk_flags + signals.new_port_events + signals.new_evidence_records;
  if (total === 0) return null;
  return (
    <div>
      <div className="ai-brief-section-head">
        <span>Platform</span>
      </div>
      <ul className="ai-platform-row">
        <li>
          <button type="button" onClick={() => navigateTo("/risk")} title="Open risk feed">
            <ShieldAlert size={11} />
            <strong>{signals.new_risk_flags}</strong>
            <span>risk</span>
            <ChevronRight size={10} />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => navigateTo("/vessels")} title="Open vessels">
            <Anchor size={11} />
            <strong>{signals.new_port_events}</strong>
            <span>ports</span>
            <ChevronRight size={10} />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => navigateTo("/data/source_observations")} title="Open evidence">
            <FileText size={11} />
            <strong>{signals.new_evidence_records}</strong>
            <span>evidence</span>
            <ChevronRight size={10} />
          </button>
        </li>
      </ul>
    </div>
  );
}

function formatWindow(hours: number) {
  if (hours === 168) return "Last 7 days";
  if (hours > 0 && hours % 24 === 0) return `Last ${hours / 24} days`;
  return `Last ${hours} hours`;
}

function formatCost(value: number) {
  if (!Number.isFinite(value)) return "n/a";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}
