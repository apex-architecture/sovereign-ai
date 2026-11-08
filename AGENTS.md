# AGENTS.md

- Shared HUD primitives (Corners, Pip, Tag, PanelHead, Stat, timecode) live in `src/components/hud.tsx`; new pages compose these plus the `panel`/`rack`/`hud` utilities in `src/styles.css` so the whole studio keeps one visual language.
- `src/lib/apex/**` is synced from the operator's laptop-side repo; UI rebrands legacy wording at display time instead of editing those data files, to avoid merge conflicts.
- When a laptop sync breaks the typecheck, fix with the smallest edit (widen a schema type, drop an exact duplicate key) and never rewrite catalogue data, so the next sync still merges.
- Tool/stage honesty comes only from `src/lib/apex/connection.ts` (`CONNECTIONS`, `STAGE_CONNECTION`); UI never invents a "run" action for a tool whose depth is not `drivable`.
- The PIN gate's hidden operator email and localStorage keys keep their legacy `apex` names; renaming them would lock the operator out or lose saved favourites.
- Bundled concept stills are exported from `src/lib/stills.ts`; empty screens may show them only with a visible "Showreel" label, and real renders always replace them, so decoration never passes as output.
- The app shell (top bar, desktop side rail, mobile tab strip, status bar) lives only in `src/routes/__root.tsx`; pages render content only, so navigation stays in one place.
- App-side Replicate calls go through `src/lib/replicate-gateway.ts` (Lovable connector gateway); the linked key is a gateway connection key and fails against api.replicate.com directly.
- Visitors browse every page signed out; pages holding the owner's films use `OwnerWall`, and Generate opens the owner keypad, because each render spends the owner's money.
- The welcome gate (`src/components/DreamGate.tsx`) owns the four-tab intro (Architects, Vision, What it does, How to use); each tab's content lives in `src/components/gate/*Tab.tsx` and leaves the gate only through `useGate().go(route)`, so the gate never reappears after a link.
