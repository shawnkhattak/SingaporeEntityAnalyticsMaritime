# News Sources

V1 news comes from live RSS/Atom and JSON Feed 1.1 feeds configured by `NEWS_RSS_URLS`.

Default RSS.app bundles:

| Bundle | Feed URL | Purpose |
| --- | --- | --- |
| SEAM Singapore Social Media Intel | `https://rss.app/feeds/v1.1/_k2zRjP2j4B2XpYXV.json` | Tracks public social media chatter and shipping-related posts connected to Singapore maritime activity. |
| SEAM Entity Watchlist | `https://rss.app/feeds/v1.1/_dmwNOhqoTXjyWDMc.json` | Tracks specific Singapore maritime keywords, vessel activity, and entity-related watchlist terms. |
| SEAM Singapore Maritime Intel | `https://rss.app/feeds/v1.1/_gw24IMIVRI5WBN1p.json` | Tracks formal maritime news, trade publications, and official Singapore maritime updates. |

Source badge contract:

| Bundle | Source name | Badge |
| --- | --- | --- |
| SEAM Singapore Social Media Intel | X/Twitter keyword search feed | Twitter/X |
| SEAM Singapore Social Media Intel | Lloyd’s List Twitter/X | Lloyd’s List |
| SEAM Entity Watchlist | "Singapore bunker" vessel | RSS.app Search Feed |
| SEAM Entity Watchlist | "Singapore-flagged" vessel | RSS.app Search Feed |
| SEAM Entity Watchlist | "PSA Singapore" maritime | RSS.app Search Feed |
| SEAM Entity Watchlist | "Singapore Strait" tanker | RSS.app Search Feed |
| SEAM Entity Watchlist | "Port of Singapore" vessel | RSS.app Search Feed |
| SEAM Singapore Maritime Intel | TradeWinds Singapore | TradeWinds |
| SEAM Singapore Maritime Intel | MarineLink Singapore | Maritime News |
| SEAM Singapore Maritime Intel | Splash 24/7 | Splash 24/7 |
| SEAM Singapore Maritime Intel | MPA Singapore Media Releases | Government Source |
| SEAM Singapore Maritime Intel | gCaptain | gCaptain |
| SEAM Singapore Maritime Intel | The Maritime Executive | The Maritime Executive |

Endpoint: `POST /api/dev/ingestion/news`

The app refreshes RSS/news on an hourly cadence when the frontend refresh loop is active. The News panel shows:

- **All** — latest 50 stories by publication date.
- **Social** — SEAM Singapore Social Media Intel.
- **Watchlist** — SEAM Entity Watchlist.
- **Maritime** — SEAM Singapore Maritime Intel.

Bundle tabs can include articles beyond the latest 50 shown in All.

The ingester stores source title, source badge, RSS.app bundle name, URL, publication time, summary/excerpt, raw payload, and entity/vessel links found by exact case-insensitive name matching. No AI summaries are generated in V1.
