import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { getGeoLayer, loadMapVessels } from "../../api";
import { onMapCenter } from "../../hooks/useMapCenter";
import { usePoll } from "../../hooks/usePoll";
import { useApp, useFilters, useSelection } from "../../state/AppState";
import type { RiskFlag, VesselMapFeature } from "../../types";
import { navigateTo } from "../../hooks/useRoute";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Radar, Ship } from "lucide-react";
import { runPositionsSnapshot } from "../../api";
import { useJobRunner } from "../../state/AppState";
import { highestSeverity, matchesFilters } from "./filters";
import { MapUtilityBar } from "./MapUtilityBar";
import { MapStatusStrip } from "./MapStatusStrip";
import { VesselPopover } from "./VesselPopover";

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#E5EFF6" },
    },
  ],
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#C62828",
  high: "#E04A1F",
  medium: "#E59413",
  low: "#E5C100",
  none: "#3FB6C9",
};

const geoCache = new Map<string, GeoJSON.FeatureCollection>();

type PopoverState = { x: number; y: number; vessel: VesselMapFeature; severity: string } | null;

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [popover, setPopover] = useState<PopoverState>(null);
  const { state, dispatch } = useApp();
  const { filters } = useFilters();
  const { select, clear } = useSelection();
  const runJob = useJobRunner();

  // Persist a snapshot of risk + filters for click handlers.
  const filtersRef = useRef(filters);
  const riskRef = useRef(state.riskByVessel);
  filtersRef.current = filters;
  riskRef.current = state.riskByVessel;

  // Initial map setup — once per SPA lifetime.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [103.85, 1.28],
      zoom: 4.2,
      attributionControl: { compact: true },
      maxZoom: 16,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      // Vessels source + layers
      map.addSource("vessels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 6,
        clusterRadius: 40,
        promoteId: "vessel_id",
      });

      map.addLayer({
        id: "vessels-halo",
        type: "circle",
        source: "vessels",
        filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "severity"], "none"]],
        paint: {
          "circle-radius": 16,
          "circle-color": [
            "match",
            ["get", "severity"],
            "critical",
            SEVERITY_COLOR.critical,
            "high",
            SEVERITY_COLOR.high,
            "medium",
            SEVERITY_COLOR.medium,
            "low",
            SEVERITY_COLOR.low,
            SEVERITY_COLOR.none,
          ],
          "circle-opacity": 0.18,
          "circle-blur": 0.4,
        },
      });

      map.addLayer({
        id: "vessels-point",
        type: "circle",
        source: "vessels",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.5, 11, 7],
          "circle-color": [
            "match",
            ["get", "severity"],
            "critical",
            SEVERITY_COLOR.critical,
            "high",
            SEVERITY_COLOR.high,
            "medium",
            SEVERITY_COLOR.medium,
            "low",
            SEVERITY_COLOR.low,
            SEVERITY_COLOR.none,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "vessels-selected",
        type: "circle",
        source: "vessels",
        filter: ["==", ["get", "vessel_id"], -1],
        paint: {
          "circle-radius": 11,
          "circle-color": "#3A7FB8",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "vessels-cluster",
        type: "circle",
        source: "vessels",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#3A7FB8",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 22],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "vessels-cluster-count",
        type: "symbol",
        source: "vessels",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.on("click", "vessels-point", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const id = Number(props.vessel_id);
        const severity = String(props.severity ?? "none");
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        const point = map.project([coords[0], coords[1]]);
        const v = findVessel(id);
        if (!v) return;
        setPopover({ x: point.x, y: point.y, vessel: v, severity });
        select({ kind: "vessel", id });
        navigateTo(`/vessels/${id}`);
      });

      map.on("click", "vessels-cluster", (e) => {
        const cluster = e.features?.[0];
        if (!cluster) return;
        const src = map.getSource("vessels") as unknown as maplibregl.GeoJSONSource;
        const id = (cluster.properties as Record<string, unknown>).cluster_id as number;
        src.getClusterExpansionZoom(id).then((zoom) => {
          const coords = (cluster.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [coords[0], coords[1]], zoom });
        }).catch(() => undefined);
      });

      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ["vessels-point", "vessels-cluster"] });
        if (hits.length === 0) {
          setPopover(null);
          clear();
        }
      });

      map.on("mouseenter", "vessels-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "vessels-point", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "vessels-cluster", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "vessels-cluster", () => {
        map.getCanvas().style.cursor = "";
      });

      // Move popover with the map.
      const refreshPopover = () => {
        setPopover((p) => {
          if (!p) return null;
          const pt = map.project([p.vessel.longitude, p.vessel.latitude]);
          return { ...p, x: pt.x, y: pt.y };
        });
      };
      map.on("move", refreshPopover);
      map.on("zoom", refreshPopover);

      setReady(true);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [select, clear]);

  function findVessel(id: number): VesselMapFeature | null {
    return state.vessels.find((v) => v.vessel_id === id) ?? null;
  }

  // Refresh vessels on the map whenever data or filters change.
  const filteredVessels = useMemo(
    () => state.vessels.filter((v) => matchesFilters(v, state.riskByVessel, filters)),
    [state.vessels, state.riskByVessel, filters],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filteredVessels.map((v) => featureFor(v, state.riskByVessel[v.vessel_id])),
    };
    const src = map.getSource("vessels") as unknown as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(fc);
  }, [filteredVessels, state.riskByVessel, ready]);

  // Selected vessel highlight.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = state.selected?.kind === "vessel" ? state.selected.id : -1;
    if (map.getLayer("vessels-selected")) {
      map.setFilter("vessels-selected", ["==", ["get", "vessel_id"], id]);
    }
    if (id === -1) setPopover(null);
  }, [state.selected, ready]);

  // Geo overlays driven by filters.enabledGeoLayers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const enabled = Array.from(filters.enabledGeoLayers);
    const present = new Set<string>();
    enabled.forEach((name) => present.add(`geo-${name}`));

    // Remove layers no longer enabled.
    map.getStyle().layers?.forEach((layer) => {
      if (layer.id.startsWith("geo-") && !present.has(layer.id)) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        const srcId = layer.id;
        if (map.getSource(srcId)) map.removeSource(srcId);
      }
    });

    // Add newly enabled.
    enabled.forEach(async (name) => {
      const id = `geo-${name}`;
      if (map.getSource(id)) return;
      let data = geoCache.get(name);
      if (!data) {
        try {
          const fetched = (await getGeoLayer(name)) as unknown as GeoJSON.FeatureCollection;
          if (!fetched || !fetched.features) return;
          geoCache.set(name, fetched);
          data = fetched;
        } catch {
          return;
        }
      }
      if (map.getSource(id)) return;
      map.addSource(id, { type: "geojson", data });
      const suffix = name.split("_").pop();
      if (suffix === "l") {
        map.addLayer({ id, type: "line", source: id, paint: { "line-color": "#274C6E", "line-width": 1.2 } }, "vessels-halo");
      } else if (suffix === "a") {
        map.addLayer({ id, type: "fill", source: id, paint: { "fill-color": "#3FB6C9", "fill-opacity": 0.18, "fill-outline-color": "#3A7FB8" } }, "vessels-halo");
      } else {
        map.addLayer({
          id,
          type: "circle",
          source: id,
          paint: { "circle-radius": 4, "circle-color": "#E59413", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 },
        }, "vessels-halo");
      }
    });
  }, [filters.enabledGeoLayers, ready]);

  // Vessel polling (only when route shows the map AND timeWindow is live).
  const pollingPaused = filters.timeWindow !== "live";
  usePoll(
    async () => {
      try {
        const vessels = await loadMapVessels(5000);
        dispatch({ type: "SET_VESSELS", vessels });
      } catch {
        /* ignore */
      }
    },
    30_000,
    { paused: pollingPaused },
  );

  useEffect(() => {
    let cancelled = false;
    loadMapVessels(5000)
      .then((vessels) => {
        if (!cancelled) dispatch({ type: "SET_VESSELS", vessels });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // External pan requests (from inspectors).
  useEffect(() => {
    return onMapCenter((ev) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [ev.lng, ev.lat], zoom: ev.zoom ?? Math.max(map.getZoom(), 6), duration: 400 });
    });
  }, []);

  return (
    <>
      <div className="map-canvas" ref={containerRef} />
      <MapUtilityBar mapRef={mapRef} />
      <MapStatusStrip vesselCount={filteredVessels.length} runJob={runJob} />
      {state.vessels.length === 0 && ready && (
        <div
          style={{
            position: "fixed",
            inset: "auto auto 80px 50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <div className="glass" style={{ padding: 18, width: 360 }}>
            <EmptyState
              icon={<Radar size={22} />}
              title="No vessels loaded yet"
              body="Run a positions snapshot to fetch the latest AIS data."
              action={
                <Button
                  variant="primary"
                  leadingIcon={<Ship size={14} />}
                  onClick={() =>
                    runJob("positions-snapshot", runPositionsSnapshot, {
                      successTitle: "Positions snapshot complete",
                      errorTitle: "Snapshot failed",
                    }).then((job) => {
                      if (job) {
                        loadMapVessels(5000).then((v) => dispatch({ type: "SET_VESSELS", vessels: v })).catch(() => undefined);
                      }
                    })
                  }
                >
                  Run snapshot
                </Button>
              }
            />
          </div>
        </div>
      )}
      {popover && <VesselPopover x={popover.x} y={popover.y} vessel={popover.vessel} severity={popover.severity} flags={state.riskByVessel[popover.vessel.vessel_id] ?? []} onClose={() => setPopover(null)} />}
      {!state.backendOnline && (
        <div
          className="pill fail glass"
          style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 25, padding: "6px 14px" }}
        >
          <span className="dot" />
          Backend unreachable · reconnecting…
        </div>
      )}
    </>
  );
}

function featureFor(v: VesselMapFeature, flags: RiskFlag[] | undefined): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
    properties: {
      vessel_id: v.vessel_id,
      name: v.name,
      imo: v.imo,
      mmsi: v.mmsi,
      severity: highestSeverity(flags ?? []),
    },
  };
}
