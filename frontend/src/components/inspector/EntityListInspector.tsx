import { Building2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { searchEntities } from "../../api";
import { useDebounce } from "../../hooks/useDebounce";
import { Avatar } from "../primitives/Avatar";
import { EmptyState } from "../primitives/EmptyState";
import { Input } from "../primitives/Input";
import { Skeleton } from "../primitives/Skeleton";
import type { Entity } from "../../types";
import { formatDate } from "../../format";
import { InspectorShell } from "./InspectorShell";

export function EntityListInspector() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

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
          icon={<Building2 size={22} />}
          title={query ? "No entity matches" : "Search entities"}
          body="Run vessel particulars enrichment, then search for an owner, manager, or flag state."
        />
      )}
      <div className="col" style={{ marginTop: 12, gap: 6 }}>
        {results.map((e) => (
          <a key={e.id} href={`/entities/${e.id}`} className="card row" style={{ padding: "10px 12px", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Avatar label={e.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 14 }}>{e.name}</strong>
              <div className="t-faded" style={{ fontSize: 11 }}>{e.entity_type}{e.country_code ? ` · ${e.country_code}` : ""}</div>
            </div>
            <span className="t-faded" style={{ fontSize: 11 }}>Updated {formatDate(e.updated_at)}</span>
          </a>
        ))}
      </div>
    </InspectorShell>
  );
}
