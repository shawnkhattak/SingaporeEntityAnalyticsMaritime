import { Building2, Copy, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { getEvidence, type EvidenceDetail } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { Button } from "../primitives/Button";
import { ErrorState } from "../primitives/ErrorState";
import { JsonViewer } from "../primitives/JsonViewer";
import { Skeleton } from "../primitives/Skeleton";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

export function EvidenceInspector({ id }: { id: number }) {
  const [data, setData] = useState<EvidenceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    getEvidence(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <InspectorShell breadcrumb="Evidence" title={`Evidence #${id}`} onClose={() => window.history.back()}>
        <ErrorState body={error} onRetry={load} />
      </InspectorShell>
    );
  }
  if (!data) {
    return (
      <InspectorShell breadcrumb="Evidence" title={`Evidence #${id}`} onClose={() => window.history.back()}>
        <Skeleton height={80} />
      </InspectorShell>
    );
  }

  const payload = data.raw_payload ?? {};
  const vesselId = typeof payload.vessel_id === "number" ? payload.vessel_id : null;
  const entityId = typeof payload.entity_id === "number" ? payload.entity_id : null;

  return (
    <InspectorShell
      breadcrumb="Evidence"
      title={`Evidence #${data.id}`}
      onClose={() => window.history.back()}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Meta label="Source" value={data.source} />
        <Meta label="Observation type" value={data.observation_type} />
        <Meta label="Source record ID" value={data.source_record_id ?? "—"} mono />
        <Meta label="Observed at" value={formatDate(data.observed_at)} />
        <Meta label="Fetched at" value={formatDate(data.fetched_at)} />
        <Meta label="Payload hash" value={data.payload_hash} mono copy />
      </div>
      <JsonViewer value={payload} />
      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        {vesselId != null && (
          <Button leadingIcon={<Ship size={14} />} onClick={() => navigateTo(`/vessels/${vesselId}`)}>
            Open vessel #{vesselId}
          </Button>
        )}
        {entityId != null && (
          <Button leadingIcon={<Building2 size={14} />} onClick={() => navigateTo(`/entities/${entityId}`)}>
            Open entity #{entityId}
          </Button>
        )}
      </div>
    </InspectorShell>
  );
}

function Meta({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="card" style={{ padding: "8px 10px" }}>
      <div className="t-caption" style={{ fontSize: 10 }}>{label}</div>
      <div className={`row ${mono ? "mono" : ""}`} style={{ fontSize: 12 }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        {copy && (
          <button className="btn ghost icon sm" onClick={() => navigator.clipboard?.writeText(value)} aria-label="Copy">
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

