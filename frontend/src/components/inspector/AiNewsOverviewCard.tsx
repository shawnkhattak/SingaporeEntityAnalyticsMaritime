import {
  AlertCircle,
  Anchor,
  Bot,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  Network,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type {
  AiNewsOverviewResponse,
  BriefEntityLinkageChange,
  BriefMetricCard,
  BriefNewsRow,
  BriefOperationalItem,
  BriefRiskChange,
  BriefSupportedItem,
} from "../../api";
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
        {o.executive_summary && <p className="ai-brief-bottom-line">{o.executive_summary}</p>}
      </div>

      {o.metric_cards.length > 0 && (
        <div className="ai-weekly-metrics">
          {o.metric_cards.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      )}

      <div className="ai-weekly-grid">
        <BriefSection title="Vessel Risk Changes" count={o.vessel_risk_changes.length} icon={<ShieldAlert size={11} />}>
          {o.vessel_risk_changes.length === 0 ? (
            <div className="ai-brief-empty-line">No supported vessel risk changes.</div>
          ) : (
            <ul className="ai-weekly-list">
              {o.vessel_risk_changes.map((item, index) => <RiskChangeRow key={`${item.vessel_name}-${index}`} item={item} />)}
            </ul>
          )}
        </BriefSection>

        <BriefSection title="Entity Linkages" count={o.entity_linkage_changes.length} icon={<Network size={11} />}>
          {o.entity_linkage_changes.length === 0 ? (
            <div className="ai-brief-empty-line">No supported entity linkage changes.</div>
          ) : (
            <ul className="ai-weekly-list">
              {o.entity_linkage_changes.map((item, index) => <EntityChangeRow key={`${item.entity_name}-${index}`} item={item} />)}
            </ul>
          )}
        </BriefSection>

        <BriefSection title="Operational Context" count={o.operational_context.length} icon={<Anchor size={11} />}>
          {o.operational_context.length === 0 ? (
            <div className="ai-brief-empty-line">No computed operational signals.</div>
          ) : (
            <ul className="ai-weekly-list">
              {o.operational_context.map((item, index) => <OperationalRow key={`${item.title}-${index}`} item={item} />)}
            </ul>
          )}
        </BriefSection>

        <BriefSection title="News Sources" count={o.news_rows.length} icon={<FileText size={11} />}>
          {o.news_rows.length === 0 ? (
            <div className="ai-brief-empty-line">No scoped source rows.</div>
          ) : (
            <ul className="ai-weekly-list">
              {o.news_rows.map((item, index) => <NewsRow key={`${item.title}-${index}`} item={item} />)}
            </ul>
          )}
        </BriefSection>
      </div>

      <PlatformSignalsRow signals={o.platform_signals} />

      {(o.method_note || o.coverage_gaps.length > 0) && (
        <div className="ai-method-row">
          {o.method_note && <p><span className="ai-brief-kicker">Method</span>{o.method_note}</p>}
          {o.coverage_gaps.length > 0 && (
            <p title={o.coverage_gaps.join(" · ")}><span className="ai-brief-kicker">Gaps</span>{o.coverage_gaps.join(" · ")}</p>
          )}
        </div>
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

function MetricCard({ metric }: { metric: BriefMetricCard }) {
  return (
    <div className={`ai-weekly-metric tone-${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      {metric.delta && <small>{metric.delta}</small>}
      <CitationButton item={metric} />
    </div>
  );
}

function RiskChangeRow({ item }: { item: BriefRiskChange }) {
  return (
    <li className={`ai-weekly-row severity-${item.severity}`}>
      <div>
        <strong>{item.vessel_name}</strong>
        <span>{item.change}</span>
        <p>{item.summary}</p>
      </div>
      <CitationButton item={item} />
    </li>
  );
}

function EntityChangeRow({ item }: { item: BriefEntityLinkageChange }) {
  return (
    <li className="ai-weekly-row severity-none">
      <div>
        <strong>{item.entity_name}</strong>
        <span>{item.change}</span>
        <p>{item.summary}</p>
      </div>
      <CitationButton item={item} />
    </li>
  );
}

function OperationalRow({ item }: { item: BriefOperationalItem }) {
  return (
    <li className={`ai-weekly-row severity-${item.severity}`}>
      <div>
        <strong>{item.title}</strong>
        <span>{signalLabel(item.signal_type)}</span>
        <p>{item.summary}</p>
      </div>
      <CitationButton item={item} />
    </li>
  );
}

function NewsRow({ item }: { item: BriefNewsRow }) {
  const firstCitation = item.citations[0];
  return (
    <li className="ai-weekly-row severity-none">
      <div>
        <strong>{item.title}</strong>
        <span>{item.source_quality || item.source || "Source"}</span>
        <p>{item.summary}</p>
      </div>
      {firstCitation ? (
        <a className="ai-citation-button" href={firstCitation.url} target="_blank" rel="noopener noreferrer" title={`${firstCitation.source}: ${firstCitation.title}`}>
          <ExternalLink size={11} />
        </a>
      ) : (
        <CitationButton item={item} />
      )}
    </li>
  );
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

function PlatformSignalsRow({ signals }: { signals: AiNewsOverviewResponse["overview"]["platform_signals"] }) {
  const total = signals.new_risk_flags + signals.new_port_events + signals.new_evidence_records;
  if (total === 0) return null;
  return (
    <ul className="ai-platform-row ai-platform-inline">
      <li>
        <button type="button" onClick={() => navigateTo("/risk")} title="Open risk feed">
          <ShieldAlert size={11} />
          <strong>{signals.new_risk_flags}</strong>
          <span>risk flags since last brief</span>
        </button>
      </li>
      <li>
        <button type="button" onClick={() => navigateTo("/vessels")} title="Open vessels">
          <Anchor size={11} />
          <strong>{signals.new_port_events}</strong>
          <span>port events since last brief</span>
        </button>
      </li>
      <li>
        <button type="button" onClick={() => navigateTo("/data/source_observations")} title="Open evidence">
          <FileText size={11} />
          <strong>{signals.new_evidence_records}</strong>
          <span>evidence records since last brief</span>
        </button>
      </li>
    </ul>
  );
}

function signalLabel(signal: BriefOperationalItem["signal_type"]) {
  return signal.replaceAll("_", " ");
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
