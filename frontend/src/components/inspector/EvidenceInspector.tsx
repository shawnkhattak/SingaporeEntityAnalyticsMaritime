import { ArrowLeft, Building2, CheckCircle2, Copy, ExternalLink, Hash, Link as LinkIcon, Ship, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getEvidence, type EvidenceDetail } from "../../api";
import { closeInspectorRoute, navigateTo } from "../../hooks/useRoute";
import { recordRecent } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { ErrorState } from "../primitives/ErrorState";
import { JsonViewer } from "../primitives/JsonViewer";
import { Skeleton } from "../primitives/Skeleton";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

export function EvidenceInspector({ id }: { id: number }) {
  const [data, setData] = useState<EvidenceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verify, setVerify] = useState<"idle" | "checking" | "match" | "mismatch">("idle");

  function load() {
    setError(null);
    setVerify("idle");
    getEvidence(id)
      .then((d) => {
        setData(d);
        recordRecent("evidence", id, `Evidence #${id} · ${d.source}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function verifyHash() {
    if (!data) return;
    setVerify("checking");
    try {
      // Match the backend canonicalization:
      // json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
      const canonical = canonicalJson(data.raw_payload);
      const buf = new TextEncoder().encode(canonical);
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setVerify(hex === data.payload_hash ? "match" : "mismatch");
    } catch {
      setVerify("mismatch");
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  if (error) {
    return (
      <InspectorShell breadcrumb="Evidence" title={`Evidence #${id}`} onClose={closeInspectorRoute}>
        <ErrorState body={error} onRetry={load} />
      </InspectorShell>
    );
  }
  if (!data) {
    return (
      <InspectorShell breadcrumb="Evidence" title={`Evidence #${id}`} onClose={closeInspectorRoute}>
        <Skeleton height={80} />
      </InspectorShell>
    );
  }

  const payload = data.raw_payload ?? {};
  const linked = collectLinkedSubjects(payload);
  const rawUrl = typeof payload.url === "string" ? payload.url : null;

  return (
    <InspectorShell
      breadcrumb="Evidence"
      title={`Evidence #${data.id}`}
      onClose={closeInspectorRoute}
    >
      {/* Top action bar */}
      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Button
          size="sm"
          leadingIcon={<ArrowLeft size={12} />}
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigateTo("/map");
          }}
        >
          Back
        </Button>
        <Button size="sm" leadingIcon={<Copy size={12} />} onClick={() => copy(String(data.id))}>
          Copy ID
        </Button>
        <Button size="sm" leadingIcon={<Hash size={12} />} onClick={() => copy(data.payload_hash)}>
          Copy hash
        </Button>
        <Button
          size="sm"
          leadingIcon={
            verify === "match" ? <CheckCircle2 size={12} color="var(--health-ok)" /> :
            verify === "mismatch" ? <XCircle size={12} color="var(--risk-medium)" /> :
            <Hash size={12} />
          }
          onClick={verifyHash}
          disabled={verify === "checking"}
        >
          {verify === "checking" ? "Verifying…" :
           verify === "match" ? "Hash matches" :
           verify === "mismatch" ? "Hash differs" :
           "Verify hash"}
        </Button>
        {rawUrl && (
          <Button size="sm" leadingIcon={<ExternalLink size={12} />} onClick={() => window.open(rawUrl, "_blank", "noopener,noreferrer")}>
            View raw source
          </Button>
        )}
      </div>

      {verify === "mismatch" && (
        <div className="card stripe-med" style={{ padding: "8px 12px 8px 14px", marginBottom: 12 }}>
          <div className="t-sm">
            Hash didn't match our re-computed canonical form. This usually means the payload was re-serialized after ingestion (key order, whitespace) rather than tampered with. Treat as inconclusive.
          </div>
        </div>
      )}

      {/* Metadata grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Meta label="Source" value={data.source} />
        <Meta label="Observation type" value={data.observation_type} />
        <Meta label="Source record ID" value={data.source_record_id ?? "—"} mono />
        <Meta label="Observed at" value={formatDate(data.observed_at)} />
        <Meta label="Fetched at" value={formatDate(data.fetched_at)} />
        <Meta label="Hash" value={`${data.payload_hash.slice(0, 12)}…`} mono />
      </div>

      {/* Linked subjects */}
      {linked.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="t-caption" style={{ paddingBottom: 6 }}>Linked subjects</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {linked.map((l) => (
              <button
                key={`${l.kind}-${l.id ?? l.value}`}
                type="button"
                className="pill info lift"
                style={{ cursor: "pointer", border: 0 }}
                onClick={() => l.href && navigateTo(l.href)}
                disabled={!l.href}
                title={l.href ?? "No detail page available"}
              >
                {l.kind === "vessel" ? <Ship size={10} /> : l.kind === "entity" ? <Building2 size={10} /> : <LinkIcon size={10} />}
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="t-caption" style={{ paddingBottom: 6 }}>Raw payload</div>
      <JsonViewer value={payload} />
    </InspectorShell>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card" style={{ padding: "8px 10px" }}>
      <div className="t-caption" style={{ fontSize: 10 }}>{label}</div>
      <div className={`row ${mono ? "mono" : ""}`} style={{ fontSize: 12 }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      </div>
    </div>
  );
}

type LinkedSubject = {
  kind: "vessel" | "entity" | "other";
  label: string;
  id?: number | string;
  value?: string;
  href?: string;
};

function collectLinkedSubjects(payload: Record<string, unknown>): LinkedSubject[] {
  const out: LinkedSubject[] = [];
  const vesselId = pickNumber(payload, "vessel_id");
  if (vesselId != null) out.push({ kind: "vessel", label: `Vessel #${vesselId}`, id: vesselId, href: `/vessels/${vesselId}` });
  const entityId = pickNumber(payload, "entity_id");
  if (entityId != null) out.push({ kind: "entity", label: `Entity #${entityId}`, id: entityId, href: `/entities/${entityId}` });

  const particulars = (payload.vesselParticulars as Record<string, unknown> | undefined) ?? undefined;
  const imo = pickString(payload, "imo", "imoNumber") ?? (particulars ? pickString(particulars, "imo", "imoNumber") : null);
  if (imo && imo !== "0") out.push({ kind: "other", label: `IMO ${imo}`, value: imo });
  const mmsi = pickString(payload, "mmsi", "mmsiNumber") ?? (particulars ? pickString(particulars, "mmsi", "mmsiNumber") : null);
  if (mmsi) out.push({ kind: "other", label: `MMSI ${mmsi}`, value: mmsi });
  const portCode = pickString(payload, "port_code", "portCode", "unLocode");
  if (portCode) out.push({ kind: "other", label: `Port ${portCode}`, value: portCode });

  return out;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  }
  return null;
}
function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * Mirror of the backend's `stable_payload_hash` canonicalization in
 * `app/services/ingestion.py`: JSON dumped with sorted keys, no
 * whitespace, ASCII-escaped. Any drift here makes verify say
 * "mismatch" even on untampered data.
 */
function canonicalJson(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return escapeStr(value);
  if (Array.isArray(value)) return `[${value.map(stringify).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${escapeStr(k)}:${stringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return "null";
}

function escapeStr(s: string): string {
  // Match Python's json.dumps(ensure_ascii=True) — escape non-ASCII via \uXXXX.
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else if (code < 0x7f) out += ch;
    else if (code <= 0xffff) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else {
      // surrogate pair
      const adjusted = code - 0x10000;
      const high = 0xd800 + (adjusted >> 10);
      const low = 0xdc00 + (adjusted & 0x3ff);
      out += `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
    }
  }
  return out + '"';
}
