# UI Overview

SEAM V2 is a map-first analyst workspace. The map is the canvas, not a feature inside a dashboard. Tools appear as floating overlays.

## Layout primitives

- **Shell** — viewport-filling container. Renders the persistent `MapCanvas` plus a floating `CommandPanel`. Mounts an inspector on the left or a full-canvas surface, never both.
- **Command panel** — 296 px expanded, 60 px collapsed icon rail. Sits at `top/left/bottom: 12px`. Auto-collapses when an inspector opens unless the user manually expanded it; the inspector then shifts from `left: 84px` to `left: 320px` so they never overlap. State persists in `localStorage` (`seam:panel-collapsed`, `seam:inspector-width`).
- **Inspector** — slides in from the left, 480 ↔ 720 px (resizable via the grip handle). Shared header with breadcrumb + title + actions, optional tabs, scrollable body, optional sticky footer. The `X` close action dismisses the inspector by replacing the route with `/map`; it does not return to the previous inspector in browser history.
- **Full-canvas surfaces** — Schema, Operations, Roadmap. Replace the map; the command panel collapses to its rail.

## Map workspace

- **Basemap** — CartoDB Positron *no-labels* raster tiles over an ocean wash (`--ocean-100`). No place names, no roads, no buildings — coastlines and country shapes only. Saturation pulled down 0.2 so the basemap recedes behind vessel data.
- **Vessel icons** — AIS-style triangles (tapered hull silhouette) drawn into a 64 px canvas, one pre-colored image per severity (critical / high / medium / low / none), with a baked-in white stroke. No SDF. Rotated by `heading_degrees`, falls back to `course_degrees`, falls back to north. Risky vessels sort above lower-risk vessels; a selected vessel sorts above all others.
- **Focus state** — selecting a vessel keeps it fully opaque and increases its halo while non-focused vessels fade down, making the selected contact visually dominant without removing surrounding context.
- **Click semantics** — left-click a triangle → opens the vessel detail inspector AND pans the map with `padding.left = 16 + panelWidth + 16 + inspectorWidth + 16` so the vessel lands in the visible map area, not behind a menu.
- **Cluster** — `cluster: true, clusterMaxZoom: 6, clusterRadius: 40`. Cluster click expands via `getClusterExpansionZoom`.
- **Default view** — Singapore Island, zoom 9.2.

## Floating command panel

Top-to-bottom: BrandHeader, GlobalSearch, PrimaryNav, MapFilters, SourceRefreshControls, KeyStatsStrip, FooterStrip.

- **Global search** — debounced 200 ms, fans out to vessel/entity search and numeric-evidence lookup; results show in a popover.
- **Map filters** — risk severity chips, vessel-type multi-select, flag-state multi-select, geo-layer toggles (from `/api/geo/layers`), time window (live / 1h / 6h / 24h / 7d), port-activity overlay radio.
- **Source refresh controls** — every ingestion endpoint with health pills, danger styling on the OpenSanctions API call (consumes 1 quota request — gated by a confirm modal).
- **Key stats** — four tiles reading `useStatsSnapshot()`: Live vessels, Port events, Sanctions records, Risk flags. `Live vessels` uses the loaded map snapshot count and does not fall back to the total vessels table when the snapshot is empty.
- **Footer** — live backend dot (pulses red when offline), greyscale map wash via `.shell.offline`.

## Command palette (⌘K)

Centered modal with multi-collection search:

- **Go to** — every primary route with icon + path label.
- **Vessels / Entities / Evidence (numeric query) / Risk flags / Sanctions / Recent** — 5 results per section, contextual metadata per kind.
- Keyboard: `↑↓` navigate · `↵` open · `Esc` close · `⌘K` toggle. Footer strip shows kbd hints and the result count.
- `role="listbox"` with `aria-activedescendant` so screen readers announce the active row. Hover and keyboard navigation stay in sync via a single `activeIndex`.

## Evidence-first surfaces

- **EvidenceLink primitive** — `inline` (mono "#1234" with database icon), `chip` (filled pill), `button` (full button). Used wherever an evidence reference appears.
- **EvidenceInspector** — Copy ID, Copy Hash, **Verify Hash** (SubtleCrypto SHA-256 over canonical JSON matching the backend `stable_payload_hash`), View Raw Source (opens `raw_payload.url`), Linked-subjects chips derived from payload keys (`vessel_id`, `entity_id`, `imo`, `mmsi`, `port_code`, …), pretty-printed JSON viewer with syntax highlighting.

## Risk humanization

`labels.ts` maps backend `flag_type` strings to a `riskLabel()` object with:

- `title` — human-readable name (Sanctioned, Detained at port, On maritime watchlist, …).
- `body` — written explanation.
- `kind` — semantic group (`sanctioned`, `detained`, `watchlist`, `news`, `high_risk_flag`, `identity_conflict`, `other`).
- `toneClass` — pill variant.

`/api/risk/feed` loads aggregated vessel/entity flags for the Risk and Sanctions inspectors in one request. `RiskCard.tsx` renders subject + status + relative time, severity pill + kind pill (with `Scale` for sanctioned, `Anchor` for detained, `ShieldAlert` otherwise) + source attribution, expandable description + Evidence chip + Open + per-vessel Recompute.

## Motion + accessibility

- Centralized tokens: `--motion-fast (120ms) / --motion-base (220ms) / --motion-slow (360ms)`; easings `--ease-out / --ease-in-out / --ease-pop`.
- Inspector slides in from the left; vessel popover pops with a bounce; nav active bar animates the scale; offline status dot pulses.
- `@media (prefers-reduced-motion: reduce)` collapses every animation and transition to 1 ms.
- Every emoji flag carries `title=` + `aria-label=` set to the full country name.
- `*:focus-visible` shows a 2 px `--ocean-500` ring with 2 px offset.
