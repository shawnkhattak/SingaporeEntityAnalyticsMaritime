/**
 * App-wide display timezone. SEAM is an analyst tool used out of Houston,
 * so all timestamps are rendered in America/Chicago regardless of the
 * device's timezone. Override this constant if a deployment ever needs
 * a different anchor (or wire it through env).
 */
export const APP_TIME_ZONE = "America/Chicago";

/**
 * Parses a backend timestamp. If the string carries no timezone info
 * (FastAPI/SQLAlchemy commonly serialize naive UTC datetimes), we treat
 * it as UTC by appending `Z`. The resulting Date is rendered in
 * `APP_TIME_ZONE` by every consumer.
 */
export function parseBackendDate(value: string): Date {
  if (!value) return new Date(NaN);
  const hasTz = /(Z|[+\-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTz ? value : `${value}Z`);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseBackendDate(value);
  const ms = Date.now() - date.getTime();
  if (!Number.isFinite(ms)) return "—";
  if (ms < 0) return "just now";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export function formatUnknown(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "-";
}

export function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function formatCount(value: unknown) {
  return String(numberValue(value));
}

export function formatInserted(value: unknown) {
  const inserted = numberValue(value);
  return inserted > 0 ? ` / ${inserted}` : "";
}

export function formatPositionsSummary(counts: Record<string, unknown>) {
  const observations = numberValue(counts.observations_inserted);
  const deduped = numberValue(counts.observations_deduped);
  const skipped = numberValue(counts.skipped);
  return `${observations} observations inserted, ${deduped} deduped, ${skipped} skipped.`;
}
