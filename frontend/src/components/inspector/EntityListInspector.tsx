import { Building2, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getEntitiesList, getEntityVessels, runRefreshLive, searchEntities } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { closeInspectorRoute, navigateBack, navigateTo } from "../../hooks/useRoute";
import { useApp, useJobRunner } from "../../state/AppState";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Input } from "../primitives/Input";
import { Skeleton } from "../primitives/Skeleton";
import type { Entity } from "../../types";
import { formatDate } from "../../format";
import { countryName, flagEmoji } from "../../labels";
import { InspectorShell } from "./InspectorShell";

const ENTITY_PAGE_SIZE = 25;

export function EntityListInspector() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<Entity[]>([]);
  const [derivedVesselCounts, setDerivedVesselCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { dispatch } = useApp();
  const runJob = useJobRunner();

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Empty query → show recent entities so the page isn't empty on
    // first visit. `getEntitiesList` hits the new GET /api/entities.
    const offset = page * ENTITY_PAGE_SIZE;
    const load = debounced.trim()
      ? searchEntities(debounced, ENTITY_PAGE_SIZE + 1, offset)
      : getEntitiesList(ENTITY_PAGE_SIZE + 1, offset);
    load
      .then((r) => {
        if (!cancelled) {
          setResults(r.slice(0, ENTITY_PAGE_SIZE));
          r.slice(0, ENTITY_PAGE_SIZE).forEach((entity) => {
            dispatch({ type: "CACHE_ENTITY_LABEL", id: entity.id, label: entity.name });
          });
          setHasNextPage(r.length > ENTITY_PAGE_SIZE);
          setDerivedVesselCounts({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setHasNextPage(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page, dispatch]);

  useEffect(() => {
    const missingCountEntities = results.filter((entity) => typeof entity.unique_vessel_count !== "number");
    if (missingCountEntities.length === 0) return;

    let cancelled = false;
    Promise.all(
      missingCountEntities.map((entity) =>
        getEntityVessels(entity.id)
          .then((vessels) => [entity.id, vessels.length] as const)
          .catch(() => [entity.id, 0] as const)
      )
    ).then((counts) => {
      if (cancelled) return;
      setDerivedVesselCounts((current) => {
        const next = { ...current };
        for (const [entityId, count] of counts) {
          next[entityId] = count;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [results]);

  const pagination = !loading && (results.length > 0 || page > 0) ? (
    <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
      <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
        Previous
      </Button>
      <span className="t-muted" style={{ fontSize: 12 }}>
        {results.length} entities · page {page + 1}
      </span>
      <Button size="sm" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
        Next
      </Button>
    </div>
  ) : undefined;

  return (
    <InspectorShell
      breadcrumb="Entities"
      title={`Entities · Page ${page + 1}`}
      footer={pagination}
      onBack={() => navigateBack("/map")}
      backLabel="Back to previous page"
      onClose={closeInspectorRoute}
    >
      <Input
        variant="search"
        leadingIcon={<Search />}
        placeholder="Name or type"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && (
        <div className="col" style={{ marginTop: 12, gap: 8 }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      )}
      {!loading && results.length === 0 && (
        <EmptyState
          compact
          icon={<Building2 size={18} />}
          title={query ? `No entities match "${query}"` : "Search entities"}
          body={
            query
              ? "Try a different name, or refresh ingestion to pull new particulars."
              : "Run vessel particulars enrichment first, then search for a company, owner, operator, or manager."
          }
          action={
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<RefreshCw size={11} />}
              onClick={() =>
                runJob("refresh-live", runRefreshLive, {
                  successTitle: "Live sources refreshed",
                  errorTitle: "Refresh failed",
                })
              }
            >
              Refresh live
            </Button>
          }
          secondary={<Button size="sm" onClick={() => navigateTo("/operations")}>Open operations</Button>}
        />
      )}
      <div className="col" style={{ marginTop: 12, gap: 6 }}>
        {results.map((e) => {
          const vesselCount = e.unique_vessel_count ?? derivedVesselCounts[e.id];
          const vesselCountLabel = typeof vesselCount === "number" ? vesselCount.toLocaleString() : "...";
          return (
            <a key={e.id} href={`/entities/${e.id}`} className="card row lift" style={{ padding: "10px 12px", gap: 10, textDecoration: "none", color: "inherit" }}>
              <Avatar label={e.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</strong>
                  {e.country_code && (
                    <span title={countryName(e.country_code) || e.country_code} style={{ fontSize: 14, cursor: "help" }}>
                      {flagEmoji(e.country_code) || e.country_code}
                    </span>
                  )}
                </div>
                <div className="t-faded" style={{ fontSize: 11 }}>
                  {e.entity_type} · {vesselCountLabel} unique {vesselCount === 1 ? "vessel" : "vessels"}
                </div>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
                <span className="pill info" style={{ fontSize: 10 }}>
                  {vesselCountLabel} vessels
                </span>
                <span className="t-faded" style={{ fontSize: 11 }}>Updated {formatDate(e.updated_at)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </InspectorShell>
  );
}
