import { ChevronRight, ExternalLink, X } from "lucide-react";
import { navigateTo } from "../../hooks/useRoute";
import type { RiskFlag, VesselMapFeature } from "../../types";
import { RiskPill } from "../primitives/Pill";
import { countryName, flagEmoji, riskLabel, vesselTypeLabel } from "../../labels";
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
  const top = flags.find((f) => f.status !== "resolved");
  const flagName = countryName(vessel.flag_country_code);
  const flagGlyph = flagEmoji(vessel.flag_country_code);
  const type = vesselTypeLabel(vessel.vessel_type_code);

  return (
    <div
      className="vessel-popover glass"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, calc(-100% - 14px))",
        width: 240,
        padding: 12,
      }}
    >
      <div className="row" style={{ marginBottom: 4, gap: 6 }}>
        <strong style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {vessel.name}
        </strong>
        <button className="btn ghost icon sm" onClick={onClose} aria-label="Close">
          <X size={12} />
        </button>
      </div>
      <div className="mono t-muted" style={{ fontSize: 11 }}>
        {[vessel.imo && `IMO ${vessel.imo}`, vessel.mmsi && `MMSI ${vessel.mmsi}`].filter(Boolean).join(" · ") || "—"}
      </div>
      <div className="t-faded" style={{ fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        {flagGlyph && (
          <span title={flagName} aria-label={flagName} style={{ fontSize: 14, lineHeight: 1, cursor: "help" }}>
            {flagGlyph}
          </span>
        )}
        {type !== "Unknown" && <span>{type}</span>}
      </div>
      {(() => {
        const bits: string[] = [];
        if (vessel.year_built != null) bits.push(`Built ${vessel.year_built}`);
        if (vessel.deadweight != null) bits.push(`${vessel.deadweight.toLocaleString()} DWT`);
        else if (vessel.gross_tonnage != null) bits.push(`${vessel.gross_tonnage.toLocaleString()} GT`);
        if (vessel.length_meters != null) bits.push(`${vessel.length_meters} m`);
        return bits.length > 0 ? (
          <div className="t-faded" style={{ fontSize: 11, marginTop: 2 }}>{bits.join(" · ")}</div>
        ) : null;
      })()}
      <div className="t-faded mono" style={{ fontSize: 11, marginTop: 4 }}>
        {vessel.latitude.toFixed(3)}, {vessel.longitude.toFixed(3)}
        {vessel.speed_knots != null ? ` · ${vessel.speed_knots.toFixed(1)} kn` : ""}
      </div>
      <div className="t-faded" style={{ fontSize: 10, marginTop: 2 }}>{formatDate(vessel.position_timestamp)}</div>

      {top && (
        <div className="row" style={{ marginTop: 6, gap: 4, flexWrap: "wrap" }}>
          <RiskPill severity={severity as never} label={riskLabel(top.flag_type).title} />
        </div>
      )}

      {/* Action row: icon-only, no big "Open vessel" button. The click
          already navigated to the inspector; these are quick jumps. */}
      <div className="row" style={{ marginTop: 8, gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {vessel.evidence_id != null && (
          <button
            className="btn ghost sm"
            aria-label="Open evidence"
            title="Open evidence"
            onClick={() => navigateTo(`/evidence/${vessel.evidence_id}`)}
          >
            <ExternalLink size={12} />
            Evidence
          </button>
        )}
        <button
          className="btn ghost sm"
          aria-label="Open vessel detail"
          title="Open vessel"
          onClick={() => navigateTo(`/vessels/${vessel.vessel_id}`)}
        >
          <ChevronRight size={12} />
          Details
        </button>
      </div>
    </div>
  );
}
