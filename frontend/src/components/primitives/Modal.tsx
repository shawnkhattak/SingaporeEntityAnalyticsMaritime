import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  primaryAction?: { label: string; onClick: () => void; variant?: "primary" | "danger" };
  secondaryAction?: { label: string; onClick: () => void };
};

export function Modal({ open, title, children, onClose, primaryAction, secondaryAction }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 className="modal-title" style={{ flex: 1 }}>{title}</h2>
          <button className="btn ghost icon" type="button" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {(primaryAction || secondaryAction) && (
          <div className="modal-actions">
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
            )}
            {primaryAction && (
              <Button variant={primaryAction.variant ?? "primary"} onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
