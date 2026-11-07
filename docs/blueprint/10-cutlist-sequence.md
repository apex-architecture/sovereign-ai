# 10 — CUT LIST, SEQUENCE, VERIFICATION GATES

Status of the ground truth at writing time (measured, not remembered):
- `node --experimental-strip-types scripts/apex-check.mjs` → **TOTAL: 68 checks passed, 0 failed**
- Registry: 183 + 287 + 109 + 130 + 82 + 318 = **1,109 rows**, of which **0** have a human licence read.
- Modules declared: **44**. Foundation set: 8, all non-live (gaps: core/psi/licenseguard/registry/connect partial; ledger/passport/verify planned).
- Connection depths: **6 drivable / 3 file-exchange / 1 portal-only / 2 not-yet**. Stages: 9/10 routed; **dialogue has no driver**.
- Screens real: 11/44. Cash: 20 jobs × $0.65 = $13.00; ÷ 4 finished min = **$3.25/finished-minute**.

Every cut below is consistent with EMPIRE_STATE §8 (closed: Latimer, grants/DIDG/R&D, founder-LinkedIn edits, pay-to-unflag, co-founder) and §10, and with vision-corpus group 13 (closed: verification tax, "digital truth" framing, fractional-score reports, human-chasing growth, Anthropic/US-hosted model APIs). Nothing here re-proposes a closed item.

---

## 1. THE CUT LIST

Pruning rule (estate law, §8 21-Aug): every asset must serve the Film Verse spine, sale #1, or the rail — else **freeze to `D:\ApexEmpire\_VAULT`**. Local freeze ≠ live delete; any frozen thing that is also published must be unpublished separately (Owner door, §4).

### 1a. Modules cut from the build (44 declared → 20 kept; 44 − 20 = 24 cut)

| Cut | Why it is not needed for the vision to be whole | Where it goes |
|---|---|---|
| `grants` | Grant/refund path CLOSED by King doctrine 25-Sep — never re-surface | delete from map (no vault copy) |
| `marketplace`, `exchange` | both depend on supply+demand that does not exist; finders gated AFTER sale #1 per §8 | freeze spec to _VAULT; status stays `gated` |
| `talent`, `academy`, `community`, `enterprise` | audience businesses, not production businesses; the vision is a studio rail, not a social network | _VAULT |
| `analytics` | the ledger already prints every real number; a second number-machine invites invented numbers | _VAULT |
| `agents` | drivers + orchestrate.ts already do the job; autonomous agents add risk, not stages | _VAULT |
| `router` | `cost` + `connect` answer "local vs rented" for one film; a router needs a competition nobody has run | _VAULT |
| `storage` | Supabase + the creator's own disk cover it; `cloud` is the only rented-compute door | fold into `cloud` |
| `research` | its function is discovery.ts; a second label is a museum | merge into `discovery` |
| `image`, `audio`, `threeD` as verticals | they are STAGES of `film` (storyboard/music/sound/finish), not divisions | become stage metadata |
| `games`, `photo`, `design`, `writer` | other creative verticals — the Film Verse wins film first (§8 of the vision: win creative production, then expand) | _VAULT, un-frozen only by Master |
| `publish` beyond YouTube | PeerTube/Owncast self-hosted ambition = a server we don't own; portal-only YouTube + recorded URL is honest | keep one line of `publish` |
| `accessibility` as module | captions ship via whisper/ffmpeg stages; screen-reader polish is a quality bar, not a module | becomes a per-wave acceptance clause |

### 1b. Registry rows cut (categories of rows, not individual rows)

- `economy-reach` **318 rows**: distribution/market catalogues serve the business-model chat, not the pipeline. _VAULT manifest, keep counted. → `_VAULT\registry-economy-reach.json`
- `platform-infra` **287 rows minus the ~40 a $0 film actually runs on** (Supabase, FFmpeg-class, object storage, search): the rest is sovereign-infrastructure vertical inventory. Cut remainder.
- Cross-vertical rows (elections, healthcare, carbon, insurance, supply-chain, settlement, compliance, identity-credentials): those belong to the **PSI arm** at ai-governance-standard.com, not this repo. Their rows freeze; the vertical itself is not cut from the estate — only from the Film Verse.
- Keep-working set after trim: ~**12 rows carry a human licence read** (the 10 shipped drivers + 2 candidate voice tools). The other 1,000+ stay honestly `unverified`. 1,109 − 12 = **1,097 rows never need clearing for this vision to be whole** — but they must still be *counted* by the checker so the archive is never silently lost.

### 1c. Verticals cut (vision-corpus group 3: 14 claimed → 1 kept here)

Film Verse carries **creative integrity / provenance** only. Tribunals, sovereign-AI-provenance-as-a-product, supply chain, settlement finality, compliance attestation, identity credentials, media-truth-as-product, local-first infrastructure, cross-jurisdictional layer, insurance, carbon, elections, healthcare → **PSI arm and beyond; not this repo. One revenue channel per arm (§8 25-Sep)** — the Film Verse's arm sells film proof, not election proof.

### 1d. Screens cut or frozen

- `oracle.tsx`, `nominate.tsx` (public verdict game): growth theatre from the closed "human-chasing" bucket. Freeze; the free door is `/verify`, nothing else.
- `theater.tsx` (community): freeze with the `community` module.
- `beta.tsx`: re-scoped — it may only ever be the paid-anchor order door, never a feature tour.
- Surviving screens must each be: on the creative spine (`/create`, `/director`, `/registry`, `/connect`, `/cost`, `/vault`, `/admin`), or the free door (`/verify`). Anything else fails the checker's "nothing unbuilt advertised / nothing built hidden" parity and is cut.

### 1e. Protocol and distribution ambitions cut from THIS repo

- npm MCP server, `npx` one-liner into 14+ runtimes, Smithery/GLAMA shelves: that is the **PSI distribution arm**. The Film Verse consumes PSI; it ships no public package. (`@apex/nation-mcp` squat-check stays on the PSI side.)
- PQ (ML-DSA-65/LMS) default and strict RFC 8785 verifier: **frozen-core per §33(e) — needs Master's explicit go, a versioned breaking release, and lockstep TS+Py parity. Not agent-autonomous, not in any wave here.**
- Bitcoin/OpenTimestamps anchoring internals: consume the existing L3 anchor opt-in (4 anchors live, block 967,931); never rebuild.
- "APEX CREATIVE 12 divisions", COMMAND brief, model-competition page: ambition ledger → _VAULT; the repo builds the pipeline, not the org chart.
- Film Forge PIN-gated operator app + agent bearer-token API: no real operators exist yet; the owner-build stays a single local runner. Re-open only at sale #1.
- Money tiers (FREE/CREATOR $9-15/PRO $29-49/STUDIO $99-299/ENTERPRISE): self-labelled hypotheses; cut four of five tiers. **One channel: paid anchors on finished work. Verification stays $0 forever.**
- Discovery sources 15 → 4 that actually surface film tools (GitHub topics, Hugging Face, npm, PyPI); the other 11 declare blind spots nobody reads here.

---

## 2. THE MINIMAL ENOUGH SET (full vision, not a demo)

1. **Creative spine**: one project — script → breakdown → shot list → generation → cut → master → delivery — running on `/director` with 10 stages, each producing a real artifact or an admitted human handoff.
2. **Tools it actually drives**: 6 drivable (ffmpeg, blender, whisper, ollama, comfyui, replicate) + 3 file-exchange (kdenlive, ardour, Resolve) + YouTube portal-record; the dialogue gap closed (fish_speech driver **or** declared human handoff — never a silent hole).
3. **The ledger**: Supabase `apex_ledger_passport` tables + the offline chain the checker already proves (fresh chain verifies; edited history breaks it; delivery package readable without our servers).
4. **The free verify door**: `/verify` — no account, no key, no payment, forever; a stranger pastes a receipt and gets pass/fail/cannot-check.
5. **One revenue channel**: paid anchor of a finished creator's film (L3 opt-in), priced, with the free core untouched.
6. **LicenseGuard lite**: the 12 pipeline rows human-read; everything else honestly `unverified`; unread licence stops client work at the driver door.
7. **Keeper modules**: core, psi, ledger, passport, verify, rights, licenseguard, registry, connect, tools, models, cost, memory, discovery, studio, film, cloud, teams, publish, developer = 20.

---

## 3. THE SEQUENCE

### Wave 0 — Consolidation (this repo, days)
- **Exists at end**: 44→20 module map (24 rows marked `frozen_vault` with destination path); _VAULT freeze manifests written; dead screens unpublished list drafted for Owner; checker still green.
- **Who**: agent. Master: one confirm of the cut table (§4-9).
- **Gate (binary)**: `apex-check.mjs` prints `0 failed` AND a new check `cut list frozen modules carry a vault path` passes. Fail → next action: restore the module line that has no destination; nothing else ships until green.
- **Door**: repo commit + GitHub push (`git ls-remote origin main` == `rev-parse HEAD`, never the exit code).

### Wave 1 — One film, all local, no server
- **Exists at end**: a finished minute-of-film made entirely by the platform on Master's machine: storyboard stills, motion clips, edit decisions, burned subtitles, loudness-normalised master — every stage artifact hashed and sealed (L1), dialogue handled by an admitted handoff. A non-technical owner can press play and read the receipt.
- **Who**: agent builds Comfy graphs per stage + the dialogue decision; **Master does the 12 licence reads** (only a human may set `licenseVerified: true`) and the one Blender/Resolve install click.
- **Gate**: the sealed film's receipt verifies **offline on a second machine with zero servers** → pass/fail, and `dialogue` is either routed or listed in the checker's named-gap line. Fail → next action: the single stage named by the checker, in order.
- **Door**: repo commit + GitHub push. No publish yet.
- **Falsifiable number**: wall-clock meter prints `sum(job seconds) ÷ finished seconds`. Wave-1 ceiling gate: **≤ 90.0 wall-clock minutes per finished minute** (measured, printed, arithmetic shown). Wave-3 ceiling tightens to **≤ 45.0**: 180 min machine time ÷ 4 finished min = 45.

### Wave 2 — The ledger on real steel + the free door live
- **Exists at end**: the Wave-1 film's evidence rows sit in Supabase; `/verify` published on the public face; a stranger with no account proves the film from a pasted receipt. Public keyless verify confirmed (as the estate already proved for `/verify-hash`).
- **Who**: agent writes migration + page; **Master: Lovable Sync+Publish click and Supabase migration apply** (edge functions come from the repo snapshot, not publish — §33(b) honest correction).
- **Gate**: `curl` the published /verify with a genuine receipt → APPROVED; with a tampered file → fails; checker's "nothing built still advertised as unbuilt" passes against the live status. Fail → next action: migration re-apply or publish re-run, one of two, named by which half fails.
- **Door**: Supabase migration + Lovable publish (Owner click) + repo commit.

### Wave 3 — The first paid anchor (one revenue channel)
- **Exists at end**: an outside creator's finished film anchored for a price; the ledger row carries amount-paid; the receipt verifies free; nothing about the price changes what verification can say.
- **Who**: agent builds the order+payment path behind `/beta` (re-scoped); **Master: payment-account setup, the price, and the first customer** (one shot, silence after — §8 1-Sep; never a follow-up).
- **Gate**: money received AND the anchored receipt of that customer's film verifies keyless. Both halves binary. Fail → next action named per half; no launch copy until pass.
- **Door**: npm-less (no package), Supabase (orders), Lovable publish.
- **Numbers**: cash floor per film-minute **$3.25** (20×0.65=13.00 ÷ 4); licence-cleared rows **12/12**; stages **10/10** (routed or declared handoff); wall-clock **≤ 45:1**; modules kept **20**; frozen rows **1,097** still counted in the checker.

---

## 4. OWNER-ONLY DECISIONS (no agent may assume these)

1. Lovable Sync + Publish clicks. 2. Supabase migration apply / edge-function deploy (the standing `[H]` item). 3. Any `licenseVerified: true` mark (human-only by design). 4. Frozen-core crypto: PQ default, strict JCS, re-anchor (decision-log §33(e)). 5. GitHub push authorisation to protected arms. 6. External communications — one-shot doctrine; every silent channel stays silent. 7. Un-publishing a frozen asset's live deployment (local freeze ≠ live delete). 8. Payment account and the anchor price. 9. Rat of the cut list (§1) — once confirmed, never re-litigated. 10. Un-freezing any _VAULT item, incl. games/photo/design/writer verticals. 11. Running paid cloud jobs on anyone's bill but the customer's. 12. Domain/DNS moves on either of the two public faces. 13. When (never "if") the marketplace/finder apparatus activates — gated after sale #1. 14. NEVER answering "what will Apex do" — those panels stay blank (§10).

---

## 5. STANDING VERIFICATION HARNESS (forever, for every future builder)

The checker (68 now, 74 after Wave 0) must **forever** assert, each as pass/fail with one next action:
- TOTAL line fails ≠ 0 → nothing publishes.
- Depth table parity: 6/3/1/2 counts == `drivers/index.ts` reality; no driver claims drivable without `run()`; screen tells the same depth story as code.
- Stage honesty: named gaps printed (today: `dialogue`), never hidden; screen routing == driver routing.
- Licence honesty: 0 agent-set `licenseVerified`; defaults unverified-not-permitted; unread licence stops client work at the door; a row marked `no` is blocked, not warned.
- Registry shape: every row passes contract, no invented categories, every row has a written exit, no cross-catalogue duplicates, **all frozen rows still counted** (a freeze that deletes the count fails).
- Cut-list immutability: the 24 frozen modules stay frozen-with-vault-path; `grants` never re-appears in any module map, migration, or page; verticals §1c absent from this repo.
- PSI honesty: seal/tamper round-trips; placeholder anchors refused; receipt claims capped to 4 statements with their limit named; **verification priced at zero and says so**.
- Ledger: edited history breaks the chain at the right index; delivery package readable with no server; passport never carries a private key.
- Money: the 20×0.65=13.00 arithmetic stays deterministic; an unpriced tool makes the quote unquotable.
- New in Wave 1: wall-clock meter printing its division; no finished film ships without it.

Any deletion of an existing check is itself a FAIL the Owner must approve.
