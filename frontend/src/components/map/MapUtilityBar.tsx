import { Crosshair, Layers, Maximize, Minus, Plus, Ruler, Satellite, Sun } from "lucide-react";
import type maplibregl from "maplibre-gl";
import { useEffect, useState, type RefObject } from "react";
import { getGeoLayers } from "../../api";
import { useApp, useFilters } from "../../state/AppState";
import { geoLayerLabel } from "../../labels";
import { Tooltip } from "../primitives/Tooltip";

type MapUtilityBarProps = {
  mapRef: RefObject<maplibregl.Map | null>;
};

export function MapUtilityBar({ mapRef }: MapUtilityBarProps) {
  const { filters, setFilters } = useFilters();
  const { state } = useApp();
  const layerCount = filters.enabledGeoLayers.size;
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<{ name: string; endpoint: string }[]>([]);

  useEffect(() => {
    if (!layersOpen || layers.length > 0) return;
    getGeoLayers().then(setLayers).catch(() => undefined);
  }, [layersOpen, layers.length]);

  function toggleLayer(name: string) {
    const next = new Set(filters.enabledGeoLayers);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setFilters({ ...filters, enabledGeoLayers: next });
  }

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
        <div style={{ position: "relative" }}>
          <Tooltip label={`Geo layers (${layerCount} on)`}>
            <button
              className="util-btn"
              aria-label={`Geo layers · ${layerCount} on`}
              aria-expanded={layersOpen}
              onClick={() => setLayersOpen((v) => !v)}
            >
              <Layers />
              <span className="util-badge mono">{layerCount}</span>
            </button>
          </Tooltip>
          {layersOpen && (
            <div
              className="panel-solid anim-fade-in"
              style={{ position: "absolute", top: 0, right: "calc(100% + 8px)", padding: 8, width: 220, zIndex: 25 }}
            >
              <div className="t-caption" style={{ padding: "0 4px 6px" }}>Geo layers</div>
              {layers.length === 0 && <div className="t-faded" style={{ fontSize: 11, padding: 4 }}>Loading…</div>}
              {layers.map((l) => (
                <label key={l.name} className="row" style={{ gap: 6, padding: "4px 4px", fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filters.enabledGeoLayers.has(l.name)}
                    onChange={() => toggleLayer(l.name)}
                  />
                  <span style={{ flex: 1 }} title={l.name}>{geoLayerLabel(l.name)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
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
        <Tooltip label="Distance measure · coming in V1.1">
          <button className="util-btn" aria-label="Distance measure (coming soon)" disabled>
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
      role="button"
      aria-disabled={disabled}
      aria-current={active ? "true" : undefined}
      tabIndex={disabled ? -1 : 0}
      style={{ opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer", padding: "6px 8px" }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: 12 }}>{label}</span>
      {hint && <span className="pill" style={{ fontSize: 9, padding: "0 6px" }}>{hint}</span>}
      {active && <span className="pill solid ok" style={{ fontSize: 9, padding: "0 6px" }}>Active</span>}
    </div>
  );
}
