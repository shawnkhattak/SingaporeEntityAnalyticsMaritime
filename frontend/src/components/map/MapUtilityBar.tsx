import { Layers, Maximize, Minus, Plus, Ruler } from "lucide-react";
import type maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { useFilters } from "../../state/AppState";
import { Tooltip } from "../primitives/Tooltip";

type MapUtilityBarProps = {
  mapRef: RefObject<maplibregl.Map | null>;
};

export function MapUtilityBar({ mapRef }: MapUtilityBarProps) {
  const { filters } = useFilters();
  const layerCount = filters.enabledGeoLayers.size;

  function zoom(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 150 });
  }

  function fit() {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [103.85, 1.28], zoom: 4.2, duration: 400 });
  }

  return (
    <div className="map-utility">
      <Tooltip label="Zoom in">
        <button className="util-chip" onClick={() => zoom(1)} aria-label="Zoom in">
          <Plus />
        </button>
      </Tooltip>
      <Tooltip label="Zoom out">
        <button className="util-chip" onClick={() => zoom(-1)} aria-label="Zoom out">
          <Minus />
        </button>
      </Tooltip>
      <Tooltip label="Reset view">
        <button className="util-chip" onClick={fit} aria-label="Reset view">
          <Maximize />
        </button>
      </Tooltip>
      <Tooltip label="Layers">
        <button className="util-chip" aria-label="Layers">
          <Layers />
          <span className="mono" style={{ fontSize: 11 }}>{layerCount}</span>
        </button>
      </Tooltip>
      <Tooltip label="Measure (coming soon)">
        <button className="util-chip" aria-label="Measure" disabled>
          <Ruler />
        </button>
      </Tooltip>
    </div>
  );
}
