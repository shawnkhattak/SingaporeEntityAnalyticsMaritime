import { Building2, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { runRefreshLive, searchEntities } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { navigateTo } from "../../hooks/useRoute";
import { useJobRunner } from "../../state/AppState";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { EmptyState } from "../primitives/EmptyState";
import { Input } from "../primitives/Input";
import { Skeleton } from "../primitives/Skeleton";
import type { Entity } from "../../types";
import { formatDate } from "../../format";
import { countryName, flagEmoji } from "../../labels";
import { InspectorShell } from "./InspectorShell";

export function EntityListInspector() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const runJob = useJobRunner();

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchEntities(debounced)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <InspectorShell breadcrumb="Entities" title={`Entities · ${results.length}`} onClose={() => window.history.back()}>
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
              : "Run vessel particulars enrichment first, then search for an owner, manager, or flag state."
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
        {results.map((e) => (
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
              <div className="t-faded" style={{ fontSize: 11 }}>{e.entity_type}</div>
            </div>
            <span className="t-faded" style={{ fontSize: 11 }}>Updated {formatDate(e.updated_at)}</span>
          </a>
        ))}
      </div>
    </InspectorShell>
  );
}
