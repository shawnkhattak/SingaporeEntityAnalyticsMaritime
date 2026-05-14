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

/**
 * Backend `source_record_id` is built as a pipe-delimited concatenation
 * of `imo | mmsi | call_sign | observed_at.isoformat()` (see
 * `backend/app/services/ingestion.py:176`). The Evidence tab used to
 * render it raw, which is unreadable. This parser splits the string
 * back into structured fields when it conforms, else returns `raw`
 * for inputs that aren't pipe-delimited (sanctions/news/CSV ids).
 */
export type ParsedSourceRecordId =
  | { kind: "structured"; imo: string | null; mmsi: string | null; callSign: string | null; observedAt: string | null; display: string }
  | { kind: "raw"; raw: string };

export function parseSourceRecordId(value: string | null | undefined): ParsedSourceRecordId | null {
  if (!value) return null;
  if (!value.includes("|")) return { kind: "raw", raw: value };
  const parts = value.split("|");
  if (parts.length < 2 || parts.length > 4) return { kind: "raw", raw: value };
  // The ingestion code filters empty parts before joining, so we can't
  // reliably tell which field is which by position. Use light heuristics:
  // IMO is 6-9 digits, MMSI is 7-9 digits (usually 9), call_sign is alphanumeric,
  // observed_at looks like an ISO timestamp.
  let imo: string | null = null;
  let mmsi: string | null = null;
  let callSign: string | null = null;
  let observedAt: string | null = null;
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
      observedAt = t;
    } else if (/^\d{7}$/.test(t) && !imo) {
      imo = t;
    } else if (/^\d{8,9}$/.test(t)) {
      // 9-digit numeric → likely MMSI (or rarely IMO without check digit).
      if (mmsi) imo = t;
      else mmsi = t;
    } else {
      callSign = t;
    }
  }
  const displayParts = [
    imo && `IMO ${imo}`,
    mmsi && `MMSI ${mmsi}`,
    callSign,
    observedAt && formatRelative(observedAt),
  ].filter(Boolean) as string[];
  return {
    kind: "structured",
    imo,
    mmsi,
    callSign,
    observedAt,
    display: displayParts.join(" · ") || value,
  };
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
