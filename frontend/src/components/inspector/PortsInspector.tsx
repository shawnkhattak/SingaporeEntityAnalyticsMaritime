import { Anchor, ChevronDown, ChevronRight, Layers, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getGeoLayer } from "../../api";
import { requestMapCenter } from "../../hooks/useMapCenter";
import { closeInspectorRoute } from "../../hooks/useRoute";
import { useFilters, useJobRunner } from "../../state/AppState";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import { InspectorShell } from "./InspectorShell";

const PORT_LAYER = "ports_p";

type GeoFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties?: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type PortPoint = {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number];
  sourceDate: string | null;
  properties: Record<string, unknown>;
};

function field(props: Record<string, unknown>, key: string): string | null {
  const value = props[key];
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function portName(props: Record<string, unknown>, index: number) {
  return (
    field(props, "OBJNAM") ||
    field(props, "NAME") ||
    field(props, "NOBJNM") ||
    field(props, "INFORM") ||
    `Port service point ${index + 1}`
  );
}

function category(props: Record<string, unknown>) {
  const subtype = field(props, "FCSubtype");
  if (subtype === "1") return "Berth";
  if (subtype === "35") return "Club / marina";
  if (subtype === "45") return "Terminal / facility";
  if (subtype === "55") return "Port service";
  return subtype ? `Subtype ${subtype}` : "Port service";
}

function toPortPoints(collection: FeatureCollection | null): PortPoint[] {
  if (!collection?.features) return [];
  return collection.features
    .map((feature, index): PortPoint | null => {
      if (feature.geometry?.type !== "Point") return null;
      const coords = feature.geometry.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      const props = feature.properties ?? {};
      const displayName = portName(props, index).trim();
      if (displayName.length <= 1 || displayName === `Port service point ${index + 1}`) return null;
      return {
        id: field(props, "NOID") ?? field(props, "LNAM") ?? `${lon},${lat}`,
        name: displayName,
        category: category(props),
        coordinates: [lon, lat],
        sourceDate: field(props, "SORDAT") ?? field(props, "LAST_MOD"),
        properties: props,
      };
    })
    .filter((item): item is PortPoint => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function groupByCategory(points: PortPoint[]) {
  const grouped = new Map<string, PortPoint[]>();
  for (const point of points) {
    const list = grouped.get(point.category) ?? [];
    list.push(point);
    grouped.set(point.category, list);
  }
  return Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

export function PortsInspector() {
  const [collection, setCollection] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Berth", "Terminal / facility"]));
  const { filters, setFilters } = useFilters();
  const runJob = useJobRunner();
  const didAutoShowPortsRef = useRef(false);
  const latestFiltersRef = useRef(filters);

  const points = useMemo(() => toPortPoints(collection), [collection]);
  const grouped = useMemo(() => groupByCategory(points), [points]);
  const portsVisible = filters.enabledGeoLayers.has(PORT_LAYER);

  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getGeoLayer(PORT_LAYER);
      setCollection(data as FeatureCollection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Oceans-X ports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (filters.enabledGeoLayers.has(PORT_LAYER)) return;
    const next = new Set(filters.enabledGeoLayers);
    next.add(PORT_LAYER);
    didAutoShowPortsRef.current = true;
    setFilters({ ...filters, enabledGeoLayers: next });
  }, []);

  useEffect(() => {
    return () => {
      if (!didAutoShowPortsRef.current) return;
      const current = latestFiltersRef.current;
      if (!current.enabledGeoLayers.has(PORT_LAYER)) return;
      const next = new Set(current.enabledGeoLayers);
      next.delete(PORT_LAYER);
      setFilters({ ...current, enabledGeoLayers: next });
    };
  }, [setFilters]);

  function refresh() {
    return runJob("ports-layer-refresh", load, {
      successTitle: "Oceans-X ports loaded",
      errorTitle: "Oceans-X ports failed",
    });
  }

  function toggleMapLayer() {
    const next = new Set(filters.enabledGeoLayers);
    if (next.has(PORT_LAYER)) next.delete(PORT_LAYER);
    else next.add(PORT_LAYER);
    setFilters({ ...filters, enabledGeoLayers: next });
  }

  function toggleCategory(name: string) {
    setExpanded((curr) => {
      const next = new Set(curr);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function centerPort(point: PortPoint) {
    requestMapCenter({
      lng: point.coordinates[0],
      lat: point.coordinates[1],
    });
  }

  return (
    <InspectorShell
      breadcrumb="Ports"
      title={`Ports · ${points.length}`}
      onClose={closeInspectorRoute}
      footer={
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant={portsVisible ? "primary" : "default"} leadingIcon={<Layers size={12} />} onClick={toggleMapLayer}>
            {portsVisible ? "Hide on map" : "Show on map"}
          </Button>
          <Button size="sm" leadingIcon={<RefreshCw size={12} />} onClick={refresh}>Reload</Button>
        </div>
      }
    >
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
          <Anchor size={16} color="var(--ocean-500)" />
          <div>
            <strong style={{ fontSize: 13 }}>Oceans-X port service points</strong>
            <p className="t-sm" style={{ margin: "4px 0 0" }}>
              Uses the confirmed working <span className="mono">portsandservicesp-zip</span> layer. These are mapped port/service points such as berths, terminals, marinas, and service facilities.
            </p>
          </div>
        </div>
      </div>

      {loading && <Skeleton height={72} />}

      {!loading && error && (
        <EmptyState compact icon={<MapPin size={18} />} title="Ports unavailable" body={error} action={<Button size="sm" onClick={load}>Try again</Button>} />
      )}

      {!loading && !error && grouped.length === 0 && (
        <EmptyState compact icon={<MapPin size={18} />} title="No port points loaded" body="The Oceans-X ports layer returned no readable point features." action={<Button size="sm" onClick={load}>Reload ports</Button>} />
      )}

      <div className="col" style={{ gap: 6, paddingBottom: 8 }}>
        {grouped.map(([name, items]) => {
          const open = expanded.has(name);
          return (
            <div key={name} className="card">
              <button type="button" className="row" onClick={() => toggleCategory(name)} style={{ width: "100%", padding: "10px 12px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <MapPin size={14} color="var(--risk-medium)" />
                <strong style={{ flex: 1 }}>{name}</strong>
                <span className="pill info">{items.length}</span>
              </button>
              {open && (
                <div style={{ padding: "0 12px 10px" }}>
                  {items.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className="row port-list-item"
                      onClick={() => centerPort(point)}
                      title={`Center ${point.name} on map`}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <strong>{point.name}</strong>
                        {point.sourceDate && <span className="t-faded mono" style={{ marginLeft: 6, fontSize: 11 }}>{point.sourceDate}</span>}
                      </span>
                      <span className="t-faded mono" style={{ fontSize: 11 }}>
                        {point.coordinates[1].toFixed(4)}, {point.coordinates[0].toFixed(4)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </InspectorShell>
  );
}
