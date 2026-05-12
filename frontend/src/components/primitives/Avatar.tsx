import type { RiskSeverity } from "../../types";

type AvatarProps = {
  label: string;
  size?: "sm" | "md" | "lg";
  ring?: RiskSeverity;
  title?: string;
  className?: string;
};

function initials(label: string): string {
  const words = label.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const RING_CLASS: Partial<Record<RiskSeverity, string>> = {
  critical: "ring-crit",
  high: "ring-high",
  medium: "ring-med",
  low: "ring-low",
};

export function Avatar({ label, size = "md", ring, title, className = "" }: AvatarProps) {
  const classes = ["avatar", size !== "md" && size, ring && RING_CLASS[ring], className].filter(Boolean).join(" ");
  return (
    <span className={classes} title={title ?? label}>
      {initials(label)}
    </span>
  );
}
