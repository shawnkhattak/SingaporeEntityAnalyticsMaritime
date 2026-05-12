import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { VesselMapFeature } from "../types";

type VesselMapPreviewProps = {
  vessels: VesselMapFeature[];
  className?: string;
  onMapReady?: (map: maplibregl.Map) => void;
};

export function VesselMapPreview({ vessels, className = "", onMapReady }: VesselMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [103.85, 1.28],
      zoom: 8.3,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "background", type: "background", paint: { "background-color": "#eaf1f1" } }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    onMapReady?.(map);
    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      const data = {
        type: "FeatureCollection",
        features: vessels.map((vessel) => ({
          type: "Feature",
          properties: {
            name: vessel.name,
            vessel_id: vessel.vessel_id,
            imo: vessel.imo,
            timestamp: vessel.position_timestamp,
          },
          geometry: { type: "Point", coordinates: [vessel.longitude, vessel.latitude] },
        })),
      };
      if (!map.getSource("vessels")) {
        map.addSource("vessels", { type: "geojson", data } as maplibregl.GeoJSONSourceSpecification);
        map.addLayer({
          id: "vessels",
          type: "circle",
          source: "vessels",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 11, 8],
            "circle-color": "#006d77",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        map.on("click", "vessels", (event) => {
          const feature = event.features?.[0];
          const geometry = feature?.geometry as { coordinates?: number[] } | undefined;
          const coordinates = geometry?.coordinates;
          if (!feature?.properties || !coordinates) return;
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup()
            .setLngLat([coordinates[0], coordinates[1]])
            .setHTML(`<strong>${feature.properties.name}</strong><br/>IMO ${feature.properties.imo ?? "unknown"}<br/><a href="/vessels/${feature.properties.vessel_id}">Open vessel</a>`)
            .addTo(map);
        });
        map.on("mouseenter", "vessels", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "vessels", () => {
          map.getCanvas().style.cursor = "";
        });
      } else {
        (map.getSource("vessels") as maplibregl.GeoJSONSource).setData(data as never);
      }
      fitVessels(map, vessels);
      map.resize();
    };
    map.loaded() ? sync() : map.once("load", sync);
  }, [vessels]);

  return <div className={`map-preview ${className}`} ref={containerRef} />;
}

function fitVessels(map: maplibregl.Map, vessels: VesselMapFeature[]) {
  if (vessels.length === 0) return;
  const bounds = new maplibregl.LngLatBounds();
  vessels.forEach((vessel) => bounds.extend([vessel.longitude, vessel.latitude]));
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 48, maxZoom: 10.5, duration: 0 });
  }
}
