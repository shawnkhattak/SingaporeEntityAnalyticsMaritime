import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Database, Search } from "lucide-react";
import { browseTable, type TableBrowseResponse } from "../../api";
import { navigateTo } from "../../hooks/useRoute";
import { Button } from "../primitives/Button";
import { Skeleton } from "../primitives/Skeleton";

const TABLE_LABELS: Record<string, string> = {
  vessels: "Vessels",
  vessel_positions_latest: "Latest vessel positions",
  port_events: "Port events",
  entities: "Entities",
  relationships: "Relationships",
  risk_flags: "Risk flags",
  sanctions_records: "Sanctions records",
  news_articles: "News articles",
  news_links: "News links",
  reference_data: "Reference data",
  ingestion_jobs: "Ingestion jobs",
  ingestion_logs: "Ingestion logs",
  source_health: "Source health",
  source_observations: "Source observations",
};

const TABLE_DESCRIPTIONS: Record<string, string> = {
  vessels: "All ships SEAM is tracking, with their identities and specs.",
  vessel_positions_latest: "Each ship's most recent location on the water.",
  port_events: "Records of ships arriving at and departing from ports.",
  entities: "People, companies, and organizations linked to maritime activity.",
  relationships: "Known connections between people, companies, and ships.",
  risk_flags: "Concerns raised on a ship or entity — sanctions matches, suspicious behavior, news hits.",
  sanctions_records: "People and entities on government sanctions lists.",
  news_articles: "Maritime news stories collected from public sources.",
  news_links: "Connections between news stories and the ships, people, or companies they mention.",
  ingestion_jobs: "Background tasks that pull fresh data in from outside sources.",
  ingestion_logs: "Step-by-step records of what each data pull did, including any errors.",
  source_health: "How well each external data source is responding right now.",
  source_observations: "Recent snapshots of each source's status over time.",
};

const PAGE_SIZE = 50;
const MAX_CELL_LEN = 140;

function tableTitle(table: string): string {
  return TABLE_LABELS[table] ?? table;
}

export function DataBrowserPage({ table }: { table: string }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<TableBrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(query);
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    browseTable(table, debounced, PAGE_SIZE, offset)
      .then((res) => {
        if (reqId.current !== id) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (reqId.current !== id) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [table, debounced, offset]);

  const title = tableTitle(table);
  const description = TABLE_DESCRIPTIONS[table];
  const total = data?.total ?? 0;
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + rows.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const headerCells = useMemo(
    () =>
      columns.map((col) => (
        <th
          key={col}
          style={{
            position: "sticky",
            top: 0,
            background: "var(--gray-50, #f5f6f8)",
            borderBottom: "1px solid var(--gray-100)",
            padding: "8px 10px",
            textAlign: "left",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--gray-700, #555)",
            whiteSpace: "nowrap",
            zIndex: 1,
          }}
        >
          {col}
        </th>
      )),
    [columns],
  );

  return (
    <div className="fullcanvas-page" style={{ padding: 24, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 6 }}>
        <Button
          variant="ghost"
          onClick={() => navigateTo("/operations")}
          aria-label="Back to Operations"
        >
          <ArrowLeft size={14} /> Operations
        </Button>
      </div>

      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 4 }}>
        <Database size={18} />
        <h1 className="t-h1" style={{ margin: 0, fontSize: 20 }}>{title}</h1>
        <span className="t-faded" style={{ fontSize: 12 }}>
          {loading && !data ? "loading…" : `${total.toLocaleString()} record${total === 1 ? "" : "s"}`}
        </span>
      </div>
      {description && (
        <div className="t-faded" style={{ fontSize: 12, marginBottom: 14 }}>{description}</div>
      )}

      <div
        className="panel-solid"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          className="row"
          style={{
            gap: 10,
            padding: "10px 12px",
            borderBottom: "1px solid var(--gray-100)",
            alignItems: "center",
          }}
        >
          <Search size={14} />
          <input
            type="search"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 8px",
              border: "1px solid var(--gray-200, #e2e2e6)",
              borderRadius: "var(--r-card, 6px)",
              fontSize: 13,
              background: "var(--white)",
              outline: "none",
            }}
          />
          <span className="t-faded" style={{ fontSize: 11 }}>
            {total === 0 ? "No matches" : `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
        </div>

        {error ? (
          <div style={{ padding: 16, color: "var(--risk-critical)", fontSize: 13 }}>
            Failed to load: {error}
          </div>
        ) : (
          <div style={{ overflow: "auto", maxHeight: "calc(100vh - 260px)" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
              }}
            >
              <thead>
                <tr>{headerCells}</tr>
              </thead>
              <tbody>
                {loading && rows.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        {(columns.length > 0 ? columns : [0, 1, 2, 3]).map((c, idx) => (
                          <td key={idx} style={{ padding: "8px 10px", borderBottom: "1px solid var(--gray-50, #f5f6f8)" }}>
                            <Skeleton width="80%" height={12} rounded={3} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--gray-50, #f5f6f8)" }}>
                        {columns.map((col) => (
                          <td
                            key={col}
                            style={{
                              padding: "8px 10px",
                              whiteSpace: "nowrap",
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: row[col] == null ? "var(--gray-400, #999)" : "var(--navy-900)",
                            }}
                            title={formatCellTitle(row[col])}
                          >
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1)}
                      style={{ padding: 24, textAlign: "center", color: "var(--gray-500)", fontSize: 12 }}
                    >
                      {debounced ? `No ${title.toLowerCase()} match "${debounced}".` : `No ${title.toLowerCase()} yet.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="row"
          style={{
            gap: 10,
            padding: "10px 12px",
            borderTop: "1px solid var(--gray-100)",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Button variant="ghost" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={!canPrev || loading}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <Button variant="ghost" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!canNext || loading}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") {
    return value.length > MAX_CELL_LEN ? `${value.slice(0, MAX_CELL_LEN)}…` : value;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > MAX_CELL_LEN ? `${s.slice(0, MAX_CELL_LEN)}…` : s;
  } catch {
    return String(value);
  }
}

function formatCellTitle(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
