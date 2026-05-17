import { Database } from "lucide-react";
import { navigateTo } from "../../hooks/useRoute";

type Variant = "inline" | "chip" | "button";

type EvidenceLinkProps = {
  id: number | null | undefined;
  variant?: Variant;
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

/**
 * Canonical evidence affordance. Wherever the app shows an evidence
 * reference (vessel popovers, list rows, risk cards, sanctions matches,
 * port events, news), use this primitive so the
 * styling stays consistent and the click target is always actionable.
 */
export function EvidenceLink({ id, variant = "inline", label, className = "", onClick }: EvidenceLinkProps) {
  if (id == null) return null;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick(e);
    navigateTo(`/evidence/${id}`);
  };
  const text = label ?? `Evidence #${id}`;

  if (variant === "chip") {
    return (
      <button type="button" onClick={handleClick} className={`pill info ${className}`.trim()} style={{ cursor: "pointer", border: 0 }}>
        <Database size={10} />
        <span className="mono">#{id}</span>
      </button>
    );
  }
  if (variant === "button") {
    return (
      <button type="button" onClick={handleClick} className={`btn sm ${className}`.trim()}>
        <Database size={12} />
        {text}
      </button>
    );
  }
  return (
    <a
      href={`/evidence/${id}`}
      onClick={handleClick}
      className={`mono ${className}`.trim()}
      style={{ fontSize: 11, color: "var(--ocean-500)", display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <Database size={10} />
      #{id}
    </a>
  );
}
