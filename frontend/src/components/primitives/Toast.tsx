import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useEffect } from "react";
import type { Toast as ToastModel, ToastVariant } from "../../types";
import { TOAST_TTL } from "../../types";

const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const COLORS: Record<ToastVariant, string> = {
  success: "var(--health-ok)",
  info: "var(--ocean-500)",
  warning: "var(--risk-medium)",
  error: "var(--risk-critical)",
};

type ToastProps = {
  toast: ToastModel;
  onDismiss: (id: string) => void;
};

export function ToastView({ toast, onDismiss }: ToastProps) {
  const Icon = ICONS[toast.variant];
  useEffect(() => {
    const ttl = toast.ttl ?? TOAST_TTL[toast.variant];
    if (!ttl) return;
    const id = window.setTimeout(() => onDismiss(toast.id), ttl);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.ttl, toast.variant, onDismiss]);

  return (
    <div className={`toast ${toast.variant}`} role="status">
      <Icon size={16} color={COLORS[toast.variant]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="toast-title">
          {toast.title}
          {toast.tag && <span className="t-faded mono" style={{ marginLeft: 6, fontSize: 11 }}>{toast.tag}</span>}
        </div>
        {toast.body && <div className="toast-body">{toast.body}</div>}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <X size={14} />
      </button>
    </div>
  );
}
