import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

type ErrorStateProps = {
  title?: string;
  body?: ReactNode;
  onRetry?: () => void;
  secondary?: { label: string; onClick: () => void };
  className?: string;
};

export function ErrorState({ title = "Something went wrong", body, onRetry, secondary, className = "" }: ErrorStateProps) {
  return (
    <div className={`errstate ${className}`.trim()}>
      <div className="errstate-icon">
        <AlertTriangle size={20} />
      </div>
      <div>
        <div className="t-h1">{title}</div>
        {body && <div className="t-sm" style={{ marginTop: 4 }}>{body}</div>}
      </div>
      {(onRetry || secondary) && (
        <div className="row" style={{ marginTop: 4 }}>
          {onRetry && <Button variant="primary" onClick={onRetry}>Retry</Button>}
          {secondary && <Button onClick={secondary.onClick}>{secondary.label}</Button>}
        </div>
      )}
    </div>
  );
}
