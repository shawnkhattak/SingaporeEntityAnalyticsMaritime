import { ExternalLink, Network, X } from "lucide-react";
import { navigateTo } from "../../hooks/useRoute";
import type { RiskFlag, VesselMapFeature } from "../../types";
import { Button } from "../primitives/Button";
import { RiskPill } from "../primitives/Pill";
import { formatDate } from "../../format";

type VesselPopoverProps = {
  x: number;
  y: number;
  vessel: VesselMapFeature;
  severity: string;
  flags: RiskFlag[];
  onClose: () => void;
};

export function VesselPopover({ x, y, vessel, severity, flags, onClose }: VesselPopoverProps) {
  const openCount = flags.filter((f) => f.status !== "resolved").length;
  return (
    <div className="vessel-popover glass" style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 14px))" }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <strong style={{ fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vessel.name}</strong>
        <button className="btn ghost icon sm" onClick={onClose} aria-label="Close">
          <X size={12} />
        </button>
      </div>
      <div className="row-id mono t-muted" style={{ fontSize: 11 }}>
        {vessel.imo && <span>IMO {vessel.imo}</span>}
        {vessel.mmsi && <span>MMSI {vessel.mmsi}</span>}
        {vessel.call_sign && <span>{vessel.call_sign}</span>}
      </div>
      <div style={{ marginTop: 8, fontSize: 12 }}>
        <div className="mono">{vessel.latitude.toFixed(3)}, {vessel.longitude.toFixed(3)}</div>
        <div className="t-faded" style={{ fontSize: 11 }}>
          {[vessel.speed_knots != null ? `${vessel.speed_knots.toFixed(1)} kn` : null, vessel.course_degrees != null ? `${vessel.course_degrees.toFixed(0)}°` : null, vessel.navigational_status]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="t-faded" style={{ fontSize: 11 }}>{formatDate(vessel.position_timestamp)}</div>
      </div>
      <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 4 }}>
        {severity !== "none" && <RiskPill severity={severity as RiskFlag["severity"] as never} />}
        {openCount > 0 && <span className="pill info">{openCount} open</span>}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        <Button size="sm" variant="primary" onClick={() => navigateTo(`/vessels/${vessel.vessel_id}`)}>
          Open vessel
        </Button>
        <Button size="sm" leadingIcon={<Network size={12} />} onClick={() => navigateTo(`/graph?subject=vessel&id=${vessel.vessel_id}`)}>
          Graph
        </Button>
        {vessel.evidence_id != null && (
          <Button size="sm" leadingIcon={<ExternalLink size={12} />} onClick={() => navigateTo(`/evidence/${vessel.evidence_id}`)}>
            Evidence
          </Button>
        )}
      </div>
    </div>
  );
}
