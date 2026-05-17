import { Database, RefreshCw, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { getRiskFeed, runSanctionsLive } from "../../api";
import { closeInspectorRoute, navigateTo } from "../../hooks/useRoute";
import { useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Modal } from "../primitives/Modal";
import type { RiskFeedItem } from "../../types";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { Skeleton } from "../primitives/Skeleton";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

const SANCTIONS_FLAG_TYPES = ["sanctions_match", "sanctions"];

export function SanctionsInspector() {
  const [matches, setMatches] = useState<RiskFeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runJob = useJobRunner();

  function load() {
    setError(null);
    getRiskFeed(500, false, SANCTIONS_FLAG_TYPES)
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <InspectorShell
      breadcrumb="Sanctions"
      title={`Sanctions · ${matches?.length ?? 0}`}
      onClose={closeInspectorRoute}
      footer={
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="danger" leadingIcon={<RefreshCw size={12} />} onClick={() => setConfirmOpen(true)}>
            Refresh from API
          </Button>
          <Button size="sm" leadingIcon={<Database size={12} />} onClick={() => navigateTo("/operations")}>
            Upload CSV in Operations
          </Button>
        </div>
      }
    >
      {matches === null && !error && (
        <div className="col" style={{ gap: 6, marginTop: 12 }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      )}
      {error && (
        <EmptyState
          compact
          icon={<Scale size={18} />}
          title="Could not load sanctions"
          body={error}
          action={<Button size="sm" onClick={load}>Retry</Button>}
        />
      )}
      {matches !== null && matches.length === 0 && !error && (
        <EmptyState
          compact
          icon={<Scale size={18} />}
          title="No sanctions matches"
          body="Sanctions ingestion runs from the Operations console — upload a CSV, pull the latest CSV URL, or call the OpenSanctions API (uses 1 quota)."
          action={
            <Button size="sm" variant="primary" onClick={() => navigateTo("/operations")}>
              Open operations
            </Button>
          }
          secondary={
            <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
              Refresh from API
            </Button>
          }
        />
      )}
      <div className="col" style={{ gap: 6 }}>
        {matches?.map((m) => {
          const href = m.vessel_id != null
            ? `/vessels/${m.vessel_id}`
            : m.entity_id != null
            ? `/entities/${m.entity_id}`
            : "#";
          return (
            <a key={m.flag.id} href={href} className="card stripe-crit" style={{ padding: "10px 12px 10px 14px", display: "block", textDecoration: "none", color: "inherit" }}>
              <div className="row">
                <strong style={{ flex: 1 }}>{m.subject}</strong>
                <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(m.flag.created_at)}</span>
              </div>
              <div className="t-sm" style={{ marginTop: 4 }}>{m.flag.summary}</div>
              <EvidenceLink id={m.flag.evidence_id} variant="chip" />
            </a>
          );
        })}
      </div>
      <p className="t-faded" style={{ fontSize: 11, marginTop: 14 }}>
        Sanctions CSV ingestion lives in <a href="/operations">Operations console</a>. This view is read-only.
      </p>

      <Modal
        open={confirmOpen}
        title="Refresh sanctions from API?"
        onClose={() => setConfirmOpen(false)}
        secondaryAction={{ label: "Cancel", onClick: () => setConfirmOpen(false) }}
        primaryAction={{
          label: "Use 1 request",
          variant: "danger",
          onClick: () => {
            setConfirmOpen(false);
            runJob("sanctions", runSanctionsLive, { successTitle: "Sanctions refreshed", errorTitle: "Sanctions failed" }).then(load);
          },
        }}
      >
        This will consume <strong>1 OpenSanctions quota request</strong>.
      </Modal>
    </InspectorShell>
  );
}
