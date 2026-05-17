import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  runGeoLive,
  runMovements,
  runNewsLive,
  runParticulars,
  runPositionsSnapshot,
  runRefreshLive,
  runRiskRecompute,
  runSanctionsLive,
} from "../../api";
import { useApp, useJobRunner, useRunningJobs } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { Modal } from "../primitives/Modal";

export function SourceRefreshControls() {
  const [open, setOpen] = useState(false);
  const [confirmSanctions, setConfirmSanctions] = useState(false);
  const runJob = useJobRunner();
  const { isRunning } = useRunningJobs();
  const { state } = useApp();

  const vesselId = state.selected?.kind === "vessel" ? state.selected.id : null;

  function refreshAll() {
    return runJob("refresh-live", runRefreshLive, {
      successTitle: "Live sources refreshed",
      errorTitle: "Refresh failed",
    });
  }

  return (
    <div className="cmd-section">
      <button type="button" className="cmd-section-head btn ghost full" onClick={() => setOpen((v) => !v)}>
        <RefreshCw size={14} />
        <span style={{ flex: 1, textAlign: "left", fontWeight: 600, color: "var(--navy-700)" }}>Source refresh</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="col" style={{ padding: "0 4px 4px", gap: 6 }}>
          <RefreshButton
            label="Positions snapshot"
            slug="positions-snapshot"
            run={() =>
              runJob("positions-snapshot", runPositionsSnapshot, {
                successTitle: "Positions snapshot complete",
                errorTitle: "Positions snapshot failed",
              })
            }
            running={isRunning("positions-snapshot")}
          />
          <RefreshButton
            label="Geo layers"
            slug="geo-layers"
            run={() =>
              runJob("geo-layers", runGeoLive, {
                successTitle: "Geo layers refreshed",
                errorTitle: "Geo layers failed",
              })
            }
            running={isRunning("geo-layers")}
          />
          <RefreshButton
            label="News (RSS)"
            slug="news"
            run={() => runJob("news", runNewsLive, { successTitle: "News refreshed", errorTitle: "News refresh failed" })}
            running={isRunning("news")}
          />
          <RefreshButton
            label="Risk recompute"
            slug="risk-recompute"
            run={() =>
              runJob("risk-recompute", () => runRiskRecompute(), {
                successTitle: "Risk recompute complete",
                errorTitle: "Risk recompute failed",
              })
            }
            running={isRunning("risk-recompute")}
          />
          <RefreshButton
            label="Sanctions API"
            slug="sanctions"
            danger
            run={() => setConfirmSanctions(true)}
            running={isRunning("sanctions")}
          />
          <Button
            variant="primary"
            full
            disabled={Object.keys(state.runningJobs).length > 0}
            onClick={refreshAll}
            leadingIcon={<RefreshCw size={13} />}
          >
            Refresh all live
          </Button>

          <div className="t-caption" style={{ paddingTop: 4 }}>Per-vessel</div>
          <RefreshButton
            label="Particulars (selected)"
            slug={`particulars-${vesselId ?? "none"}`}
            disabled={vesselId === null}
            run={() => {
              if (vesselId === null) return Promise.resolve(null);
              return runJob(`particulars-${vesselId}`, () => runParticulars(vesselId), {
                successTitle: "Particulars refreshed",
                errorTitle: "Particulars failed",
              });
            }}
            running={vesselId !== null && isRunning(`particulars-${vesselId}`)}
          />
          <RefreshButton
            label="Movements (selected)"
            slug={`movements-${vesselId ?? "none"}`}
            disabled={vesselId === null}
            run={() => {
              if (vesselId === null) return Promise.resolve(null);
              return runJob(`movements-${vesselId}`, () => runMovements(vesselId), {
                successTitle: "Movements refreshed",
                errorTitle: "Movements failed",
              });
            }}
            running={vesselId !== null && isRunning(`movements-${vesselId}`)}
          />
        </div>
      )}

      <Modal
        open={confirmSanctions}
        title="Refresh sanctions from API?"
        onClose={() => setConfirmSanctions(false)}
        secondaryAction={{ label: "Cancel", onClick: () => setConfirmSanctions(false) }}
        primaryAction={{
          label: "Use 1 request",
          variant: "danger",
          onClick: () => {
            setConfirmSanctions(false);
            runJob("sanctions", runSanctionsLive, {
              successTitle: "Sanctions refreshed",
              errorTitle: "Sanctions refresh failed",
            });
          },
        }}
      >
        This will consume <strong>1 OpenSanctions quota request</strong>. Quota usage is shared across the team.
      </Modal>
    </div>
  );
}

function RefreshButton({
  label,
  run,
  running,
  disabled,
  danger,
}: {
  label: string;
  slug: string;
  run: () => unknown;
  running: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn ${danger ? "danger" : ""} ${running ? "shimmer" : ""}`.trim()}
      style={{ justifyContent: "space-between", fontSize: 12 }}
      onClick={() => run()}
      disabled={disabled || running}
    >
      <span>{label}</span>
      <RefreshCw size={12} />
    </button>
  );
}
