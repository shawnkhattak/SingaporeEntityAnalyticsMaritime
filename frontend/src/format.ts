export function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
