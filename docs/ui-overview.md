# UI Overview

SEAM V2 is a map-first desktop analyst workspace. The map stays visible for investigative flows; inspectors and command surfaces float over it.

## Shell Layout

- **Command panel**: left-side navigation and map controls. It can collapse into an icon rail.
- **Inspector**: left-side detail/list panel for vessels, entities, ports, Risk & Sanctions, news, and evidence. It supports back, resize, and close actions.
- **Map canvas**: persistent MapLibre map for `/map` and inspector routes.
- **Full-canvas surfaces**: Operations and Roadmap intentionally replace the map.
- **Mobile gate**: narrow/mobile screens receive a desktop-optimized message instead of a partial mobile layout.

## Navigation

- `/map` is the default workspace.
- `/vessels` and `/vessels/:id` handle vessel list/search/profile.
- `/entities` and `/entities/:id` handle company/owner/operator/manager workflows.
- `/risk` is the unified Risk & Sanctions feed.
- `/news` shows RSS.app intelligence.
- `/ports` shows port activity where available.
- `/evidence/:id` shows raw source evidence.
- `/operations` handles ingestion and operational state.
- `/roadmap` explains product direction.

Inspector back buttons use real in-app history when possible. If a user lands directly on a detail route, the fallback is section-aware: vessel detail returns to Vessels, entity detail returns to Entities, and Risk-origin details return to Risk & Sanctions.

## Map Workspace

- Vessel markers are AIS-style triangles with heading/course rotation.
- Risk severity colors are available on first map load.
- Selecting one vessel fades other vessels and emphasizes the selected marker.
- Selecting an entity focuses all related vessels, fades the rest, and labels only the related vessels.
- Map centering accounts for open side panels so the selected vessel lands in free map space.
- OCEANS-X ports can be toggled when the live geo layer is available.
- The bottom map status strip slides to stay centered in the visible map area when panels open.

## Vessel Profile

The vessel panel is designed as a maritime intelligence profile, not a database table. It shows:

- Vessel identity: name, IMO, MMSI, call sign, flag, type.
- Current movement: coordinates, speed, course/heading, position age.
- Particulars: year built, tonnage, length, breadth, depth.
- Risk: top active flags, evidence IDs, source lists.
- Movements/position history and port calls.
- Source confidence and refresh actions.

## Entity Detail

The entity panel is one unified page instead of separate subtabs. It shows:

- Entity summary and quick stats.
- Unique related vessels, deduped by IMO.
- Relationship record count.
- Risk flags.
- Relationship records collapsed by default.
- Role badges on vessel cards when the same vessel has multiple roles.

## Risk & Sanctions

Risk and sanctions are merged into one feed because sanctions are a risk signal. Cards are grouped by vessel/entity and show:

- Overall severity and status.
- Connected alert count.
- Structured alert rows with icons.
- Sanctions list names in readable labels.
- Identity conflict values directly on the card.
- Evidence and View details actions.

## News

The news panel uses compact cards with title, snippet, time, source badge/logo, and original link. Tabs separate:

- All.
- Social.
- Watchlist.
- Maritime.

## Motion And Accessibility

- Motions are quick and subtle: panel open/close, route focus transitions, dropdowns, cards, buttons, loading, and success/error feedback.
- `prefers-reduced-motion` is respected.
- Icons have labels/tooltips where meaning is not obvious.
- Collapsed navigation has hover tooltips.
- Buttons use visible focus states.
- Risk is not communicated by color alone; labels and severity text are shown.
