import { Search, Ship } from "lucide-react";
import { FormEvent, useState } from "react";
import { searchVessels } from "../api";
import { formatDate } from "../format";
import type { VesselSearchResult } from "../types";

export function VesselSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VesselSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setResults(await searchVessels(query.trim()));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to search vessels.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="hero compact" aria-labelledby="vessels-title">
        <p className="eyebrow">Vessels</p>
        <h1 id="vessels-title">Search the vessel read model</h1>
        <p className="lede">Search by IMO, MMSI, call sign, or vessel name. Results come from stored database evidence.</p>
      </section>
      <form className="search-bar" onSubmit={(event) => void submit(event)}>
        <label htmlFor="vessel-query">Vessel search</label>
        <div>
          <input
            id="vessel-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="IMO, MMSI, call sign, or name"
            type="search"
            value={query}
          />
          <button type="submit" disabled={isLoading}>
            <Search aria-hidden="true" />
            {isLoading ? "Searching" : "Search"}
          </button>
        </div>
      </form>
      {error ? <p className="status-message status-message--error">{error}</p> : null}
      <section className="results-grid" aria-label="Vessel search results">
        {results.length === 0 ? (
          <div className="empty-row">Run live positions ingestion from `/dev`, then search by IMO, MMSI, call sign, or name.</div>
        ) : (
          results.map((vessel) => (
            <a className="result-card" href={`/vessels/${vessel.id}`} key={vessel.id}>
              <Ship aria-hidden="true" />
              <div>
                <h2>{vessel.name}</h2>
                <p>{[vessel.imo && `IMO ${vessel.imo}`, vessel.mmsi && `MMSI ${vessel.mmsi}`, vessel.call_sign].filter(Boolean).join(" · ")}</p>
                <span>{vessel.latest_position ? `Latest position ${formatDate(vessel.latest_position.position_timestamp)}` : "No position stored"}</span>
              </div>
            </a>
          ))
        )}
      </section>
    </>
  );
}
