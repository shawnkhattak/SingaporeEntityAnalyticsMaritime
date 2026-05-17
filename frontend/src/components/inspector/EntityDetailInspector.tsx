import { Building2, ChevronDown, Database, Network, Ship } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getEntity, getEntityRelationships, getEntityRiskFlags, getEntityVessels } from "../../api";
import { closeInspectorRoute, navigateTo } from "../../hooks/useRoute";
import { countryName, flagEmoji, riskLabel } from "../../labels";
import { recordRecent, useApp } from "../../state/AppState";
import type { Entity, EntityRelationship, RiskFlag, VesselSummary } from "../../types";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { ErrorState } from "../primitives/ErrorState";
import { EvidenceLink } from "../primitives/EvidenceLink";
import { Pill, RiskPill } from "../primitives/Pill";
import { Skeleton } from "../primitives/Skeleton";
import { InspectorShell } from "./InspectorShell";

type Loaded = {
  entity: Entity;
  vessels: VesselSummary[];
  relationships: EntityRelationship[];
  risk: RiskFlag[];
};

type GroupedVessel = {
  vessel: VesselSummary;
  roles: string[];
  relationshipCount: number;
};

export function EntityDetailInspector({ id }: { id: number }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { dispatch } = useApp();

  function load() {
    setError(null);
    Promise.all([getEntity(id), getEntityVessels(id), getEntityRelationships(id), getEntityRiskFlags(id)])
      .then(([entity, vessels, relationships, risk]) => {
        setData({ entity, vessels, relationships, risk });
        dispatch({ type: "CACHE_ENTITY_RISK", id, flags: risk });
        recordRecent("entity", id, entity.name);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <InspectorShell breadcrumb="Entity" title="Could not load" onClose={closeInspectorRoute}>
        <ErrorState body={error} onRetry={load} />
      </InspectorShell>
    );
  }
  if (!data) {
    return (
      <InspectorShell breadcrumb="Entity" title="Loading..." onClose={closeInspectorRoute}>
        <Skeleton height={80} />
      </InspectorShell>
    );
  }

  const entity = data.entity;
  const groupedVessels = groupRelatedVessels(data.vessels, data.relationships);

  return (
    <InspectorShell
      breadcrumb="Entity"
      title={entity.name}
      onClose={closeInspectorRoute}
      footer={
        <Button size="sm" leadingIcon={<Network size={12} />} onClick={() => navigateTo(`/graph?subject=entity&id=${id}`)}>
          Open in graph
        </Button>
      }
    >
      <div className="col entity-detail-page">
        <section className="entity-section">
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <div className="avatar" style={{ background: "var(--ocean-50)", color: "var(--ocean-600)" }}>
              <Building2 size={15} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 title={entity.name} style={{ margin: 0, fontSize: 15, lineHeight: 1.35, color: "var(--navy-900)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {entity.name}
              </h3>
              <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                <Pill variant="info">{entityTypeLabel(entity.entity_type)}</Pill>
                {entity.external_id && <span className="pill">External ID {entity.external_id}</span>}
              </div>
            </div>
          </div>
          <div className="entity-metric-grid">
            <Metric icon={<Ship size={13} />} label="Unique vessels" value={groupedVessels.length} />
            <Metric icon={<Network size={13} />} label="Relationships" value={data.relationships.length} />
            <Metric icon={<Database size={13} />} label="Risk flags" value={data.risk.length} />
          </div>
        </section>

        <EntitySection title="Related Vessels" count={groupedVessels.length}>
          {groupedVessels.length === 0 ? (
            <EmptyState compact icon={<Ship size={16} />} title="No related vessels" />
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {groupedVessels.map((item) => (
                <a key={vesselGroupKey(item.vessel)} href={`/vessels/${item.vessel.id}`} className="entity-vessel-card">
                  <Ship size={14} color="var(--ocean-500)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong title={item.vessel.name} style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.vessel.name}
                    </strong>
                    <div className="row" style={{ gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                      <span className="mono t-faded" style={{ fontSize: 11 }}>{item.vessel.imo ? `IMO ${item.vessel.imo}` : item.vessel.mmsi ? `MMSI ${item.vessel.mmsi}` : "No IMO/MMSI"}</span>
                      <span className="t-faded" style={{ fontSize: 11 }}>{flagLabel(item.vessel)}</span>
                    </div>
                    <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {item.roles.map((role) => <span key={role} className="pill info">{role}</span>)}
                    </div>
                  </div>
                  {item.vessel.flag_country_code && (
                    <span
                      title={countryName(item.vessel.flag_country_code) || item.vessel.flag_country_code}
                      aria-label={countryName(item.vessel.flag_country_code) || item.vessel.flag_country_code}
                      style={{ fontSize: 16, lineHeight: 1, cursor: "help" }}
                    >
                      {flagEmoji(item.vessel.flag_country_code) || item.vessel.flag_country_code}
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </EntitySection>

        <EntitySection title="Risk" count={data.risk.length}>
          {data.risk.length === 0 ? (
            <EmptyState compact icon={<Database size={16} />} title="No risk flags found" />
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {data.risk.map((flag) => {
                const label = riskLabel(flag.flag_type);
                return (
                  <div key={flag.id} className="card" style={{ padding: "10px 12px" }}>
                    <div className="row" style={{ gap: 6 }}>
                      <RiskPill severity={flag.severity as never} />
                      <strong style={{ flex: 1, fontSize: 13 }}>{label.title}</strong>
                    </div>
                    <div className="t-sm" style={{ marginTop: 4 }}>{flag.summary || label.body}</div>
                  </div>
                );
              })}
            </div>
          )}
        </EntitySection>

        <EntitySection title="Relationships" count={data.relationships.length} collapsedByDefault>
          {data.relationships.length === 0 ? (
            <EmptyState compact title="No relationships" />
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {data.relationships.map((relationship) => (
                <a key={relationship.id} href={relationship.vessel ? `/vessels/${relationship.vessel.id}` : "#"} className="entity-relationship-card">
                  <div className="row" style={{ gap: 6, alignItems: "center" }}>
                    <span className="pill info">{roleLabel(relationship.relationship_type)}</span>
                    <span className="t-faded" style={{ fontSize: 11 }}>confidence: {relationship.confidence}</span>
                    <span style={{ flex: 1 }} />
                    <EvidenceLink id={relationship.evidence_id} variant="inline" />
                  </div>
                  <div className="t-sm" style={{ marginTop: 5, fontWeight: 650 }}>{relationship.vessel?.name ?? "No target vessel"}</div>
                  <div className="mono t-faded" style={{ fontSize: 11, marginTop: 2 }}>
                    {relationship.vessel?.imo ? `IMO ${relationship.vessel.imo}` : relationship.vessel?.mmsi ? `MMSI ${relationship.vessel.mmsi}` : "No vessel identifier"}
                  </div>
                  {relationship.evidence_summary && (
                    <div className="t-faded" style={{ fontSize: 11, marginTop: 5, lineHeight: 1.4 }}>{relationship.evidence_summary}</div>
                  )}
                </a>
              ))}
            </div>
          )}
        </EntitySection>

        <section className="entity-section">
          <div className="row" style={{ gap: 10 }}>
            <Network size={16} color="var(--ocean-500)" />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13 }}>Graph view</strong>
              <div className="t-sm" style={{ marginTop: 2 }}>Open this entity with its connected vessels and relationship records in the graph workspace.</div>
            </div>
            <Button size="sm" leadingIcon={<Network size={12} />} onClick={() => navigateTo(`/graph?subject=entity&id=${id}`)}>
              Open
            </Button>
          </div>
        </section>
      </div>
    </InspectorShell>
  );
}

function EntitySection({ title, count, children, collapsedByDefault = false }: { title: string; count?: number; children: React.ReactNode; collapsedByDefault?: boolean }) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  return (
    <section className={`entity-section ${collapsed ? "is-collapsed" : ""}`}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="entity-section-header"
        aria-expanded={!collapsed}
      >
        <h3 className="t-h2" style={{ margin: 0, flex: 1 }}>{title}</h3>
        {count != null && <span className="t-faded" style={{ fontSize: 11 }}>{count}</span>}
        <ChevronDown size={14} className="entity-section-chevron" />
      </button>
      {!collapsed && children}
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-label row" style={{ gap: 4 }}>{icon}{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function groupRelatedVessels(vessels: VesselSummary[], relationships: EntityRelationship[]): GroupedVessel[] {
  const map = new Map<string, GroupedVessel>();
  for (const relationship of relationships) {
    if (!relationship.vessel) continue;
    const key = vesselGroupKey(relationship.vessel);
    const existing = map.get(key) ?? { vessel: relationship.vessel, roles: [], relationshipCount: 0 };
    existing.relationshipCount += 1;
    const role = roleLabel(relationship.relationship_type);
    if (!existing.roles.includes(role)) existing.roles.push(role);
    map.set(key, existing);
  }
  for (const vessel of vessels) {
    const key = vesselGroupKey(vessel);
    if (!map.has(key)) map.set(key, { vessel, roles: [], relationshipCount: 0 });
  }
  return Array.from(map.values()).sort((a, b) => a.vessel.name.localeCompare(b.vessel.name));
}

function vesselGroupKey(vessel: VesselSummary): string {
  return vessel.imo ? `imo:${vessel.imo}` : `id:${vessel.id}`;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: "Owner",
    operator: "Operator",
    ship_manager: "Ship Manager",
    ism_manager: "ISM Manager",
  };
  return labels[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function entityTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function flagLabel(vessel: VesselSummary): string {
  if (!vessel.flag_country_code) return "Flag unknown";
  const name = countryName(vessel.flag_country_code);
  return name ? `Flag: ${name}` : `Flag: ${vessel.flag_country_code}`;
}
