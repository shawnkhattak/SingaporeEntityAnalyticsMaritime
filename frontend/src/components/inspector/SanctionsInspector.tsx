import { Database, RefreshCw, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { runSanctionsLive } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { useApp, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Modal } from "../primitives/Modal";
import type { RiskFlag } from "../../types";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

export function SanctionsInspector() {
  const { state } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runJob = useJobRunner();

  const matches: { flag: RiskFlag; subject: string; href: string }[] = useMemo(() => {
    const out: { flag: RiskFlag; subject: string; href: string }[] = [];
    for (const [idStr, list] of Object.entries(state.riskByVessel)) {
      const id = Number(idStr);
      const v = state.vessels.find((x) => x.vessel_id === id);
      list
        .filter((f) => f.flag_type === "sanctions")
        .forEach((flag) => out.push({ flag, subject: v?.name ?? `Vessel #${id}`, href: `/vessels/${id}` }));
    }
    for (const [idStr, list] of Object.entries(state.riskByEntity)) {
      const id = Number(idStr);
      list
        .filter((f) => f.flag_type === "sanctions")
        .forEach((flag) => out.push({ flag, subject: `Entity #${id}`, href: `/entities/${id}` }));
    }
    return out;
  }, [state.riskByVessel, state.riskByEntity, state.vessels]);

  return (
    <InspectorShell
      breadcrumb="Sanctions"
      title={`Sanctions · ${matches.length}`}
      onClose={() => window.history.back()}
      footer={
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="danger" leadingIcon={<RefreshCw size={12} />} onClick={() => setConfirmOpen(true)}>
            Refresh from API
          </Button>
          <Button size="sm" leadingIcon={<Database size={12} />} onClick={() => navigateTo("/operations")}>
            Upload CSV in Ops
          </Button>
        </div>
      }
    >
      {matches.length === 0 && (
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
        {matches.map((m) => (
          <a key={m.flag.id} href={m.href} className="card stripe-crit" style={{ padding: "10px 12px 10px 14px", display: "block", textDecoration: "none", color: "inherit" }}>
            <div className="row">
              <strong style={{ flex: 1 }}>{m.subject}</strong>
              <span className="t-faded" style={{ fontSize: 11 }}>{formatDate(m.flag.created_at)}</span>
            </div>
            <div className="t-sm" style={{ marginTop: 4 }}>{m.flag.summary}</div>
            <EvidenceLink id={m.flag.evidence_id} variant="chip" />
          </a>
        ))}
      </div>
      <p className="t-faded" style={{ fontSize: 11, marginTop: 14 }}>
        Sanctions CSV ingestion lives in <a href="/operations">Operations Console</a>. This view is read-only.
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
            runJob("sanctions", runSanctionsLive, { successTitle: "Sanctions refreshed", errorTitle: "Sanctions failed" });
          },
        }}
      >
        This will consume <strong>1 OpenSanctions quota request</strong>.
      </Modal>
    </InspectorShell>
  );
}
