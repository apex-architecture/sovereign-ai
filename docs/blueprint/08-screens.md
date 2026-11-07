# 08 — Screens and experience inventory

Product name on the door: **Sovereign AI Film Verse**. Build name in code: Film Forge (repo
`kawal393/lllppp`, branch `apex-platform`). This section covers surfaces only: what each screen is for, what it
reads, what it refuses to show, which screens are public, which are gated, and how the gate has to be rebuilt.

Nothing in this file edits `src/`, `scripts/` or `supabase/`. It states what those files do today and what the
surface must do.

## 0. Measured for this section (run the command, get the number)

| What | Measured | Command, run from `D:\ApexEmpire\films\lllppp` |
|---|---|---|
| Route files (`.tsx`) | **15** = 14 pages + `__root.tsx` | `ls src/routes/*.tsx \| wc -l` |
| Declared modules | **44** | `grep -c '    id: "' src/lib/apex/modules.ts` |
| Declared `route:` paths | **15**, of which **11** have a file on disk | `grep -o 'route: "[^"]*"' src/lib/apex/modules.ts \| sort -u` |
| Modules with `status: "live"` | **0** | `grep -c 'status: "live"' src/lib/apex/modules.ts` |
| `FOUNDATION_SET` ids | **8** (core, psi, ledger, passport, verify, licenseguard, registry, connect) | `sed -n '/FOUNDATION_SET/,/^];/p' src/lib/apex/modules.ts` |
| Connection rows | **12** — 6 drivable / 3 file-exchange / 1 portal-only / 2 not-yet | `grep -c '^  { toolId: "' src/lib/apex/connection.ts` |
| Film stages | **10 declared, 9 routed — `dialogue: []`** | same file, `STAGE_CONNECTION` |
| Registry rows | **1,109** | `grep -rho 'capability:' src/lib/apex/catalog \| wc -l` |
| Rows with a human licence read | **0 of 1,109** | `grep -rc "licenseVerified: true" src/lib/apex/catalog/` |
| Live database tables | **7** (`projects`, `render_jobs`, `gpu_endpoints`, `user_roles`, `influencers`, `votes`, `beta_signups`) | `grep -c "CREATE TABLE" supabase/migrations/20260531031841_*.sql` |
| `apex_*` tables drafted | **4**, **not applied**, referenced by **zero** code | `grep -rn "apex_ledger_events\|apex_receipts\|apex_passports\|apex_projects" src` → no hits |
| Routes wrapped by the PIN gate | **all 14** (PinGate mounts in `__root.tsx:132`) | read `src/routes/__root.tsx` |

**Two sibling-file corrections, stated once, not argued.**
1. `02-modules.md` line 20 says `FOUNDATION_SET` has **9 ids**. The file has **8** (command above). `01-spine.md` §4
   says 8. Use 8. `02-modules.md` should be corrected by its owner; nobody else may quietly change a sibling file.
2. `02-modules.md` §3 keeps `/theater` as the screening room; `10-cutlist-sequence.md` §1d freezes it with the
   `community` module. **This section keeps `/theater` gated**, because the Wave 1 gate in `10-cutlist-sequence.md`
   requires "a non-technical owner can press play" — there is no other press-play surface. This is an owner call
   (`10-cutlist-sequence.md` §4), logged here so the two files stop disagreeing silently.

---

## 1. Brand: the name, and where it sits against the APEX wordmark

**The product is "Sovereign AI Film Verse".** That is the name a stranger sees. It is not a schema rename.
`modules.ts`, `apex_*` tables, `apex-psi/1` receipt formats and the `src/lib/apex/` directory keep their names —
`01-spine.md` §7.3 already recorded the honest fact that a repo grep for "Film Verse" returns 0 matches, and that
naming the product is a surface decision.

**Four objects share this space. Do not say "it".**
1. **Sovereign AI Film Verse** — the product name, the public face. New in this blueprint.
2. **APEX** — the house mark, the maker. Stays in the nav as the small lockup `▮ APEX` and in `▮ APEX PLATFORM / <LAYER>`
   eyebrow lines already used by `registry.tsx`, `connect.tsx`, `cost.tsx`, `verify.tsx`.
3. **Film Forge** — the build/app name (`README.md:1`), plus the shot-list data in `src/lib/filmforge/`, plus the paper
   spec, plus the dead folder. Not a customer-facing product name. It does not go on the public surface.
4. **APEX INTELLIGENCE EMPIRE** — today's headline (`index.tsx:43`, `PinGate.tsx:80`, `OPERATOR_MANUAL.md:1`). It stays
   as the *operator console* title, never as the public product name. One house, one product, two titles, never swapped.

Wordmark mechanics today that must change: `<title>` is `lllpppp` (`__root.tsx:46`), og:title the same,
`apple-mobile-web-app-title` is `APEX`, and the nav reads `▮ APEX.EMPIRE` (`__root.tsx:96`).
Target: document title `Sovereign AI Film Verse — a film made here can be proven anywhere`; nav lockup `▮ APEX` with a
2-line product caption; `apple-mobile-web-app-title` = `Film Verse`. The og:image currently points at an
`*.lovable.app` preview URL (`__root.tsx:58`) — a preview link is not a brand asset and it will rot. Replace it with a
committed file under `public/`, or drop the tag. Do not generate a hero image with invented claims on it.

### 1.1 The first ten seconds (a first-time visitor, logged out, phone or desktop)

1. **Second 0–2.** Black field, mono type, one red block. Headline, four words or fewer, uppercase:
   `SOVEREIGN AI FILM VERSE`. No login box, no PIN pad, no "get started" wall.
2. **Second 2–5.** One sentence under it, in plain English: *A film made here arrives with a receipt any stranger can
   check for nothing, forever.* Nothing else in that sentence.
3. **Second 5–8.** Two buttons, both real doors, both public: `VERIFY A RECEIPT` (→ `/verify`) and
   `WHAT THIS ACTUALLY CONNECTS` (→ `/connect`). The third link is `/verse`.
4. **Second 8–10.** One honest number strip, printed from `connection.ts` at render time:
   `6 tools we can run · 3 we hand files to · 1 we only record · 2 not built · 1 film stage with no driver`.
   That strip is the whole pitch. It is measured, it is small, and it is why a reader believes the next number.

If a first-time visitor sees a PIN pad, the section fails. That is what ships today.

### 1.2 What must NOT be claimed on the public surface

Vocabulary comes from `09-legal.md` §9.5 and `01-spine.md` §4. This is a build rule for screen copy, not advice.

| Never printed publicly | Why | Write instead |
|---|---|---|
| "digital truth", "proves it's true", "verified as accurate", "proof of ownership" | a seal proves a statement was made and recorded, not that the statement is true (`01-spine.md` §4 refusal 1; `psi.ts:3-10`) | "evidence of what was declared" |
| "audit", "audited", "certified", "assurance", "compliance", "we are compliant" | named regulated practices (`09-legal.md` §9.5) | "independent verification service" |
| "anchored", "immutable", "permanent" without a witness receipt naming the digest | under-claiming and over-claiming are the same defect | "no anchor attached — verification is unaffected" (`psi.ts:119`) |
| "the standard", "industry standard" | only the Certification Mark clause may read as a mark, and only when the foundation issues it | "open verification protocol" |
| "guaranteed", "no risk" | ACL meaning; must wear refund terms instead | "free to check: sealing, verification, receipt export" |
| any tier price, any "from $X" | no verified price exists (`STARTER_PRICES = []`, `cost.tsx:21`); the $0.65 unit inside the checker is a test fixture (`scripts/apex-check.mjs:125`, `verifiedOn: null`) | "quotable only when every stage price is verified — the screen prints NOT QUOTABLE until then" |
| "connects 10,000 tools", "1,109 tools ready", any tool counter that reads as capability | 1,109 rows are *inventory*, **0 cleared for work**; drivable tools reachable on this machine right now = **1 of 6** (`04-connections.md` §0) | "1,109 rows catalogued. 0 licence-read by a human. 6 connections declared drivable." |
| "live" on any number not fetched at render time | `01-spine.md` §4: hardcoded theatre wearing "live" is forbidden | print the number with its source line, or label it a hypothesis |
| "makes your film in minutes", "one click to a finished film" | 0 of 9 routed stages complete with real drivers today — all return `blocked-by-licence` (`04-connections.md` §0) | "the machine work is wired; nothing runs for a client until a human reads the licence" |
| adoption / user / revenue numbers | realised revenue is zero (`01-spine.md` §5 G7); no stranger has verified a receipt (G9 = 0) | say nothing |
| "we will publish for you", auto-post, "distribute everywhere" | `publish` is portal-only; YouTube is a recorded URL, never an automated action (`connection.ts:29`) | "we record the published URL. A person clicks publish." |

---

## 2. PUBLIC surface — no login, no key, no card

Seven routes are public. Six exist as files, one (`/verse`) must be created. Every public screen reads **client-safe
code tables** or a table whose RLS allows anon read. No public screen may read `render_jobs`, `gpu_endpoints` or
`user_roles`: their policies are `TO authenticated`, so an anon query returns nothing and the screen would print an
empty grid it cannot distinguish from "no work exists" — that is theatre by omission.

| # | Route | File | Job |
|---|---|---|---|
| P1 | `/` | `src/routes/index.tsx` (rebuild) | the door: name, one sentence, two real doors, the honest depth strip |
| P2 | `/verify` | `src/routes/verify.tsx` (exists; must leave the gate) | the free door; paste a receipt, get pass / fail / cannot-check |
| P3 | `/verse` | new `src/routes/verse.tsx` | the module map with **disk-verified** status — the thing this platform actually is |
| P4 | `/connect` | `src/routes/connect.tsx` (exists) | honest depths, tool by tool, and the named `dialogue` hole |
| P5 | `/registry` | `src/routes/registry.tsx` (exists) | 1,109 rows, licence state, the written exit per row |
| P6 | `/cost` | `src/routes/cost.tsx` (exists; price entry moved behind the gate) | what a finished minute costs, and what is not yet quotable |
| P7 | `/beta` | `src/routes/beta.tsx` (exists; copy re-scoped) | inbound only: one email field. Not a feature tour, not an order form |

Not a screen, but public: `POST/GET /api/public/render` (`src/routes/api/public/render.ts`) — bearer-token endpoint for
the operator's own agents. It stays outside the UI gate by design and keeps its constant-time token check.

### 2.1 `/` — the door

* **Reads:** `src/lib/apex/connection.ts` (`CONNECTIONS`, `depthCount()`, `stageCoverage()`),
  `src/lib/apex/modules.ts` (`MODULES`, `foundationGap()`), `src/lib/apex/psi.ts` (`FREE_FOREVER`),
  `src/lib/apex/index.ts` (`MASTER_REGISTRY.length`). **Zero database tables.**
* **Primary action:** `/verify`. One button, and it must work with no account.
* **Empty state:** there is no empty state — the inputs are code tables and always have length.
* **Failure state:** if `connection.ts` fails to import at build, the page must fail loudly. A depth strip that
  defaults to zeros is a lie about a platform.
* **Refuses to render:** the legacy "PRODUCTION PIPELINE / 5 steps" block and the "LIVE INDEX / auto-promoted at 1,000
  votes" block from today's `index.tsx`. Those are the pre-APEX Foundry pitch and the frozen verdict game; they read
  `influencers` and `projects`, and they promise a five-step pipeline that has no stage behind it in the driver table.

### 2.2 `/verify` — the free door (the product's whole trust story)

* **Reads:** nothing from a table today. It posts the pasted JSON to `checkReceipt` (`src/lib/apex/verify.fn.ts`),
  which calls `verifySeal`/`canonical`/`sha256Hex` in `src/lib/apex/psi.ts`. When `apex_receipts` is deployed, an
  optional `?id=` lookup may read it — **PUBLIC-READ on that one table**, and only on the columns a verdict needs
  (`receipt_hash`, `content_hash`, `manifest`, `sealed_at`); never a row listing, never a search of other people's films.
* **Primary action:** `CHECK IT`.
* **Empty state:** the placeholder textarea already shows a valid-shaped example receipt. Keep it, and label it
  `EXAMPLE — these bytes will fail on purpose`, so a curious visitor who pastes it gets a FAIL and learns the tool works.
* **Failure state:** invalid JSON prints the parser message (already does, `verify.tsx:61`). A receipt whose key is
  not base64 SPKI must print `cannot-check`, not crash. No anchor attached must print `cannot-check`, never `fail`.
* **Refuses to render:** a login prompt, a signup, a "get your own seal" CTA, a price, a count of receipts checked, and
  any sentence saying the work is authentic, owned, lawful or true. It prints the three `notClaims` lines
  (`verify.fn.ts:56-60`) **above** the verdict boxes, not under them, so the limit is read before the green word.

### 2.3 `/verse` — what this actually connects (new)

* **Reads:** `MODULES` from `src/lib/apex/modules.ts`; per-module status computed **from disk, not from the `status`
  field**, by testing whether the declared route path exists in the generated route tree
  (`src/routeTree.gen.ts` is produced by the TanStack router plugin at build time — a declared route with no file is
  absent from it). Plus `depthCount()` and `stageCoverage()` from `connection.ts`, plus `foundationGap()`.
* **Primary action:** click any module → the screen that module owns, or its named blocker.
* **Empty state:** none; the map always has 44 rows.
* **Failure state:** if `routeTree.gen.ts` is stale, statuses read wrong. The page must print the module count and the
  route-file check count side by side (`44 modules · 11 declared routes have a file`) so a mismatch is visible, not
  silent.
* **Refuses to render:** any module shown as live without a file on disk. Nothing says "coming soon". No progress bar,
  no percentage, no "roadmap". The headline of this page is the gap, because 8 of 8 foundation modules are non-live and
  saying so is the reason the rest of the page is believed.

### 2.4 `/connect`, `/registry`, `/cost` (public read-only)

* `/connect` reads `connection.ts` only. It must not import `drivers/index.ts` — that file pulls `node:child_process`
  and GPU probes into the browser. Screen-vs-code parity is enforced by the checker, four mechanical detectors
  (`04-connections.md` §6), not by the screen. Keep the `dialogue` row printing `no driver — this stage stops the
  pipeline` (`connect.tsx:55`). Refuses to render: the word "integrated" for a file-exchange row, and "supports" for a
  portal-only row.
* `/registry` reads `MASTER_REGISTRY` (6 catalog files) and `CATEGORIES` (`schema.ts`). Refuses to render: a row
  presented as cleared. Today `cleared for client work` computes to **0** and that Fact box must stay red.
* `/cost` reads `src/lib/apex/cost.ts` pure functions. **Change required:** the "ADD PRICE" form in `cost.tsx:127-142`
  writes to `useState` — a typed price dies on reload. The public page becomes read-only arithmetic. Price entry moves
  to the gated quote desk, writing `apex_price_entries` (`07-data.md` §7.2.4). Refuses to render: any number for a
  tool with no verified `PriceEntry` (`estimatePaid` returns NaN, the row prints `no verified price`), and the phrase
  "per finished minute" without the arithmetic that produced it.

### 2.5 Pricing truth on the public surface

Only three prices may appear: **$0 for seal, $0 for verify, $0 for receipt export** — from `FREE_FOREVER`
(`psi.ts:14-19`), which is code, not copy.

Everything else is withheld or labelled:
* No tier prices. The FREE / CREATOR $9–15 / PROFESSIONAL $29–49 / STUDIO $99–299 / ENTERPRISE ladder is a rival-AI
  hypothesis from the vision corpus (group 5) and `00-MASTER.md` §3 says so. `10-cutlist-sequence.md` §1e cut four of
  the five tiers. **It does not go on a public page at all.**
* The only quotable arithmetic in the repo is the checker fixture: `20 × $0.65 = $13.00 ÷ 4 finished minutes =
  $3.25` (`scripts/apex-check.mjs:125-132`). The $0.65 is a test input whose own `verifiedFrom` is
  `"operator price sheet"` with `verifiedOn: null`. So **$3.25 is a hypothesis about a cash floor, not a measured
  price**, and if it is ever printed it prints with that line and the formula beside it. Do not put it on `/`.
* What the public cost page says instead: *nine stages run on your own hardware for zero cash; two need a price we have
  not verified; the screen prints NOT QUOTABLE until a human types it in.* That is already true behaviour.
* Cash floor per finished minute for the rented route (US$0.45–40, `00-MASTER.md` §3) is a range from remembered list
  prices. Labelled a hypothesis, kept off the landing page, re-verified before any quote.

---

## 3. OPERATOR console — every screen the full platform needs

The APEX screen pattern, measured off the four good screens (`registry` / `connect` / `cost` / `verify`):

1. Eyebrow line `▮ APEX PLATFORM / <LAYER>` in mono, red.
2. `<h1>` in uppercase, `font-black tracking-tighter`.
3. A row of `Fact` boxes whose numbers are **computed from the lib table in the same render** — never typed into JSX.
4. A table of rows with one colour-coded honesty column (red = missing, amber = partial, `text-emerald-*` = real).
5. A prose block naming what the screen refuses to promise, and cross-links to the two neighbouring screens.

Chrome: `brutal-border` (2px solid foreground), `brutal-card`, `neon-text`, tokens in `src/styles.css`
(`--radius: 0px` already forces zero radius everywhere). **No new class vocabulary is needed and none should be added.**

Eleven gated screens. Six exist; five are new.

### 3.1 New screens (code already exists; only JSX is missing)

**`/ledger` — the record of one film**
* Purpose: show the append-only chain for a project and the queue of rows that are still somebody's word.
* Reads: `src/lib/apex/ledger.ts` (`verifyChain`, `openClaims`, `deliveryPackage`, `canonical`) and, once the migration
  is applied and fixed per `07-data.md` §7.1.3, `public.apex_ledger_events` (`seq`, `project_id`, `kind`, `actor`,
  `statement`, `refs`, `epistemic`, `prev_hash`, `hash`).
* Primary action: **export the delivery package** (`deliveryPackage()`) — a file a buyer checks without an APEX account.
* Empty state: `no chain yet for this project — a ledger row appears when a stage runs or a person records a decision`.
  Never a seeded demo row.
* Failure state: `verifyChain` returns `{intact:false, brokenAt:n}` → the page shows row *n* in red and prints the
  recomputed hash against the stored hash. If `apex_ledger_events` is not deployed, the page says
  `TABLE NOT DEPLOYED — the chain below is the file on disk, not the database`. Those two states must look different.
* Refuses to render: upgrading a `claim` row into a verified fact; a `WAIT` instead of a `FAIL`; an edited row shown as
  original; any count of rows presented as a trust score.

**`/passport` — the creator's portable record**
* Purpose: mint and show a passport the creator can export, with every credit labelled by its basis.
* Reads: `src/lib/apex/passport.ts` (`generateIdentity`, `newPassport`, `deriveContributions`, `standing`,
  `exportPassport`, `importPassport`) + `public.apex_passports` and `public.apex_contributions` (`07-data.md` §7.2.3)
  when deployed.
* Primary action: **export JSON**. The button is live before anything is filled in.
* Empty state: `0 contributions. 0 checkable. This is a handle and a key, not a credential yet.` — the exact sentence
  `standing()` produces, not a friendlier one.
* Failure state: an import whose `format` is not `apex-passport/1` → refuse with the parser's reason. An import that
  carries `privateKey` or `privateKeyPem` → refuse hard (`passport.ts:83` already throws); the screen must surface that
  message, never swallow it.
* Refuses to render: the private key, in any form, ever; a `self-declared` credit styled like a confirmed one; a
  gallery of other people's passports (no table rows exist, and a directory of zero is theatre).

**`/psi` — the seal desk**
* Purpose: the signing queue — seal a finished artifact, name its bytes, attach an anchor only with a real proof.
* Reads: `src/lib/apex/psi.ts` (`seal`, `verifySeal`, `attachAnchor`, `batchRoot`, `describeScope`, `FREE_FOREVER`) +
  `src/lib/apex/memory.ts` for what was tried + `public.apex_receipts` when deployed. The private key arrives per call
  as an argument and is never stored (`psi.ts:64`).
* Primary action: **SEAL THIS FILE** — takes the content hash, the manifest fields, and a key the operator supplies.
* Empty state: `0 receipts sealed from this browser.` plus the one line that says sealing costs $0 and always will.
* Failure state: `attachAnchor` throws when the proof string is under 16 chars (`psi.ts:105`) — the screen shows the
  throw verbatim and keeps the receipt unanchored. No "pending anchor" state anywhere.
* Refuses to render: a receipt stamped "anchored" with no witness receipt naming the digest; a batch presented as
  per-record anchoring; a seal over a file whose hash was not computed by the caller.

**`/tools` — the pickable list**
* Purpose: what a creator can actually choose right now, as the intersection of the registry and the connection table.
* Reads: `MASTER_REGISTRY` ∩ `CONNECTIONS` (`connection.ts`), depth from `connection.ts`, licence state from
  `schema.ts` `isClearedForWork()`. When `apex_tools` deploys, it becomes the write side.
* Primary action: pick a tool for a stage → jumps to `/director` with that stage armed.
* Empty state: real and expected — `0 tools are cleared for client work. 1,109 rows catalogued, 0 licence-read.` The
  empty state *is* the message.
* Failure state: a tool row with a declared depth and no driver is not shown as pickable; it shows
  `declared, no driver object` and links to `/connect`.
* Refuses to render: any `not-yet` row as pickable, any unread licence as cleared, and the 1,000-odd frozen inventory
  rows in the same list as the ~12 the pipeline touches (they stay counted in the checker, they do not crowd the door).

**`/memory` — what we already learned**
* Purpose: decisions, observations, failed attempts, look references, outages, cost outcomes, licence findings.
* Reads: `src/lib/apex/memory.ts` (`remember`, `recall`, `dontRepeat`, `licenceFindings`, `exportMemory`,
  `importMemory`) + `public.apex_memory_entries` when deployed.
* Primary action: **write one entry** before spending money on a run, and **export everything** as
  `apex-memory/1` JSON.
* Empty state: `no entries. Search returns nothing, so every run looks new. That costs money.`
* Failure state: an import with the wrong `format` throws `unknown memory format` and must print it. `dontRepeat()`
  returning zero rows must print `no recorded failure — that is not the same as no risk`.
* Refuses to render: a version of itself without a live export button; a similarity score (recall is deliberately
  substring — `memory.ts:55-60`); an agent-written summary styled as a fact.

**`/quotes` (a panel inside `/admin`, not a new route)** — the quote desk
* Purpose: the only place a number becomes quotable.
* Reads: `src/lib/apex/cost.ts` `PriceEntry`; writes `public.apex_price_entries` (`07-data.md` §7.2.4) once deployed.
  Until then it is a **read-only mirror of nothing** and must say so instead of pretending to save.
* Primary action: add a price with its `verifiedFrom` and `verifiedOn`; `judgeBudget()` then flips to QUOTABLE only when
  `unknownPrices` is empty.
* Empty state: `0 verified prices. Every paid stage is unquotable. This is the gate working.`
* Failure state: a price typed without a source → the form refuses; `verifiedOn: null` is allowed only with an explicit
  `unverified` badge, and `judgeBudget` still prints NOT QUOTABLE.
* Refuses to render: a client-facing quote built off a remembered figure, and any price that changes what a receipt may
  say (no fee changes a finding — `05-business.md` §5 law 3).

### 3.2 Existing gated screens, kept or repurposed

**`/create` — one run** (keep; wire, don't rebuild)
* Reads today: `render_jobs` (`owner_id`, `status`, `prompt`, `response_log`, `external_job_id`), direct
  `startCloudRender`/`pollCloudRender` to Replicate. **Target:** `src/lib/apex/orchestrate.ts` `runStage()` so the
  licence gate and the price cap have a caller — `00-MASTER.md` §5 names the bypass as a live danger, and `runStage`
  currently has **no production caller** (`04-connections.md` §0).
* Primary action: run one stage through the door. Empty state: `no jobs owned by this account.` Failure state: a job
  that failed prints `FAIL` with the attempt log verbatim, never `WAIT`, never a spinner that outlives the poll loop.
* Refuses to render: a style-picker that implies a working graph — `connection.ts:24` says ComfyUI has
  "a saved graph per stage — none stored yet". No graphs stored means no stills promised.

**`/director` — the ten stages** (keep; this is the spine)
* Reads: `STAGE_CONNECTION` + `src/lib/apex/drivers/index.ts` `stageRoutes()` through the server; when deployed,
  `apex_scenes`, `apex_shots`, `apex_jobs`, `apex_job_attempts` (`07-data.md` §7.2.1–7.2.2). Today it writes `projects`
  and `render_jobs` with a hand-built ComfyUI JSON graph (`director.tsx:15-26`) that is a guess, not a stored graph.
* Primary action: dispatch a stage, read the `StageRun` (`done` / `needs-human` / `failed` / `blocked-by-licence`).
* Empty state: `0 shots.` Failure state: the `dialogue` stage must be visible and named — `no driver — this stage stops
  the pipeline` — and the run must say `admitted handoff` or `failed`, never silently skip.
* Refuses to render: a green tick on a stage whose artifact hash was not recomputed, and a nine-stage progress bar that
  hides the tenth.

**`/vault` — assets with their rights record** (keep, repurpose)
* Reads today: `render_jobs` (500 rows, plus `localStorage` favourites). Target: `apex_assets` joined to
  `apex_licences` / `apex_licence_reads`, plus `sha256` per asset from `psi.ts`.
* Primary action: export the asset list with the licence state beside every file. Empty state: `0 assets with a hash.`
* Failure state: an asset whose file is gone prints `named in the record, missing on disk` — that is a real class and it
  must not be filtered out.
* Refuses to render: an asset shown as usable when its licence row is unread, and a `favourites` list that lives only in
  one browser's `localStorage` presented as a library.

**`/theater` — press play** (keep, gated; see the §0 correction note)
* Reads: `render_jobs` where `status = done` and `response_log.url` exists.
* Primary action: play the finished cut. Empty state: `no completed render owned by this account.`
* Failure state: a dead or expired provider URL must show as a dead frame with the URL, not as a black player.
* Refuses to render: a stock or placeholder frame. A zero-item queue is the honest first screen.

**`/broadcast` — publish, honestly** (keep, repurpose)
* Reads: `render_jobs` for the URL; `connection.ts` for the YouTube row (`portal-only`); writes the published URL as a
  ledger `publication` event when `apex_ledger_events` deploys.
* Primary action: copy the URL and the delivery spec. **Nothing on this page posts anything.**
* Empty state: `nothing finished.` Failure state: `PeerTube: not-yet — no server, no driver` printed from the table,
  not hidden.
* Refuses to render: the Twitter/Reddit/Facebook sharer buttons in their current form — they are an audience rails from
  the pre-APEX build, and `10-cutlist-sequence.md` §1d freezes that game. Keep download, keep copy-URL, keep the
  record-the-URL action.

**`/admin` — operator control** (keep, gated)
* Reads: `gpu_endpoints` (name, `api_url`, `status`, `latency_ms`, `cost_per_minute`), `render_jobs`, `projects`,
  `user_roles`, `influencers`, `beta_signups`. Target: `apex_tools`, `apex_price_entries`, `apex_licence_reads`.
* Primary actions: register an endpoint, run a licence-read queue, enter verified prices, seal the PIN (see §4.4).
* Empty state: `0 endpoints. The local runner needs ffmpeg on PATH; nothing else is reachable on this machine` — which
  is the measured truth: **1 of 6 drivable tools reachable today** (`04-connections.md` §0).
* Failure state: the "Ping" button currently does `fetch(url, {mode:'no-cors'})` and marks an endpoint `active` on a
  response it cannot read (`admin.tsx:110-114`). That is a fake green. It must probe the URL our own files name and
  report what the probe returned, or say `unknown`.
* Refuses to render: the endpoint URL or any token in a query string, in a log, or in a job record
  (`replicate.ts:99` `redact()` is the pattern; `07-data.md` §7.6 is the rule).

**`/nominate` and `/oracle`** — frozen (`10-cutlist-sequence.md` §1d). Keep the files, remove them from every nav, and
leave the routes returning `404`/`GONE` rather than a live verdict game. `/nominate` writes `influencers` and `votes`
with **anon insert permitted by RLS** (`CREATE POLICY "anyone nominates" ... WITH CHECK (true)`), so an unauthenticated
stranger can create rows — which is exactly why it must not sit on a public front door.

**`/beta`** — public, re-scoped to one inbound field (`10-cutlist-sequence.md` §1d: "may only ever be the paid-anchor
order door, never a feature tour"). It writes `beta_signups` (anon insert allowed, admin read — the RLS is already
correct for that). Copy must stop promising "keys to the foundry" and must not become an order form until `apex_orders`
-style money rails and a payment processor exist (`01-spine.md` §5 G7: none exists).

---

## 4. Public vs gated, and the gate restructure

### 4.1 The defect being fixed

`__root.tsx:130-138` mounts `<PinGate>` around `<NavBar/>` and `<Outlet/>`. Consequences, all live today:
* A stranger cannot reach `/verify`. The one screen that must never require an account requires a PIN.
* Every public page first paints a full-screen PIN form (`PinGate.tsx:77`), so the platform's actual capability is
  invisible to the only audience that matters.
* `robots: noindex,nofollow` (`__root.tsx:53`) is applied to all routes, so search engines are told to ignore the free
  door forever.
* The PIN pad is the operator's own front door and it must stay exactly as capable — this restructure may not add an
  email, a password reset, or a recovery path. Single-operator, no recovery, stays (`OPERATOR_MANUAL.md:30`).

### 4.2 Target structure (URLs do not change)

TanStack Start supports a **pathless layout route**: a file or folder whose segment starts with `_`. Pages moved under
`src/routes/_operator/` keep their public URL — `/create` stays `/create` — because pathless segments are stripped from
the path and only add a layout wrapper.

```
src/routes/__root.tsx            no PinGate, no nav; QueryClientProvider + Toaster + <Outlet/>
src/routes/index.tsx             PUBLIC  landing
src/routes/verify.tsx            PUBLIC  free door
src/routes/verse.tsx             PUBLIC  new map
src/routes/registry.tsx          PUBLIC  read-only
src/routes/connect.tsx           PUBLIC  read-only
src/routes/cost.tsx              PUBLIC  read-only (price entry removed)
src/routes/beta.tsx              PUBLIC  one inbound field
src/routes/_operator.tsx         layout: <PinGate><OperatorChrome><Outlet/></PinGate>
src/routes/_operator/create.tsx      ... every gated page from §3, file moved, URL identical
```

Two chrome pieces, selected by the layout they live in: `PublicChrome` (wordmark `▮ APEX` + caption, links to
`/verify` `/connect` `/registry` `/cost` `/verse`, and one quiet `OPERATOR` link to `/_operator/...`), and
`OperatorChrome` (the 15-link nav from `__root.tsx:98-113`, plus the `▮ Lock` sign-out button).

Head metadata splits too: `noindex,nofollow` and the lockup `APEX INTELLIGENCE EMPIRE` stay on `_operator` routes;
public routes get the product title, a real description, and no `noindex`.

**Verify this before believing it.** After the move, open `src/routeTree.gen.ts` and confirm the ids read
`/_operator/create` etc. and that the router still registers `/create`. If the file move fights Lovable's sync, the
fallback is cheaper and uglier: leave every file where it is, delete `<PinGate>` from `__root.tsx`, and wrap each
gated page's component in an exported `<OperatorGate>` component while `index.tsx` / `verify.tsx` / `verse.tsx` /
`registry.tsx` / `connect.tsx` / `cost.tsx` / `beta.tsx` render without it. Same outcome, 15 small edits, no route-tree
risk. Pick one, not both.

**Say what the gate is, honestly.** `PinGate` is a *UI* gate: it holds a Supabase session for one identity
(`owner@apex-empire.app`, PIN → password). The real boundary is row-level security plus server functions. Anon reads of
`render_jobs`, `gpu_endpoints` and `user_roles` are already refused by policy; anon reads of `projects`, `influencers`
and `votes` are already allowed by policy (`USING (true)`), which is a defect, not a protection. So:
* moving a page outside `PinGate` does not expose data that RLS protects, and
* moving a page inside `PinGate` does not protect data whose policy says `USING (true)`.
`legacy projects` public-read must be closed (`07-data.md` §7.3.2) before anything that reads `projects` goes public.

### 4.3 The live defect the gate layer must handle: `resetOwner` is unauthenticated

`src/lib/gate.functions.ts:17-27` — `resetOwner` is a `createServerFn({ method: "POST" })` whose **only** check is a
zod validator for `{ confirm: "WIPE" }`. That literal is readable in the shipped bundle (`PinGate.tsx:144`). There is no
session check and no admin check in the handler. The function then lists up to 100 `auth.users` and deletes every one
of them with the service-role client. Any anonymous HTTP POST with that body wipes the operator identity — and today it
already can, without needing a public door, because a `createServerFn` POST endpoint is directly reachable. Once
creator accounts exist, the same single request deletes every account on the platform. Cascade consequences are named
in `07-data.md` §7.1.1/§7.2. The correct in-repo pattern already exists: `api/public/render.ts:31-42` does a
constant-time bearer comparison inside the handler.

What the gate layer must do, in this order, before any public surface ships:
1. **Refuse anon.** Inside the handler, resolve the caller (`supabase.auth.getUser()` from the request's session, or a
   verified admin JWT) and return a plain error when there is none. One request from an anon client must wipe nothing.
2. **Scope the delete.** Delete exactly the `owner@apex-empire.app` identity, never "every user page 1..100". A
   single-operator app has one identity to destroy; the current code is a platform-wide data-destruction primitive.
3. **Never mount it publicly.** The "Forgot PIN? Wipe & re-seal" control exists only inside `_operator`, and only on the
   unlock screen. A public page must not render the button, must not ship the literal, and must not import the function.
4. **Accept the consequence.** With step 1 in place, a forgotten PIN has no in-app path. That is a deliberate
   trade and it belongs to the owner (`OPERATOR_MANUAL.md:30` already sells wipe-and-reseal as the recovery story). The
   honest options are: (a) an out-of-band owner-only step — the operator runs the delete against their own Supabase
   project locally, documented as an owner-only decision alongside `10-cutlist-sequence.md` §4 items 2/8; or (b) a
   recovery code generated at seal time, shown once, stored only as a hash, which is what "no recovery" was refusing.
   **Pick one; do not leave the hole open by defaulting to (b) silently.** This section recommends (a) — it preserves the
   single-architecture doctrine and closes the anon wipe with no new credential to lose.
5. **Record it.** A wipe appends one event (`kind: "retraction"`, actor `system`, statement "owner identity reset,
   N users deleted") to the ledger once `apex_ledger_events` exists, so the event is not the only thing the platform
   forgot.

### 4.4 Route classification table (the answer to "which routes are public vs gated")

| Route | Class | Why | Gate change needed |
|---|---|---|---|
| `/` | PUBLIC | the front door | remove PinGate; rebuild as the door |
| `/verify` | PUBLIC | the product's promise to a stranger | remove PinGate — highest-value single change |
| `/verse` | PUBLIC | honest scope, measured | new file, outside `_operator` |
| `/registry` | PUBLIC | inventory + licence truth is a selling point | remove PinGate |
| `/connect` | PUBLIC | depth honesty is the pitch | remove PinGate |
| `/cost` | PUBLIC (read-only) | pricing truth | remove PinGate; move price entry to gated `/admin` |
| `/beta` | PUBLIC (inbound) | self-serve, never chased | remove PinGate; re-scope copy |
| `/api/public/render` | PUBLIC endpoint | bearer token, machine door | no UI gate; add `runStage` routing |
| `/create` | GATED | spends money, owns jobs | move under `_operator` |
| `/director` | GATED | writes shots + jobs | move |
| `/tools` | GATED (until `/verse` proves it) | pick-and-run | create under `_operator` |
| `/memory` | GATED | the operator's own cost ledger of lessons | create under `_operator` |
| `/vault` | GATED | reads `render_jobs` (auth-only RLS) | move |
| `/theater` | GATED | same | move |
| `/broadcast` | GATED | same | move |
| `/ledger` | GATED | production evidence, private by default | create under `_operator` |
| `/passport` | GATED until export is the point | private key handling | create under `_operator` |
| `/psi` | GATED | signing; no batch signing without a PIN session | create under `_operator` |
| `/admin` | GATED | endpoints, overrides, wipe control | move |
| `/nominate` | FROZEN (unpublished) | growth theatre; anon-writable tables | nav removal + route offline |
| `/oracle` | FROZEN (unpublished) | not a module surface | nav removal |

Arithmetic, checked by hand: 7 public routes + 11 gated + 2 frozen = 20 routes, plus the 1 public endpoint = 21
surfaces. Of those 20 routes, **14 already exist as files** and **6 are new** (`verse`, `tools`, `memory`, `ledger`,
`passport`, `psi`), so 6 new page files + 1 new layout file (`_operator.tsx`) = 7 files to create, and 11 files to move.

---

## 5. Visual direction with **zero new npm dependencies**

Do not add anything to `package.json`. The project has a vite peer-dependency conflict and `npm i` already takes six
minutes to add 483 packages (`npm-install.log`). Banned outright: three.js, `@react-three/fiber`, babylon, GSAP,
framer-motion, lottie, swiper, lenis, `@react-spring`, any webgl helper. What is already available and fair game:
Tailwind v4 + `src/styles.css` tokens, `tw-animate-css`, plain CSS (`@keyframes`, `transform`, `perspective`,
`clip-path`, `mask`, gradients), inline SVG, canvas 2D (browser built-in), React 19, `lucide-react`,
`embla-carousel-react`, `recharts`, `input-otp`, `vaul`, `cmdk`.

Global rules, already enforced by tokens: `--radius: 0px` (zero radius everywhere), neon red `oklch(0.62 0.25 25)`,
mono body type, uppercase headings at `font-weight: 800`, hard 2px borders. A hard `box-shadow: 4px 4px 0` is brutalist
and allowed; a soft blurred shadow is not. `prefers-reduced-motion` must kill every animation on this surface —
Tailwind's `motion-safe:` / `motion-reduce:` variants do it with no dependency.

**Hero motion.** Two stacked mono lines; the red line reveals with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`
over ~700ms, one pass, then it stops. Genuinely rendered: real DOM text, real CSS compositing. Faked: nothing. It must
not loop, not drift, and not respond to scroll.

**The verse map (the "3D-ish" one).** A container with `perspective: 900px`; inside it a grid of `brutal-border` cards
with `transform: rotateX(55deg) rotateZ(-8deg) translateZ()` per layer; hover brings one card flat. Each card is a real
`<Link>` whose label and colour come from `MODULES` and the route-file check. Genuinely rendered: the browser composites
a real 3D transform on real DOM nodes; the tilt, the parallax offset and the flat-on-hover are all actual geometry.
Faked, and stated as faked: there is **no depth buffer, no lighting, no occlusion, no camera, no physics**. Node
positions are the dependency lists in `modules.ts` laid out by hand, **not** a force simulation, so a link crossing is
layout, not a discovery. If someone asks "is that 3D?" the answer is: *it is a flat diagram the browser tilts.*

**Film strip.** A horizontal `overflow-x` strip with `scroll-snap-type: x mandatory`, perforations drawn as two
`repeating-linear-gradient` bands top and bottom, each frame a real cell. Genuinely rendered: scroll-snap is native;
`embla-carousel-react` is already a dependency if drag is wanted. Faked, and stated: the strip's cell count must equal
the number of artifacts actually present; it is **not** 35mm geometry and it is **not** frame-accurate to 24fps. With
zero artifacts the strip shows one empty cell reading `0 frames on disk` — never a stock image, never a grey placeholder
frame.

**Scanline.** One fixed overlay `<div>` with `pointer-events: none`, a `repeating-linear-gradient` 1px line every 3px
at `opacity: .07`, plus one slow `background-position` drift on the hero panel only. Genuinely rendered: a CSS gradient.
Faked, and stated: it means nothing. It is CRT mood, **not** a signal, a status, a heartbeat or a live indicator, and it
must never be placed over a number a reader could mistake for a telemetry readout. Comment the line in CSS to that
effect.

**One more motion rule, because it is the defect class the estate already condemned** (`01-spine.md` §4, the
"hardcoded theatre wearing live" ban): no animated counters, no counting-up numbers, no pulsing "live" dots, no fake
queue activity, no traffic-shaped sparkline. Every number on every screen appears at its final value in the first paint,
sourced from the table named in §3.

---

## 6. Per-screen acceptance test — a 60-second eyeball, PASS or FAIL

Binary only. The owner looks at the visible frame and answers yes or no. No score, no review of the pipeline. Each test
is done logged **out**, in a normal browser window, unless it says "signed in".

| Screen | What he does in 60 seconds | PASS | FAIL means |
|---|---|---|---|
| `/` | Open the site cold, in a private window. Read the top of the page. | No PIN pad appears. The words "Sovereign AI Film Verse" are the biggest thing on screen. One line of plain English under them. Two buttons: verify, and what-we-connect. | A PIN pad appeared → the gate was not moved. Or the headline is "APEX INTELLIGENCE EMPIRE" → the house mark is wearing the product's coat. |
| `/` (strip) | Read the number strip. | It says 6 / 3 / 1 / 2 and names the `dialogue` hole in the same glance. | Any bigger number, any "10,000 tools", any counter that animates. |
| `/verify` | Paste a receipt from disk, press CHECK IT. Then paste the same receipt with one byte flipped in the signature. | First run: `pass` on signature. Second: `fail`. The "what this does not prove" lines are visible **above** the verdict. No login asked. | It asked for an account, or the tampered one still says pass, or the limits sit at the bottom nobody scrolls to. |
| `/verse` | Look at the map. | The red ones outnumber the green ones and the page says so in one sentence. | Anything glows that has no screen behind it. |
| `/registry` | Read the four top boxes. | "cleared for client work" reads **0** in red. | A non-zero green 0-box, or the box is missing. |
| `/connect` | Read the depth column. | `not-yet` rows are visible in red and no row uses the word "integrated". | A file-exchange tool described as connected. |
| `/cost` | Read the paid rows with no price entered. | Two rows print `no verified price` and the verdict box says **NOT QUOTABLE**. | Any dollar figure appears without a typed source. |
| `/beta` | Read the headline. | One email field. No feature list. | A tour of screens, or a price. |
| `/create` (signed in) | Press run on one stage. | The result says which tool ran, or `blocked-by-licence`, or `needs-human` — in those words. | A spinner that never resolves, or a green tick with no file behind it. |
| `/director` (signed in) | Look at the ten stage rows. | `dialogue` is on screen and reads as the hole it is. | Nine rows, or a tenth that looks finished. |
| `/ledger` | Open a project's chain. | The rows print "statement made" vs "event observed", and an export button is live. | Rows that all look equally certain, or no export. |
| `/passport` | Try to make one. | The private key is shown once, or not shown at all — and never stored. Export works on an empty passport. | Any key sitting in the page after reload. |
| `/psi` | Seal a file you know the hash of. | It names the hash it sealed. If you ask to anchor without a proof, it refuses in words. | An "anchored" badge with nothing attached. |
| `/tools` | Scroll the list. | Only tools with a real path appear, each wearing its depth. | A `not-yet` tool you can click. |
| `/memory` | Search a stage that failed. | The failed attempt returns, with its reason. | An empty answer presented as "no issues". |
| `/vault` | Count the tiles. | The count matches the frames that exist, including zero. | Placeholder art. |
| `/theater` | Press play. | Something plays, or the queue says `0 completed renders owned by this account`. | A black player that looks like a bug. |
| `/broadcast` | Look for a publish button. | There isn't one — only copy-URL and download. | Anything that posts on its own. |
| `/admin` | Read the endpoint row. | Ping tells you plainly what it could not see. | A green `active` next to an unprobed URL. |
| `/nominate`, `/oracle` | Type the URLs. | They are not in any nav and are not live. | A public voting game on a product front door. |
| gate integrity | Sign in with the PIN from the operator link, then open `/` and `/verify` in the same browser. | The operator nav and the public pages coexist; the PIN screen never blocks a public page; the lock button still works. | Public pages behind the PIN again, or the operator losing his own door. |

---

## 7. Screens that must NOT be built (theatre over an empty database)

Rule: a screen exists only if it has data it can actually read. `apex_*` tables are **drafted, untracked, unapplied and
referenced by zero code** (`07-data.md` §7.1.2). `status: "live"` appears **0** times in `modules.ts`. Realised revenue
is zero (`01-spine.md` §5 G7). Third-party citations: zero (G9). So the honest first state of most dashboards is an
empty grid — which is precisely what makes a dashboard a lie.

| Do not build | Why it would be theatre | What unlocks it |
|---|---|---|
| An analytics / insights dashboard | `analytics` module is planned, and the ledger already prints every real number; a second number-machine invites invented ones (`10-cutlist-sequence.md` §1a) | never, while the ledger screen exists |
| A receipt counter or "N films sealed" ticker | `apex_receipts` is not deployed; the true count is 0 from this repo | the table, applied, with ≥1 real receipt |
| A public film gallery / showreel | `render_jobs` is authenticated-only by policy; anon gets an empty grid that reads as "no art exists" | a deliberate public-read asset table, plus real films |
| A public GPU / render-farm monitor | `gpu_endpoints` is authenticated-only; the measured reachable-drivers number is 1 of 6 | the operator surface only — never public |
| A passport directory or "browse creators" | `apex_passports` undeployed, 0 rows; 0 contributions can be non-self-declared today | ≥1 passport with a ledger-backed credit |
| A client review/approval portal | `apex_projects` undeployed, `visibility` unenforced, `created_by` nullable defeats owner policies (`07-data.md` §7.1.3d) | the migration fixed and applied |
| An orders / checkout / pricing-page-with-tiers | no payment processor exists anywhere; the tier ladder is a rival-AI hypothesis | owner decision: the price, the channel, the processor |
| A marketplace, workflow exchange, or "sell a workflow" screen | no supply and no demand; `marketplace` was already `gated` | after sale #1, as an owner decision |
| A teams / roles / invites screen | one operator, one PIN; `user_roles` exists for a second head that was refused | never for this arm |
| An "AI agents working for you" screen | `runStage` has no production caller; an agent's word is a claim, not a worker | drivers wired into the door, then a queue |
| A model-competition / router leaderboard | `EVAL_AXES` exist but **0 bake-offs** have been run; a ranking with no evidence is marketing | the first real bake-off with a `promptSetHash` |
| Academy, grants, community, events, talent-matching pages | audience-and-funding surfaces from the closed bucket (`01-spine.md` §4 refusal 4 and 7) | not unlocked by a screen |
| A "10,000 tools connected" or catalogue-completion progress bar | 1,109 rows catalogued, 0 read; a progress bar implies a plan with a date | print the count and the 0, as `/registry` already does |
| A settings page for retention, policies, enterprise SSO | `enterprise` planned; no org exists | not this arm |
| A legal/terms/privacy page with invented promises | `09-legal.md` §9.8 lists what must go to a lawyer first | a lawyer's answers, then a page |

---

## 8. Build order for the surface (three moves, then stop and look)

1. **`/` + `/verify` out of the gate.** The smallest change with the largest consequence: it turns the free door from a
   gated internal page into the product's public face, and it fixes `noindex` on the page a stranger must find. Gate:
   open both in a private window with no session — no PIN pad, verdict prints, tampered receipt fails.
2. **`resetOwner` de-weaponised, in the same commit** (`00-MASTER.md` §5 danger 1, `10-cutlist-sequence.md` §7 Wave
   0.5). Do not ship a public surface ahead of this: the public door is the announcement that the endpoint is worth
   finding. Gate: an anon POST carrying `{confirm:"WIPE"}` returns a refusal and deletes nothing; the PIN flow still
   seals and unlocks for the operator.
3. **`/verse` + `/ledger`.** `/verse` is the public truth-teller the landing page points at; `/ledger` is 112 lines of
   working code with no JSX and is where Wave 1's evidence has to land. Gate: the map's counts match the printed
   commands in §0, and one real sealed file's chain is visible with its epistemic labels and exports.

Everything else in §3 follows `10-cutlist-sequence.md` §3 and `02-modules.md` §6 waves; the surface must not get ahead
of the pipeline it claims to show.
