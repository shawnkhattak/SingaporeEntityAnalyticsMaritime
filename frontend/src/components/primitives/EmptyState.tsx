import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  /** Compact = inline list-empty variant. Default is the big card. */
  compact?: boolean;
  className?: string;
};

export function EmptyState({ icon, title, body, action, secondary, compact, className = "" }: EmptyStateProps) {
  if (compact) {
    return (
      <div className={`empty empty-compact ${className}`.trim()}>
        {icon && <div className="empty-icon empty-icon-sm">{icon}</div>}
        <div className="empty-title" style={{ fontSize: 13 }}>{title}</div>
        {body && <div className="empty-body" style={{ maxWidth: "none" }}>{body}</div>}
        {(action || secondary) && (
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            {action}
            {secondary}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`empty ${className}`.trim()}>
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {body && <div className="empty-body">{body}</div>}
      {(action || secondary) && (
        <div className="row" style={{ gap: 6 }}>
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
