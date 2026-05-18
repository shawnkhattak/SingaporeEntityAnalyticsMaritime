import type { ReactNode } from "react";
import type { HealthStatus, JobStatusUi, RiskSeverity } from "../../types";
import { displaySeverity } from "../../labels";

type PillProps = {
  variant?: "default" | "crit" | "high" | "med" | "low" | "none" | "ok" | "stale" | "fail" | "info";
  solid?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Pill({ variant = "default", solid, icon, children, className = "" }: PillProps) {
  const classes = ["pill", variant !== "default" && variant, solid && "solid", className].filter(Boolean).join(" ");
  return (
    <span className={classes}>
      {icon}
      {children}
    </span>
  );
}

const SEVERITY_TO_VARIANT: Record<RiskSeverity, PillProps["variant"]> = {
  critical: "crit",
  high: "high",
  medium: "med",
  low: "low",
  none: "none",
};

export function RiskPill({ severity, label }: { severity: RiskSeverity; label?: string }) {
  if (severity === "none") return <Pill variant="none">No risk</Pill>;
  const display = displaySeverity(severity) as RiskSeverity;
  return <Pill variant={SEVERITY_TO_VARIANT[display]}>{label ?? display[0].toUpperCase() + display.slice(1)}</Pill>;
}

const HEALTH_TO_VARIANT: Record<HealthStatus, PillProps["variant"]> = {
  ok: "ok",
  stale: "stale",
  fail: "fail",
};

export function HealthPill({ status, label }: { status: HealthStatus; label?: string }) {
  return (
    <Pill variant={HEALTH_TO_VARIANT[status]}>
      <span className="dot" />
      {label ?? (status === "ok" ? "Healthy" : status === "stale" ? "Stale" : "Failing")}
    </Pill>
  );
}

const JOB_TO_VARIANT: Record<JobStatusUi, PillProps["variant"]> = {
  queued: "none",
  running: "info",
  success: "ok",
  failure: "fail",
};

export function JobPill({ status, label }: { status: JobStatusUi; label?: string }) {
  return <Pill variant={JOB_TO_VARIANT[status]}>{label ?? status}</Pill>;
}

export function classifyHealth(s: string | null | undefined): HealthStatus {
  if (!s) return "fail";
  const lower = s.toLowerCase();
  if (lower === "ok" || lower === "healthy" || lower === "success") return "ok";
  if (lower === "fail" || lower === "failure" || lower === "error") return "fail";
  return "stale";
}

export function classifyJob(status: string | null | undefined): JobStatusUi {
  switch ((status ?? "").toLowerCase()) {
    case "running":
    case "in_progress":
      return "running";
    case "success":
    case "completed":
    case "ok":
      return "success";
    case "failure":
    case "failed":
    case "error":
      return "failure";
    default:
      return "queued";
  }
}
