# 02 — Modules, Screens, Gaps, Cuts, Waves

Every count below was measured from disk on 2026-11-01 (branch `apex-platform`), commands stated
inline. Do not "fix" a number in this file unless you re-run the command and replace it.

**Measured counts (the brief said 45 modules; the file says 44):**

| What | Count | Command |
| --- | --- | --- |
| Modules declared in `MODULES` | **44** | `grep -c '    id: "' src/lib/apex/modules.ts` → 44 |
| Route `.tsx` files (incl. `__root.tsx`, `index.tsx`) | **15** | `ls src/routes/*.tsx \| wc -l` → 15 |
| Declared `route:` paths in modules.ts | **15** | `grep -o 'route: "[^"]*"' src/lib/apex/modules.ts` |
| Declared routes with a real file on disk | **11** | `/admin /broadcast /connect /cost /create /director /nominate /registry /theater /vault /verify` |
| Modules with `status: "live"` | **0** | `grep -c 'status: "live"' ...` → 0 (partial 15, planned 28, gated 1) |
| Registry rows on disk | **1109** | `grep -rho 'capability:' src/lib/apex/catalog \| wc -l` |
| Registry rows with `licenseVerified: true` | **0** | `grep -rc "licenseVerified: true" src/lib/apex/catalog/` → 0 in all six files; `R()` in schema.ts:133 hard-defaults false |
| CONNECTIONS rows | 12 (6 drivable, 3 file-exchange, 1 portal-only, 2 not-yet) | connection.ts:19-32 |
| Film stages wired | **9/10 — `dialogue` is empty** | connection.ts:39 `dialogue: []` |
| Drivers built in `buildDrivers` | 10 | drivers/index.ts:28 |
| `FOUNDATION_SET` | 9 ids, none `live` | modules.ts:444-453 |

---

## 1. The full module table (44 rows, measured)

`file?` = does the declared route exist as a `.tsx` on disk (never inferred from `status`).
"legacy" = the file exists but predates APEX (Supabase `render_jobs`/`influencers` UI, no ledger/psi wiring).
Kept/cut verdict refers to §5.

| id | purpose (short) | layer | engine | dependsOn | status field | file on disk? | screen it needs | keep |
|---|---|---|---|---|---|---|---|---|
| core | accounts, projects, shell | platform | both | — | partial | no route declared; `index.tsx` is legacy Foundry home | `/verse` becomes the real home | keep |
| psi | signing, receipts, integrity | trust | P | core | partial | **none** | `/psi` | keep |
| passport | portable creator identity | trust | both | psi | planned | `/passport` declared, **file missing** | `/passport` | keep |
| ledger | production evidence trail | trust | both | core, psi | planned | `/ledger` declared, **file missing** | `/ledger` | keep |
| verify | public receipt check, no account | trust | P | psi | planned | `/verify` **exists (161 ln, real APEX screen)** | none — polish | keep |
| rights | permissions, agreements, holds | trust | both | ledger, licenseguard | planned | none | panel inside `/ledger` | keep |
| licenseguard | ten-field licence truth | trust | both | registry | partial | none | render it as the `/registry` columns (already does) | keep |
| registry | master tech registry | intelligence | both | — | partial | `/registry` exists | none — real screen | keep |
| tools | pickable creative apps | execution | F | registry, licenseguard | partial | `/tools` declared, **file missing** | `/tools` | keep |
| connect | connector registry | execution | both | registry | partial | `/connect` exists | none — real screen | keep |
| models | model discovery/competition | intelligence | both | registry, connect | partial | none | — | **cut** |
| router | local/rent/API choice | intelligence | both | models, cost | planned | none | — | **cut** |
| cost | pre-run cost estimate | intelligence | both | registry | partial | `/cost` exists | none — real screen | keep |
| workflows | importable production graphs | execution | F | tools, connect | planned | none | stage panel in `/director` | keep |
| exchange | sell whole workflows | execution | F | workflows, marketplace | planned | none | — | **cut** |
| memory | story bibles, continuity | intelligence | F | core | partial | **none** | `/memory` | keep |
| agents | evidence-organising agents | intelligence | both | memory, ledger, router | planned | none | — | **cut** |
| discovery | finds/queues open tech | intelligence | both | registry, licenseguard | partial | none (discovery.ts 6.5 KB code) | panel inside `/registry` | keep |
| studio | optional creative workspace | platform | F | core, tools, workflows | partial | `/create` exists (legacy) | keep, wire to drivers | keep |
| film | script→shot→cut→master→delivery | execution | F | studio, memory, ledger, cost | partial | `/director` exists (legacy) | keep, wire to stages | keep |
| image | stills, key art | execution | F | tools | planned | none | — fold into film stages | **cut** |
| audio | music, mix, loudness | execution | F | tools | planned | none | — fold into film stages | **cut** |
| threeD | sets, previz | execution | F | tools | planned | none | — | **cut** |
| games | interactive production | execution | F | tools | planned | none | — | **cut** |
| writer | scripts with evidence | execution | F | memory | planned | none | — fold into film | **cut** |
| design | graphic/product design | execution | F | tools | planned | none | — | **cut** |
| photo | photography ingest | execution | F | tools, library | planned | none | — | **cut** |
| library | assets with rights record | execution | F | registry, rights | planned | `/vault` exists (legacy) | repurpose `/vault` | keep |
| storage | portable project storage | execution | both | connect | planned | none | — covered by connect+export | **cut** |
| cloud | optional rented compute | execution | F | connect, cost | partial | none (render.functions drive `/create`) | panel inside `/create` | keep |
| teams | studio roles, approvals | platform | both | core, ledger | planned | `/admin` exists (legacy) | — single operator + PinGate | **cut** |
| talent | matching by portfolio | platform | F | passport, ledger | planned | none | — | **cut** |
| marketplace | sell licensing/products | platform | F | rights, commerce, library | **gated** | none | — | **cut** |
| commerce | sales, invoices, splits | platform | F | connect, rights | planned | none | — off-platform | **cut** |
| publish | distribution connectors | execution | F | connect, ledger | planned | `/broadcast` exists (legacy) | repurpose `/broadcast` | keep |
| academy | courses | platform | F | library | planned | none | — | **cut** |
| challenges | competitions, verdict game | platform | F | core | partial | `/nominate` exists (legacy) | — | **cut** |
| grants | funding opportunities | platform | F | core | planned | none | — | **cut** |
| community | discussion, governance | platform | F | core | planned | `/theater` exists (legacy) | — `/theater` survives as the screening room under `film` | **cut** |
| research | intelligence feeding registry | intelligence | both | discovery | planned | none | — | **cut** |
| accessibility | captions, SR support | platform | both | tools | planned | none | — captions are the film `subtitles` stage (whisper+ffmpeg drivable) | **cut** |
| developer | APIs, SDKs, MCP doors | platform | both | connect, psi | partial | `/api` declared; only `api/public/render.ts` exists, no screen | — endpoint stays, module goes | **cut** |
| enterprise | org deployment, audit | platform | both | teams, ledger, developer | planned | none | — | **cut** |
| analytics | real-numbers intelligence | intelligence | both | ledger | planned | none | — queries `/ledger` when rows exist | **cut** |

Kept: **19**. Cut: **25**. (Verdict column: 19 keep / 25 cut; counted by hand against the 44 rows above.)

## 2. Dependency graph in buildable order

Blocks are three different diseases. A missing **screen** is an afternoon of JSX against code
that already exists. Missing **code** is a driver or server function. Missing **data** is a human
read or a stored artifact — nothing you can type into existence.

```
core ─┬─ psi ─┬─ passport ──── (talent, cut)
      │       ├─ ledger ─┬─ rights ─── marketplace (cut)
      │       │          ├─ analytics (cut)
      │       │          └─ verify (screen done; P engine)
      │       └─ verify
      ├─ memory ─ film
      └─ challenges/grants/community (all cut)
registry ─┬─ licenseguard ─┬─ rights
          │                └─ discovery
          ├─ tools ─┬─ image/audio/3D/games/design/photo (cut → film stages)
          │         └─ workflows ─ exchange (cut)
          ├─ connect ─┬─ storage (cut)
          │           ├─ cloud ─ publish
          │           └─ models (cut)
          └─ cost ─ router (cut)
studio(=/create) ─ film(=/director) ─ needs: tools + memory + ledger + cost
```

**Blocked only by missing screens** (code + data on disk, just no JSX):
`ledger` (ledger.ts, 112 ln), `passport` (passport.ts, 103 ln), `psi` (psi.ts, 130 ln),
`memory` (memory.ts), `tools` (MASTER_REGISTRY 1109 rows + CONNECTIONS), `rights` as a ledger panel.
`verify` proves the pattern is real: verify.fn.ts + verify.tsx shipped days ago.

**Blocked by missing code:**
`dialogue` driver (fish_speech — the one stage with no driver at all), ComfyUI per-stage graphs
(`connection.ts:24` "none stored yet"), workflows import/export, cloud cost wiring, publish's
PeerTube driver, ledger persistence in Supabase (ledger.ts is `node:crypto`, file-based only).

**Blocked by missing data:**
`licenseguard` — **0 of 1109** rows have `licenseVerified: true`; every permission is
"unverified" by contract (schema.ts:133). Nothing is cleared for client work until a human reads
licence text. `cost` — `STARTER_PRICES: []` (cost.tsx:17); paid stages cannot be quoted until the
operator types verified prices. Passport contributions cannot rise above `self-declared` until
ledger rows back them.

## 3. Screen inventory

The APEX screen pattern (measured from registry.tsx / connect.tsx / cost.tsx / verify.tsx):
header strip `APEX PLATFORM / <LAYER>`, Fact boxes rendering **counts computed from the lib
tables**, a table of rows with a colour-coded honesty column, cross-links, and prose that states
what the screen refuses to promise. Operator-gated screens mount inside `PinGate`
(Supabase session, `owner@apex-empire.app`, 4–10 digit PIN); `/verify` is the one door that must
never be gated — a recipient with no account is the product.

### New routes this blueprint requires

| Route | Renders (real data) | Refuses to render |
|---|---|---|
| `/ledger` | LedgerEvent chain for a project (ledger.ts kinds/actors), each row stamped "statement made" vs "event observed" | never upgrades a claim into verified fact; no rows invented for projects without artifacts |
| `/passport` | passport.ts export: public SPKI key, handle, contributions **with their `basis` label** | never displays/transmits the private key; `self-declared` never shown as confirmed |
| `/psi` | signing queue: sealed receipts, content hashes, anchor state | an unanchored record never shows anchor = pass; no batch signing without an operator PIN session |
| `/tools` | MASTER_REGISTRY ∩ CONNECTIONS: only rows with a drivable/file-exchange path, depth label from connection.ts | tools with `not-yet` depth never appear as pickable; unread licences never appear as cleared |
| `/memory` | story bible, characters, continuity rules, decisions (memory.ts), export button always live | never locks user data in — a version with no export path fails the screen |
| `/verse` | the 19 kept modules with **disk-verified** status (route-file check, not the status field) — the real home replacing the Foundry pitch | any module shown "live" without a route file on disk (doctrine #4); no pitch numbers |

### Existing routes, kept or repurposed

| Route | Verdict |
|---|---|
| `/registry` `/connect` `/cost` `/verify` | **keep — these four are the good screens.** Already render live table counts and refuse promises. |
| `/create` (studio) `/director` (film) | keep, then wire to drivers + stages + cost instead of raw RunPod polling |
| `/vault` (library) `/broadcast` (publish) `/theater` (film screening) | keep the files, relabel them as film/library surfaces; they still show legacy `render_jobs` data — that is acceptable until wave 2 |
| `/admin` | keep behind PinGate for operator functions only (teams module is cut) |
| `/nominate` `/beta` `/oracle` `/index` (Foundry pitch) | not module surfaces; leave standing for the old audience rails, exclude from `/verse` map |

## 4. Gap list

1. **Declared route, no file (3):** `/ledger` (planned), `/passport` (planned), `/tools`
   (partial — claims a route that does not exist). `/api` is declared for `developer` but only
   `api/public/render.ts` exists — an endpoint, not a screen.
2. **Built route, no module (3):** `beta.tsx` (74 ln), `oracle.tsx` (62 ln), and the Foundry
   `index.tsx` home — none of the 44 modules declares them. `render.ts` serves `/create` but is
   not declared by `cloud` either.
3. **Status field lying against disk in both directions:** `verify`, `library`, `community`,
   `teams`, `publish` are marked `planned` while their `.tsx` exists; `tools` is `partial` with a
   declared route that has no file. `psi`, `memory`, `discovery`, `licenseguard` are `partial`
   (code-only, correctly). **Doctrine #4 check: `grep -c 'status: "live"'` = 0 — nothing claims
   live without a route. Pass.** But FOUNDATION_SET has 0/9 live, so `foundationGap()` returns all
   nine — that is the honest headline.
4. **The brief's own number was wrong:** "45 declared modules" — measured 44 (modules.ts:21-433).
   Fix the count in 00-overview.md if it repeats the 45.

## 5. Cut list — 25 modules deleted from MODULES

The vision is one thing: **Film Verse — a film made here can be proven anywhere.** Anything that
serves an audience-of-strangers economy, a second creative vertical, or automation that can't be
audited is not v1. Deleting a declaration costs nothing; each file below is status planned/partial
with no APEX screen.

| Cut | Reason (one line) |
|---|---|
| models, router | cost+connect already state local-vs-rented; competition is marketing, not production |
| agents | an agent's word is a claim (ledger.ts); it earns nothing until psi/ledger prove rails |
| image, audio, writer | they are *stages* in connection.ts/FILM_STAGES, already drivable; separate modules double-declare the same work |
| threeD, games, design, photo | other verticals; blender/kdenlive stay reachable through connect+tools |
| storage | connect + the export duty on memory/library/vault cover it; a storage module is a billing plan |
| teams | one operator behind PinGate; client approval is one ledger event kind |
| talent, marketplace, commerce, exchange | supply, demand, and payment rails don't exist; marketplace was already `gated` — delete even the gate |
| academy, grants, challenges, community | audience-growth surfaces from the pre-APEX Foundry, not the film machine |
| enterprise, analytics, research, developer, accessibility | audit-for-whom / analytics-on-0-rows / research-duplicates-discovery / SDKs-for-what / captions = the `subtitles` stage (whisper, ffmpeg: drivable today) |

Kept 19 = trust spine (core, psi, passport, ledger, verify, rights, licenseguard) + rails
(registry, tools, connect, cost, discovery) + film engine (memory, studio, film, workflows,
library, cloud, publish).

## 6. Build sequence — three waves, binary gates

**Wave 1 — the proof spine gets its face.** Screens: `/psi`, `/ledger`, `/passport`, `/verse`;
rights panel in `/ledger`. All four are blocked only by missing JSX over code already on disk.
**Acceptance test (binary):** take one real file from disk, seal it through psi, and paste the
receipt into `/verify` twice — untampered must print PASS on signature+file, one flipped byte must
print FAIL. Any other pair of outcomes = wave not closed.

**Wave 2 — the demand side picks real tools.** Screens: `/tools`, `/memory`; wire `/create` +
`/director` to `buildDrivers`/`stageRoutes`; build the `dialogue` driver (or explicitly replace
fish_speech) and store at least one ComfyUI graph. **Acceptance test (binary):** from a `/tools`
click, produce one storyboard still and one SRT via real drivers, each landing as a ledger row
whose artifact hash re-verifies at `/verify`. Zero simulated outputs, zero hardcoded job JSON.
Fail on any stage that fakes the driver.

**Wave 3 — one film, publicly provable.** `/vault` `/broadcast` `/theater` repurposed; human
licence-reads for the ≤12 tools the pipeline actually touches (not all 1109 — only what Film Verse
drives); operator prices typed for the paid stages. **Acceptance test (binary):** one finished
film (≥1 min, all ten stages real) where every stage has a ledger event, the master hash passes
`/verify`, and one person **without an APEX account** reproduces the PASS on the free receipt.
Either that recipient verifies, or the platform is a demo. No scores anywhere in the gate —
each wave ends PASS / FAIL.

**Top three blockers, in order:** (1) `dialogue` has no driver — connection.ts:39, it stops wave 3
dead; (2) 0/1109 licence reads — nothing is cleared for client work, gate 3's honesty depends on
reading the ~12 tools actually used; (3) `/ledger` `/passport` `/psi` screens — 345 lines of
working code (ledger.ts 112 + passport.ts 103 + psi.ts 130) with zero JSX on top, and waves 2–3
both land their evidence there.
