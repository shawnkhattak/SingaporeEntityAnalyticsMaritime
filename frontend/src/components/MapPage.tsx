import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { getGeoLayer, getGeoLayers, loadMapVessels } from "../api";
import type { VesselMapFeature } from "../types";
import { VesselMapPreview } from "./VesselMapPreview";

export function MapPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [vessels, setVessels] = useState<VesselMapFeature[]>([]);
  const [layers, setLayers] = useState<{ name: string; endpoint: string }[]>([]);
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(new Set(["ports_p", "coastline_l"]));
  const [error, setError] = useState<string | null>(null);
  const [missingLayers, setMissingLayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([loadMapVessels(5000), getGeoLayers()])
      .then(([nextVessels, nextLayers]) => {
        setVessels(nextVessels);
        setLayers(nextLayers);
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "Unable to load map data."));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layers.forEach((layer) => {
      if (!enabledLayers.has(layer.name)) {
        if (map.getLayer(layer.name)) map.removeLayer(layer.name);
        if (map.getSource(layer.name)) map.removeSource(layer.name);
        return;
      }
      getGeoLayer(layer.name).then((data) => {
        setMissingLayers((current) => {
          const next = new Set(current);
          next.delete(layer.name);
          return next;
        });
        if (map.getLayer(layer.name)) map.removeLayer(layer.name);
        if (map.getSource(layer.name)) map.removeSource(layer.name);
        map.addSource(layer.name, { type: "geojson", data } as unknown as maplibregl.GeoJSONSourceSpecification);
        const type = layer.name.endsWith("_l") ? "line" : layer.name.endsWith("_a") ? "fill" : "circle";
        if (type === "line") map.addLayer({ id: layer.name, type, source: layer.name, paint: { "line-color": "#3a6b75", "line-width": 2 } });
        if (type === "fill") map.addLayer({ id: layer.name, type, source: layer.name, paint: { "fill-color": "#83c5be", "fill-opacity": 0.28 } });
        if (type === "circle") map.addLayer({ id: layer.name, type, source: layer.name, paint: { "circle-radius": 4, "circle-color": "#d66a2d" } });
      }).catch(() => {
        setMissingLayers((current) => new Set(current).add(layer.name));
      });
    });
  }, [layers, enabledLayers]);

  function toggleLayer(name: string) {
    setEnabledLayers((current) => {
      const next = new Set(current);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <>
      <section className="hero compact">
        <p className="eyebrow">Map</p>
        <h1>Maritime operating picture</h1>
        <p className="lede">Live vessel positions with evidence-backed OCEANS-X geospatial overlays.</p>
      </section>
      {error ? <p className="status-message status-message--error">{error}</p> : null}
      <section className="maplibre-layout">
        <VesselMapPreview vessels={vessels} className="maplibre-canvas" onMapReady={(map) => { mapRef.current = map; }} />
        <aside className="flow-panel">
          <h3>Layers</h3>
          {layers.map((layer) => (
            <label className="check-row" key={layer.name}>
              <input type="checkbox" checked={enabledLayers.has(layer.name)} onChange={() => toggleLayer(layer.name)} />
              {layer.name}
              {missingLayers.has(layer.name) ? <span className="muted-inline">no live data</span> : null}
            </label>
          ))}
          <p>{vessels.length} vessel positions loaded.</p>
        </aside>
      </section>
    </>
  );
}
