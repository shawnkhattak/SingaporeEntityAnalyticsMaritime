# Instructions for Claude Code

You are implementing the SEAM V2 frontend rebuild. This folder (`design/`) contains the complete design handoff.

## Read in this order

1. **`wiring.md`** — the implementation contract. Every file to create, every API call, every component's wiring. Treat it as the source of truth for **how** to build. It is ~1700 lines; read it fully before opening a single source file.
2. **`README.md`** — short overview of what's in the folder and key decisions.
3. **`hifi/styles.css`** and **`hifi/parts.jsx`** — the canonical design tokens and shared primitives. Lift the tokens verbatim into `frontend/src/styles.css`.
4. **`SEAM V2 Hi-Fi.html`** — visual reference. Open in a browser to see all 17 artboards. The JSX inside is for legibility, not for direct copy-paste.

## Operating rules

- **Backend is frozen.** Do not modify `backend/app/api/routes/`, models, or schemas during this rebuild. If a feature in `wiring.md` needs a route that doesn't exist, list it under wiring.md §14 and stub the call site with a `TODO(api):` comment.
- **No new dependencies** beyond what's already in `frontend/package.json`. The wiring guide names the one acceptable exception (`html-to-image` for graph PNG export, if needed).
- **Inspectors slide from the LEFT** next to a 64px collapsed rail. Not the right. The older `design.md` in the repo root predates this decision — defer to `wiring.md` and the hi-fi.
- **Sanctions CSV upload lives only in the Operations Console.** The Sanctions inspector is read-only.
- **Migrate in PRs.** The 8-PR slicing in `wiring.md` §15 is the suggested order. Each PR should be independently shippable — don't break a route that works today.
- **One MapLibre instance** for the lifetime of the SPA. Never re-create the map on route or filter changes.
- **Polling pauses when the tab is hidden** — use the `usePoll` hook spec in `wiring.md` §11.3.
- **Risk colors are semantic only** — always pair with text or icon. WCAG-AA against `--white` and `--navy-900`.

## Definition of done

The acceptance checklist in `wiring.md` §16 is the bar. In particular:

- `npm run build` passes.
- Every existing route resolves; old anchors do not 404.
- Every entry in design.md §9 ("buttons that MUST appear") has a wired handler.
- No leftover references to the old palette (`#006d77`, `#83c5be`, `#d66a2d`).
- Sanctions API button triggers a confirm modal before calling.

## When stuck

If a backend behavior contradicts `wiring.md`: **stop and ask** before improvising. The wiring assumptions must stay in sync with the routes in `backend/app/api/routes/`.
