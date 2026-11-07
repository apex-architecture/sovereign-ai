# 05 — THE BUSINESS MODEL

> **What is the product?** The product is a finished minute of film that anyone on Earth can
> verify for $0 — and the payer is the person who cannot spare the wall-clock hours to produce it.
> The gate is not the seal and not the paywall: **the gate is the verified price list.**
> In code, today: `src/routes/cost.tsx` ships `STARTER_PRICES: PriceEntry[] = []`; every paid
> stage runs through `estimatePaid()`, which returns `usd: Number.NaN` when no price entry exists
> (`src/lib/apex/cost.ts:65-75`), and `judgeBudget()` returns
> `withinBudget = unknownPrices.length === 0 && totalUsd <= budgetUsd` (`cost.ts:99`) —
> so with an empty table the platform's own verdict on its flagship act is **NOT QUOTABLE**:
> *"the quote is incomplete, not expensive"* (`cost.ts:109`). One exemplar, no feature tour:
> **a stranger asks for one sealed finished minute; the platform refuses to take money until
> every stage price is verified against a provider's own page.** That refusal IS the product.

---

## 1. The payer map

Every party who could hand money to the Film Verse, what they get, what gate stops them,
and on what basis a price could exist. Tier numbers are **untested hypotheses** (vision corpus
group 5, rival-AI chat) — the doctrine forbids repeating them as facts until a stranger pays one.

| # | Payer | What they get | The gate that stops them | Price basis | Status |
|---|---|---|---|---|---|
| 1 | **Master (ROCKYFILMS888 PTY LTD)** | The pipeline itself; every run billed to his own hardware or his own key | `LOCAL_RUN = $0` — his machine is the render farm; nothing is billed to the platform | Electricity + wall-clock, not cash | The only payer today; his card is not revenue, it is oxygen |
| 2 | **Commission client (brand / cinematic)** — §22 King Map "Film Forge / YouTube" row | A finished, provenance-sealed deliverable (film + PSI receipt + licence manifest) produced by the workflow | `judgeBudget()` binary gate: quote prints NOT QUOTABLE until every stage price is verified; then a fixed process price per deliverable | **Process, never outcome.** One sealed minute at a printed per-minute rate (see §3 arithmetic), self-serve, inbound only | This arm's ONE channel |
| 3 | **Creator operator** | The workbench driving FFmpeg/Blender/Whisper/Ollama/ComfyUI on *their own* machine (`connection.ts`: `where: "your machine"`) | BYO key + BYO price: Replicate is *"billed to the creator, not to us"* (`connection.ts:25`); `licenseguard` blocks any asset whose licence fields are unverified | HYPOTHESIS: **CREATOR A$9–15/mo** — untested, never advertised until a stranger pays | Hypothesis |
| 4 | **Small studio / post house** | Workspace, versions, approvals, the cut-list handoff (Kdenlive/Ardour/Resolve are `file-exchange` depth — *"a human confirms the timing"*) | Same verified-price gate + they must own the NLE; Resolve row says *"Studio edition for scripting — not assumed"* | HYPOTHESIS: **PROFESSIONAL A$29–49 / STUDIO A$99–299** | Hypothesis |
| 5 | **Enterprise** | Self-hosted deployment, custody, retention | Inbound only (§8 one-shot doctrine — no outbound fleets); the door opens on their request or not at all | HYPOTHESIS: **ENTERPRISE — price set per engagement** | Hypothesis |
| 6 | **Platform ad revenue (YouTube)** | — | Monetisation thresholds are theirs, not ours (1,000 subs + 4,000 watch-hrs; 8,000 hrs from 1 Feb 2027 — §75), and the inauthentic-content policy demonetises templated AI output | Not a price we set; load-bearing condition is Master's one spoken take per video (layer 3) | Tied to our own channel output, not a channel of its own |
| 7 | **Anyone wanting a finding suppressed / a seal sold** | **Nothing. Ever.** | Rectification Covenant: *"no fee ever changes a finding"* (EMPIRE_STATE §4); pay-to-unflag rejected as extortion (21 Aug, §8) | No price basis exists | Permanently refused |

The tiers FREE / CREATOR / PROFESSIONAL / STUDIO / ENTERPRISE exist in this document **only as
labelled hypotheses from the vision corpus (group 5)**. Their only load-bearing member today is
FREE, because it is enforced in code: verification and export are priced at $0 by the protocol
itself (`cost.tsx:144-148`), and every paid stage prints "no verified price" in red until the
operator pastes a real figure with `verifiedFrom` + `verifiedOn` (`PriceEntry`, `cost.ts:12-20`).

## 2. The $0 survival arithmetic

**What the platform costs to run at zero revenue: $0 cash, indefinitely — provable, not hoped.**

- The whole Film Verse control plane is a static client + one small ledger. `connection.ts` is
  deliberately client-safe ("the browser can show what is truly wired without importing a single
  driver"), so the public surface renders on GitHub Pages — precedent already live:
  `kawal393.github.io/apex-global-shield/` serves a full ~960KB JS app at $0 (§3, 25 Sep).
- **Free-tier ceilings, re-measured 1 Nov 2026, not copied from the rival-AI notes:**
  - Supabase (this repo's backend — `supabase/`): **500 MB database, 1 GB file storage, 5 GB
    egress/mo, 50,000 monthly active users, 500,000 Edge Function invocations/mo** — confirmed
    against [Supabase pricing](https://supabase.com/pricing) and 2026 audits
    ([activepieces](https://www.activepieces.com/blog/supabase-pricing-free-tier-limits-pro-costs-egress),
    [mykavo](https://mykavo.app/blog/supabase-free-tier-limits)). Note: the corpus's D1/R2 numbers
    were Cloudflare's; this app rides Supabase, whose free DB is **500 MB, not 5 GB**.
  - Cloudflare Workers free: **100,000 requests/day, 10 ms CPU/invocation** — confirmed
    ([saaspuppy](https://saaspuppy.com/tools/cloudflare-workers)); Workers AI free: **10,000
    neurons/day** ([saaspuppy](https://saaspuppy.com/tools/cloudflare-workers-ai)).
  - GitHub Actions: **2,000 min/mo on Free private plans** — this figure is still corpus-sourced,
    flagged `unverified — re-check the GitHub billing page before it appears in any quote`.
  - The hard ceiling is not storage, it is the 500 MB DB: the ledger stores hashes, manifests and
    receipts (bytes, not media); media never enters our database at all — it lives on the creator's
    machine or their own account.
- **Reduced mode when a paid dependency disappears — behaviour is already in the table:**
  every paid dependency has a named fallback path, so its death degrades output, never the platform.
  - Replicate dies → `STAGE_CONNECTION.motion = ["replicate", "comfyui", "blender"]` — motion
    falls back to the local depth-camera rig (the §73 tier: generated stills + parallax at $0).
  - A paid voice API dies → `STAGE_CONNECTION.dialogue = []` — dialogue is *already* unwired;
    the $0 fallback is piper local (the 30-second film of §72 was made exactly this way: $0.00,
    no cloud call, no licence, no stock asset).
  - YouTube's API closes → publish is `portal-only`: *"APEX records the published URL; it does
    not publish"* — a human click we never automate, so nothing of ours breaks.
  - The sanctioned substitution is a function, not a vibe: `localize(rows, stage, tool, minutes)`
    (`cost.ts:116-118`) — *"the only substitution that reduces cash spend: replace a paid stage
    with a local tool"* — trading cash for wall-clock.
- Zero-revenue burn: $0 hosting + $0 DB (under ceiling) + $0 model spend (local-first) +
  Master's attention. The $0 survival rule (corpus group 1) holds structurally because **no
  code path exists that spends our money**: paid stages bill the operator's own key or print NaN.

## 3. Unit economics of the core act: one finished minute of film

Computed from `cost.ts` semantics + the estate's own measured renders. **Printed arithmetic:**

**A. Local, per the default run of `src/routes/cost.tsx`** (scenes = 33, finished minutes = 4):

```
local stages, minutes = localMinutes × 33 scenes:
  storyboard  2×33 = 66   character_lock 1×33 = 33   music 3×33 = 99
  sound       1×33 = 33   subtitles      1×33 = 33   edit 1×33 = 33
  finish      2×33 = 66
  ─────────────────────────────────────────────
  machine time = 396 min = 6.6 h        cash = 7 × $0 = $0.00
  paid stages: motion/replicate → estimatePaid(…, undefined, 33) → NaN
               dialogue/fish_speech → NaN
  totalCost() = $0.00 (NaN treated as 0, cost.ts:88)
  perFinishedMinute(rows, 4) = $0.00  ← BUT judgeBudget → unknownPrices = 2 → NOT QUOTABLE
  machine minutes per finished minute = 396 / 4 = 99
```

The page prints **$0 per finished minute and simultaneously refuses to sell** — that pairing is
the business: the free number is honest, and nothing is quoted off a half-honest number.

**B. Local, actually measured (EMPIRE_STATE §72–§73, file mtimes and frame checks):**

```
§73 cinematic tier: 238 s of machine time → 23.4 s of film
  238 × (60 / 23.4) = 610 s ≈ 10.2 machine-min per finished minute. Cash: $0.00.
§72 motion-graphics: 900 frames × ~0.5 s = 450 s per 30 s film
  = 15 machine-min per finished minute. Cash: $0.00, zero cloud calls, offline.
```

**C. Rented (§75, figures recomputed at build time; AUD/USD 0.695):**

```
Cloud API (per 60-second vertical = 12 accepted 5-s clips):
  Wan 3.0        US$0.20/s × 12 clips × 5 s = US$12.00/video = US$12 / finished minute
  Hailuo 2.3 Fast US$6.40/video            = US$6.40 / finished minute
  MiniMax H3     US$4.80/video             = US$4.80 / finished minute
  Seedance 2.5   US$0.57/s × 60 s          = US$34.20/video = US$34.20 / finished minute
  ⚠ keep-rate caveat: measured 3-in-10 → 40 generations per video; at per-second billing
    Wan becomes 40×5×0.20 = US$40/finished minute. Re-verify before any client quote —
    this is exactly what the NaN gate exists to force.
Rented pod (RunPod 4090, US$0.34/hr): ~80 pod-min/video ≈ 80/60 × 0.34 = US$0.45/video
  = US$0.45/finished minute (A$0.65) — PROJECTED, not a measured render; flagged so.
```

**The trade the platform sells:** local costs **$0 cash × 10–15 wall-clock hours** per finished
hour of film (≈99 machine-min/min on the modelled 9-stage run); rented costs **US$0.45–40 per
finished minute** and hours less wall-clock. A commission client's fixed process price must sit
above the rented-route cash floor (US$12–40/finished min at API list prices) or below it the work
runs local and the client waits — the pricing decision is literally `localize()` versus `judgeBudget()`.

## 4. The ONE revenue channel for this arm

**One sentence:** *The Film Verse sells one thing — a provenance-sealed finished film, priced as a
fixed fee per finished minute of delivered process, self-serve, inbound-only, quotable only when
every stage price is verified — and nothing else.*

Why its neighbours must not each get a channel of their own (§22 King Map mandate, 25 Sep):
- **Tier subscriptions** are untested hypotheses; opening five doors before a stranger has walked
  through one is product-tour monetisation and forces chasing — which §8 (one-shot doctrine,
  1 Sep LATIMER closure) forbids.
- **Compute resale** (taking a cut on Replicate/RunPod spend) would make us an unlicensed
  middleman holding someone's bill — the Global Shield lesson (a live token, an escrow, a chase —
  each extra money surface is a surface that can breach); `connection.ts` already fixes the right
  posture: *"billed to the creator, not to us."*
- **Sealing/verification fees** belong to the PSI core, which is free forever by doctrine —
  charging here in the Film Verse would re-sell the same moat twice.
- **Ad revenue, affiliates, grants** belong to other arms or are permanently closed (§8, 25 Sep).
  One channel per arm because each channel is a maintenance surface, a compliance surface and a
  temptation to chase; an arm with two channels starts optimising both and serves neither.

## 5. The pricing laws that cannot break

1. **Verification free forever.** Sealing, verification, export: $0 in the protocol itself. The
   wall, never the product (`cost.tsx:144-148`; §79 five-tier doctrine).
2. **Money buys process, never outcome.** The Global Shield precedent is binding: the 10%
   success-fee was **DROPPED** because outcome pricing breaches the 21-Aug extortion-line lock
   (§22, §3). A film quote is priced per finished minute of work performed, not per award won.
3. **No pay-to-suppress.** Rectification Covenant: *no fee ever changes a finding.* A client can
   pay for a better film; nobody can pay for a different receipt, a removed flag, or a seal
   withheld from a competitor.
4. **No human chasing.** One shot, then silence is the message (§8, 1 Sep). Every channel of
   this arm must be openable at $0 cost and reachable inbound-only.
5. **No outbound fleets.** No scraped mailing lists, no automated outreach runs, no platform
   automation that publishes without a human click (`connection.ts` YouTube row is doctrine,
   not backlog).
6. **Grants / DIDG / R&D offsets: permanently closed.** Removed from the money plan by Master,
   25 Sep: *"A king opens channels that SELL, not forms that BEG."* They must never reappear in
   any plan, forecast, or runway table of this arm.
7. **No invented numbers.** `estimatePaid` returns NaN rather than a guess; `PriceEntry` demands
   `verifiedFrom` and `verifiedOn`; the platform prints "incomplete" instead of quoting off a
   rival AI's remembered figure.

## 6. What the platform must NOT sell — and why refusing is the stronger position

**Never sellable:** the seal's honesty (suppression, delisting, priority-flagging); outcome
guarantees ("guaranteed viral", "guaranteed awards"); the free verification door; the creator's
own machine (never silently use a user's computer for someone else's job — corpus group 11);
anyone's data or key (BYO keys bill *them*, we hold nothing); the PSI-SEAL mark itself
(issued solely by the foundation — §4 lock); human attention as a product (no chasing, no
"community management" fleets); recognition-for-hire (buying features, placements, or citations).

**The mechanism that makes refusal the stronger position:** the paid deliverable's entire value is
that a *free* third party can check it. A sealed film is worth the commission price precisely
because verification is $0 and the seal cannot be bought, suppressed, or skewed — so the moment we
sell suppression or an outcome, the seal stops meaning anything and the paid product is destroyed
by its own pricing. This is the copy doctrine (§4): let rivals copy the pipeline — *"the FINAL
SEAL and recognition are the only uncopyable assets"*; openness is the moat, because a protocol
anyone can verify for free accrues recognition that no competitor can restrict, fork, or
underprice. Our refused revenue is the advertisement: every "no fee changes a finding" is the
reason a stranger believes the receipt, and the receipt is the only thing the client actually
bought.

---
*Sources inside the estate: `src/lib/apex/cost.ts` · `src/lib/apex/connection.ts` ·
`src/routes/cost.tsx` · EMPIRE_STATE.md §3/§4/§8/§22, §72–§75, §79 · vision corpus groups 5 & 11.
Free-tier ceilings re-checked 1 Nov 2026: [Supabase pricing](https://supabase.com/pricing),
[Workers free limits](https://saaspuppy.com/tools/cloudflare-workers),
[Workers AI free limits](https://saaspuppy.com/tools/cloudflare-workers-ai),
[Supabase free-tier audit](https://mykavo.app/blog/supabase-free-tier-limits). GitHub Actions
2,000 min/mo remains flagged unverified.*
