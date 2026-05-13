import { Crosshair, Layers, Maximize, Minus, Plus, Ruler, Satellite, Sun } from "lucide-react";
import type maplibregl from "maplibre-gl";
import { useState, type RefObject } from "react";
import { useApp, useFilters } from "../../state/AppState";
import { Tooltip } from "../primitives/Tooltip";

type MapUtilityBarProps = {
  mapRef: RefObject<maplibregl.Map | null>;
};

export function MapUtilityBar({ mapRef }: MapUtilityBarProps) {
  const { filters } = useFilters();
  const { state } = useApp();
  const layerCount = filters.enabledGeoLayers.size;
  const [basemapOpen, setBasemapOpen] = useState(false);

  function zoom(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 150 });
  }

  function reset() {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [103.85, 1.29], zoom: 9.2, duration: 480 });
  }

  return (
    <div className="map-utility">
      {/* Zoom / view cluster — vertical pill */}
      <div className="util-stack">
        <Tooltip label="Zoom in (+)">
          <button className="util-btn" onClick={() => zoom(1)} aria-label="Zoom in">
            <Plus />
          </button>
        </Tooltip>
        <Tooltip label="Zoom out (−)">
          <button className="util-btn" onClick={() => zoom(-1)} aria-label="Zoom out">
            <Minus />
          </button>
        </Tooltip>
        <Tooltip label="Reset to Singapore">
          <button className="util-btn" onClick={reset} aria-label="Reset view">
            <Maximize />
          </button>
        </Tooltip>
      </div>

      {/* Basemap + layers cluster */}
      <div className="util-stack">
        <Tooltip label={`Geo layers (${layerCount} on)`}>
          <button className="util-btn" aria-label={`Geo layers · ${layerCount} on`}>
            <Layers />
            <span className="util-badge mono">{layerCount}</span>
          </button>
        </Tooltip>
        <div style={{ position: "relative" }}>
          <Tooltip label="Basemap style">
            <button
              className="util-btn"
              aria-label="Choose basemap"
              aria-expanded={basemapOpen}
              onClick={() => setBasemapOpen((v) => !v)}
            >
              <Sun />
            </button>
          </Tooltip>
          {basemapOpen && (
            <div
              className="panel-solid anim-fade-in"
              style={{ position: "absolute", top: 0, right: "calc(100% + 8px)", padding: 6, width: 180, zIndex: 25 }}
            >
              <div className="t-caption" style={{ padding: "4px 8px" }}>Basemap</div>
              <BasemapRow icon={<Sun size={14} />} label="Minimal" active />
              <BasemapRow icon={<Sun size={14} />} label="Map" disabled hint="Coming soon" />
              <BasemapRow icon={<Satellite size={14} />} label="Satellite" disabled hint="Coming soon" />
            </div>
          )}
        </div>
      </div>

      {/* Tools cluster */}
      <div className="util-stack">
        <Tooltip label="Measure distance (coming soon)">
          <button className="util-btn" aria-label="Measure" disabled>
            <Ruler />
          </button>
        </Tooltip>
        <Tooltip label="Pin selected vessel">
          <button className="util-btn" aria-label="Pinned vessel" disabled={state.selected?.kind !== "vessel"}>
            <Crosshair />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function BasemapRow({ icon, label, active, disabled, hint }: { icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <div
      className="palette-row"
      style={{ opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer", padding: "6px 8px" }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: 12 }}>{label}</span>
      {hint && <span className="t-faded" style={{ fontSize: 10 }}>{hint}</span>}
      {active && <span className="pill solid ok" style={{ fontSize: 9, padding: "0 6px" }}>Active</span>}
    </div>
  );
}
