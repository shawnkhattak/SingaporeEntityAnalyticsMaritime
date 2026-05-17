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
import { MapStatusStrip } from "./MapStatusStrip";
import { VesselPopover } from "./VesselPopover";

// Minimal maritime basemap: CartoDB Positron *no-labels* tiles.
// Shows land/coastline shape only — no place names, no roads, no
// buildings. Ocean becomes the dominant surface so vessels read as
// the primary content. Free, no API key required.
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    // Ocean wash sits behind everything; CartoDB tiles are transparent
    // over the sea so this color shows through.
    { id: "ocean", type: "background", paint: { "background-color": "#E5EFF6" } },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: {
        // Pull a touch of saturation so the beige land sits quietly
        // against the ocean tone.
        "raster-saturation": -0.2,
        "raster-contrast": -0.04,
      },
    },
  ],
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#C62828",
  high: "#E04A1F",
  medium: "#E59413",
  low: "#D8C76B",
  none: "#3FB6C9",
};

// Singapore Island defaults — the workspace centers there because that's
// the operating picture analysts open the tool against.
const DEFAULT_CENTER: [number, number] = [103.85, 1.29];
const DEFAULT_ZOOM = 9.2;

const geoCache = new Map<string, GeoJSON.FeatureCollection>();

/**
 * Build a single colored AIS-style triangle icon. We render one image
 * per severity (no SDF + halo combo, which was painting a square aura
 * behind every vessel). Each rasterized icon has a 1.5 px white stroke
 * baked in, so the silhouette stays crisp against any basemap.
 *
 * Rotation 0 = north. `icon-rotate` aligns the bow with the vessel's
 * heading.
 */
function buildVesselArrow(fill: string): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: size, height: size, data: new Uint8ClampedArray(size * size * 4) };
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.translate(size / 2, size / 2);

  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(2, -22, 14, 18);
  ctx.lineTo(10, 22);
  ctx.quadraticCurveTo(0, 18, -10, 22);
  ctx.lineTo(-14, 18);
  ctx.quadraticCurveTo(-2, -22, 0, -26);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(ctx.getImageData(0, 0, size, size).data),
  };
}

const VESSEL_ICON_IDS: Record<string, string> = {
  critical: "vessel-critical",
  high: "vessel-high",
  medium: "vessel-medium",
  low: "vessel-low",
  none: "vessel-none",
};

const RISK_SORT_KEY: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "critical",
  50,
  "high",
  40,
  "medium",
  30,
  "low",
  20,
  0,
];

function vesselFocusOpacity(selectedId: number): number | maplibregl.ExpressionSpecification {
  if (selectedId === -1) return 0.95;
  return ["case", ["==", ["get", "vessel_id"], selectedId], 1, 0.16];
}

function riskHaloFocusOpacity(selectedId: number): number | maplibregl.ExpressionSpecification {
  const normalOpacity: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "severity"],
    "low",
    0.035,
    0.18,
  ];
  const dimmedOpacity: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "severity"],
    "low",
    0.008,
    0.025,
  ];
  const selectedOpacity: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "severity"],
    "low",
    0.08,
    0.34,
  ];
  if (selectedId === -1) return normalOpacity;
  return ["case", ["==", ["get", "vessel_id"], selectedId], selectedOpacity, dimmedOpacity];
}

function vesselSortKey(selectedId: number): maplibregl.ExpressionSpecification {
  if (selectedId === -1) return RISK_SORT_KEY;
  return ["case", ["==", ["get", "vessel_id"], selectedId], 100, RISK_SORT_KEY];
}

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

  // Refs that always point at the latest values so click handlers
  // (registered once during map init) read fresh state.
  const filtersRef = useRef(filters);
  const riskRef = useRef(state.riskByVessel);
  const vesselsRef = useRef(state.vessels);
  filtersRef.current = filters;
  riskRef.current = state.riskByVessel;
  vesselsRef.current = state.vessels;

  // Initial map setup — once per SPA lifetime.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    // eslint-disable-next-line no-console
    console.info("[SEAM] mounting map", {
      width: container.clientWidth,
      height: container.clientHeight,
    });
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: BASE_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
        maxZoom: 16,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SEAM] MapLibre init failed", err);
      return;
    }
    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.error("[SEAM] MapLibre error", e?.error ?? e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      // Register one pre-colored vessel image per severity. No SDF, no
      // halo — the white stroke is baked into the bitmap so there's
      // never a square aura behind the silhouette.
      (Object.keys(VESSEL_ICON_IDS) as (keyof typeof SEVERITY_COLOR)[]).forEach((sev) => {
        const id = VESSEL_ICON_IDS[sev];
        if (!map.hasImage(id)) {
          map.addImage(id, buildVesselArrow(SEVERITY_COLOR[sev]));
        }
      });

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
          "circle-radius": 18,
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
          "circle-opacity": riskHaloFocusOpacity(-1),
          "circle-blur": 0.4,
        },
      });

      map.addLayer({
        id: "vessels-point",
        type: "symbol",
        source: "vessels",
        filter: ["!", ["has", "point_count"]],
        layout: {
          // Pick the pre-colored icon based on severity. None/unknown
          // vessels fall through to the cyan default.
          "icon-image": [
            "match",
            ["get", "severity"],
            "critical",
            VESSEL_ICON_IDS.critical,
            "high",
            VESSEL_ICON_IDS.high,
            "medium",
            VESSEL_ICON_IDS.medium,
            "low",
            VESSEL_ICON_IDS.low,
            VESSEL_ICON_IDS.none,
          ],
          "icon-rotate": ["coalesce", ["get", "heading"], ["get", "course"], 0],
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "viewport",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "symbol-sort-key": RISK_SORT_KEY,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.22,
            6,
            0.28,
            9,
            0.34,
            12,
            0.42,
            15,
            0.55,
          ],
        },
        paint: {
          "icon-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "vessels-selected",
        type: "circle",
        source: "vessels",
        filter: ["==", ["get", "vessel_id"], -1],
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(58,127,184,0.22)",
          "circle-stroke-color": "#3A7FB8",
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
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
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
        if (!Number.isFinite(id)) return;
        const severity = String(props.severity ?? "none");
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        // Read latest vessels via the ref (the closure was registered once
        // when the map mounted, before any vessels were loaded).
        const v = vesselsRef.current.find((x) => x.vessel_id === id) ?? null;
        // Navigate first so the user always lands on the detail view —
        // popover is best-effort enrichment.
        select({ kind: "vessel", id });
        navigateTo(`/vessels/${id}`);
        if (v) {
          const point = map.project([coords[0], coords[1]]);
          setPopover({ x: point.x, y: point.y, vessel: v, severity });
        } else {
          setPopover(null);
        }
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
      features: filteredVessels.map((v) => featureFor(v, state.riskByVessel[v.vessel_id] ?? v.risk_flags)),
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
    if (map.getLayer("vessels-point")) {
      map.setLayoutProperty("vessels-point", "symbol-sort-key", vesselSortKey(id));
      map.setPaintProperty("vessels-point", "icon-opacity", vesselFocusOpacity(id));
    }
    if (map.getLayer("vessels-halo")) {
      map.setPaintProperty("vessels-halo", "circle-opacity", riskHaloFocusOpacity(id));
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

  // Hold panel/inspector geometry in refs so the map-center subscriber
  // (registered once) can compute fresh padding on every fly-to.
  const layoutRef = useRef({
    panelCollapsed: state.isPanelCollapsed,
    inspectorOpen: state.isInspectorOpen,
    inspectorWidth: state.inspectorWidth,
  });
  layoutRef.current = {
    panelCollapsed: state.isPanelCollapsed,
    inspectorOpen: state.isInspectorOpen,
    inspectorWidth: state.inspectorWidth,
  };

  // External pan requests (from inspectors). Pad the visible area so the
  // target lands in the open space to the right of the side menus.
  useEffect(() => {
    return onMapCenter((ev) => {
      const map = mapRef.current;
      if (!map) return;
      const panelWidth = layoutRef.current.panelCollapsed ? 64 : 320;
      const inspectorWidth = layoutRef.current.inspectorOpen ? layoutRef.current.inspectorWidth : 0;
      // 16px viewport gutter + panel + 16px gap + (optional inspector) + 16px gap
      const left = 16 + panelWidth + 16 + (inspectorWidth ? inspectorWidth + 16 : 0);
      const padding = ev.padding ?? { left, right: 16, top: 16, bottom: 16 };
      map.flyTo({
        center: [ev.lng, ev.lat],
        zoom: ev.zoom ?? Math.max(map.getZoom(), 10),
        padding,
        duration: 500,
      });
    });
  }, []);

  return (
    <>
      <div className="map-canvas" ref={containerRef} />
      <MapStatusStrip vesselCount={filteredVessels.length} runJob={runJob} />
      {/* Only show the "no vessels loaded" CTA after we've actually
          attempted at least one fetch. Previously this flashed on
          first paint while loadMapVessels() was still resolving. */}
      {state.vessels.length === 0 && state.vesselsLoaded && ready && (
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
      {popover && <VesselPopover x={popover.x} y={popover.y} vessel={popover.vessel} severity={popover.severity} flags={state.riskByVessel[popover.vessel.vessel_id] ?? popover.vessel.risk_flags ?? []} onClose={() => setPopover(null)} />}
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
  // Prefer true heading; some AIS feeds only emit course-over-ground.
  const heading = v.heading_degrees ?? null;
  const course = v.course_degrees ?? null;
  const severity = flags?.length ? highestSeverity(flags) : v.highest_risk_severity ?? "none";
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
    properties: {
      vessel_id: v.vessel_id,
      name: v.name,
      imo: v.imo,
      mmsi: v.mmsi,
      heading,
      course,
      severity,
    },
  };
}
