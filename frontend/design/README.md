# SEAM V2 — Design Handoff

This folder is a self-contained design hand-off for the SEAM V2 maritime intelligence platform rebuild. Drop it into your repo (e.g. at `frontend/design/`) and point your implementation engineer — or Claude Code — at `wiring.md`.

## What's in here

```
design/
├── README.md                  ← you are here
├── CLAUDE.md                  ← auto-loaded context for Claude Code
├── wiring.md                  ← THE implementation contract (read this first)
├── SEAM V2 Hi-Fi.html         ← open in a browser to see all 17 screens
├── design-canvas.jsx          ← pan/zoom canvas component (host for the screens)
└── hifi/
    ├── styles.css             ← design tokens + component styles (lift into styles.css)
    ├── parts.jsx              ← shared primitives, map base, command panel, inspector shell
    ├── screens-map.jsx        ← map workspace + vessel/entity inspectors
    ├── screens-feeds.jsx      ← risk / sanctions / ports / news inspectors
    ├── screens-fullcanvas.jsx ← Ops Console, Graph, Schema, Evidence JSON
    ├── screens-overlays.jsx   ← command palette, modal+toasts, roadmap, error state, foundations
    └── app.jsx                ← composes everything into the design canvas
```

## How to view the designs

Open `SEAM V2 Hi-Fi.html` directly in a browser (no build step). Each artboard is a frame on a pan/zoom canvas:

- **Scroll** to zoom.
- **Space + drag** to pan.
- **⤢** (top-right of any artboard on hover) to open fullscreen — use the arrow keys to flip between artboards.
- Inline-edit titles and labels by clicking them.

The 17 frames cover:

| # | Frame | Notes |
|---|---|---|
| 00 | Foundations | Palette, type, components — design system at a glance |
| 01 | Map — empty / first-run | Run-positions-snapshot CTA on a still ocean |
| 02 | Map — loaded | 30+ vessels, halos on risk-flagged, vessel popover open |
| 03 | Vessels list inspector | Search, filter chips, paginated rows |
| 04 | Vessel detail | Hero, two metrics, risk flags, entities, port calls |
| 05 | Entity detail | Relationships tab active, owner of sanctioned vessels |
| 06 | Risk feed | Severity counters, color-striped flag rows |
| 07 | Sanctions matches | Read-only list (no CSV — that's in Ops) |
| 08 | Ports — due to arrive | Expandable port rows with vessel events |
| 09 | News | RSS-derived cards with linked subject chips |
| 10 | Operations Console | 3-col grid (health · DB state · ingestion) + vessel browser |
| 11 | Graph | 11-node subgraph, confidence-tiered edges, selection inspector |
| 12 | Schema atlas | 8 tables, FK edges, selected-table inspector |
| 13 | Evidence JSON | Pretty payload with metadata strip |
| 14 | Command palette (⌘K) | Grouped results, keyboard hints |
| 15 | Confirm modal + toast stack | Sanctions quota dialog with 3 stacked toasts |
| 16 | Roadmap | Vertical timeline of project stages |
| 17 | Error — backend unreachable | Greyscale wash, reconnecting pill, inspector error state |

## How to implement

Open **`wiring.md`** — it is the complete technical contract:

1. Stack & target file layout (every file to create / delete)
2. Design tokens (drop into `styles.css`)
3. Typography & icons
4. Routing model + path table
5. Global app state shape
6. Shared UI types to add to `types.ts`
7. **Every API call** the UI makes — both existing helpers and new ones to add
8. Component-by-component wiring (what each piece fetches, what it renders, what its actions do)
9. MapLibre integration (style, layers, click semantics, ↔ inspector sync)
10. Filter predicate (single source of truth)
11. Hooks (`useDebounce`, `useHotkey`, `usePoll`, `useMapCenter`)
12. Command palette
13. Toasts, modals, error & empty states
14. New endpoints to add to the backend (with `TODO(api):` stub guidance)
15. Migration order (8 PRs, each independently shippable)
16. Acceptance checklist
17. Out of scope

## Key decisions baked into the design

- **Map is the canvas.** Floating command panel on the left; inspectors slide in next to a 64px collapsed rail. The map is visible on every route except `graph`, `schema`, `ops`, and `roadmap`.
- **Inspectors are on the LEFT**, not the right. The command panel auto-collapses when an inspector opens.
- **Sanctions CSV upload lives only in the Operations Console** — the Sanctions inspector is read-only.
- **Risk colors are semantic only.** Every risk pill, halo, and stripe is also labelled with text/icon. WCAG-AA against white and `--navy-900`.
- **Frosted-glass panels** use `backdrop-filter: blur(20px) saturate(140%)` over `rgba(255,255,255,0.88)` — see `hifi/styles.css` for the canonical `.panel` rule.
- **Live ingestion shimmer** is a 1.5s left-to-right gradient sweep on a 2px top border. Apply to any card whose backing job is `running`.
- **One MapLibre instance** for the lifetime of the SPA. Never re-create on route or filter changes.

## What this folder is NOT

- A working React app. The HTML is a static design preview — the components inside are written as React-flavored JSX for legibility, but they are not the production source. **Re-implement** them in `frontend/src/` following `wiring.md`.
- A pixel-perfect Figma export. Treat the hi-fi as the contract for layout, density, color, and behavior — not the contract for exact pixel measurements. When in doubt, the tokens in §2 of `wiring.md` and the spacing scale (4/8/12/16/24/32) win.
- Authoritative on backend shapes. The backend (`backend/app/api/routes/`) is the source of truth for response shapes. Every API call in `wiring.md` §7 references a route that exists today, except where flagged under §14 ("New endpoints to ADD").

## Questions or conflicts

If you discover backend behavior that contradicts `wiring.md`: **stop and surface the conflict**. Do not refactor the backend silently — flag it as a §14 follow-up.
