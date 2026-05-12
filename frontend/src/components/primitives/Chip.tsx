import type { ReactNode } from "react";

type ChipProps = {
  selected?: boolean;
  tone?: "default" | "crit" | "high" | "med" | "low";
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

export function Chip({ selected, tone = "default", onClick, className = "", children }: ChipProps) {
  const classes = ["chip", tone !== "default" && tone, selected && "selected", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
