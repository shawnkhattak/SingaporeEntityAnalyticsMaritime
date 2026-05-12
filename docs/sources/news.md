# News Source

V1 news comes from live RSS/Atom feeds configured by `NEWS_RSS_URLS`. The default feed is `https://gcaptain.com/feed/`.

Endpoint: `POST /api/dev/ingestion/news`

The ingester stores source title, URL, publication time, summary/excerpt, raw payload, and entity/vessel links found by exact case-insensitive name matching. No AI summaries are generated in V1.
