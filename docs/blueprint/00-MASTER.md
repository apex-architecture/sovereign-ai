# SOVEREIGN AI FILM VERSE — MASTER BLUEPRINT

Owner: Kawaljeet Singh (ROCKYFILMS888 PTY LTD, VIC, ABN 71 672 237 795). Repo: `kawal393/lllppp`, branch `apex-platform`.
Written 1 Nov 2026 from ten sections (01–10 in this folder), each measured against the files and your empire state, not from memory.
Rule for this document: every figure below was printed by a command run in this repo or cited to a file. Nothing is a rival AI's number.

---

## 0. WHAT THIS IS

One platform that operates the creator's whole open-source tool chain and hands back a finished, provable film.
It is not an app, not a link directory, not a render farm. It is the **door** between a creative brief and every tool on the planet,
plus the **record** of what was done, who did it, and when — verifiable by a stranger with no account, forever, for free.

Wedge = film (your #1). Everything else attaches later through the same stage/driver contract, not a rewrite.

---

## 1. THE FOUR PARTS (nothing else is load-bearing)

| Part | What it is | Where it lives now |
|---|---|---|
| **Creative spine** | brief → breakdown → shot list → generation → cut → master → delivery, 10 stages | `/create`, `/director`; planner in `src/lib/filmforge/` |
| **The one door** | `runStage()`: licence gate → depth check → probe → run or hand off → next candidate → ledger | `src/lib/apex/orchestrate.ts` + `drivers/` |
| **The record** | append-only ledger, seals, passport, delivery package | `ledger.ts`, `psi.ts`, `passport.ts` + the new migration |
| **The free door** | paste a receipt, get pass/fail/cannot-check. No login, no key, no payment, ever | `/verify` + offline `verify.ts` |

Depth vocabulary is the honesty mechanism: **drivable** (APEX runs it and reads the result), **file-exchange**
(APEX prepares and ingests, a human clicks), **portal-only** (record, never operate), **not-yet**. A driver that claims a
depth it does not implement is caught by a check, not by trust.

Measured today: **6 drivable / 3 file-exchange / 1 portal-only / 2 not-yet**, 10 drivers, **9 of 10 film stages routed**,
`dialogue` is the named hole.

---

## 2. THE TOOL BASE (your "every open source tool" requirement)

- Registry: **1,109 rows across 6 catalogues** (109 + 82 + 130 + 183 + 287 + 318), **55 of 56** categories covered
  (`workflow-automation` is empty), **0 duplicates**, **0 rows without a written exit**.
- **0 of 1,109 are cleared for client work.** All await a human licence read. `licenseVerified` is set to false inside the
  record builder when no date exists, so no row can lie about being read.
- Section 03 enumerates every row one-per-line with a KEEP/FREEZE verdict: **~500 rows are the working set**, the rest is
  inventory for arms that are not this one.
- **Enough for the vision ≠ everything on Earth.** The first version must clear **12 rows by hand** — the 10 shipped
  drivers plus 2 voice candidates. That is the whole licence bottleneck to a finished film.
- Corrected fact: `Replicate` is wired as a driver but has **no registry row** — a paid dependency with no licence record.
  That is a defect, not an oversight to keep.

---

## 3. THE MONEY (full business model)

- **Who pays:** a client or creator who wants a finished film, not a protocol user, not a funder, not a government.
- **Where the gate is:** nothing is quotable until every stage price is verified. `estimatePaid` returns NaN and the screen
  prints **NOT QUOTABLE** rather than inventing a number. This is live behaviour, measured on `/cost`.
- **The one channel for this arm:** sell the sealed finished film, priced per finished minute of delivered process,
  self-serve and inbound only. Verification stays $0 forever. (Section 05 frames the same channel as the production fee;
  section 10 frames it as the paid anchor on finished work. **They disagree on the headline and you must pick one** —
  see §6, owner decision 1. They do not disagree on any rule: free verification, no outcome-selling.)
- **Tiers are hypotheses, not prices:** FREE / CREATOR / PROFESSIONAL / STUDIO / ENTERPRISE come from a rival AI chat.
  Nothing is hard-coded as a fact anywhere in this repo.
- **Arithmetic that is real:** local route = $0 cash × ~99 machine-minutes per finished minute (396 ÷ 4). Cash floor
  measured at **20 × $0.65 = $13.00 ÷ 4 finished min = $3.25 per finished minute**. Rented route = US$0.45–40 per finished
  minute depending on model and keep rate — both flagged re-verify-before-quote.
- **Closed forever, in this document and in the code:** grants, DIDG, R&D offsets, verification tax, protocol-as-the-lock,
  pay-to-suppress, co-founder, bought stars, bot traffic, auto-post queues, AI-SDR outbound, human chasing.
- **Free-tier ceilings re-checked, not inherited:** Supabase 500 MB DB / 5 GB egress / 50k MAU / 500k edge invocations;
  Cloudflare Workers 100,000 req/day at 10 ms CPU. The corpus's "5 GB D1" figure was the wrong platform and is discarded.

---

## 4. THE SMART CONTRACT (what you asked for, and what it must never claim)

Five contracts designed in section 06 — **Split** (contributor royalty splits), **Licence** (rights and scope),
**Attribution** (who touched this frame), **AnchorBatch** (optional epoch root), **TierEntitlement**.

- Build **SplitRegistry first**: it is the only one whose credibility genuinely requires APEX *not* controlling the log.
- **Cut, on purpose:** ledger rows mirrored on-chain, on-chain passports, "certified work" tokens, on-chain arbitration.
- **Not buildable:** self-held royalty escrow. Holding other people's money reads as an unlicensed financial product
  (AUSTRAC/ASIC exposure) — it goes to a licensed custodian or does not exist.
- Chain: **Polygon PoS as a witness mirror**, Bitcoin anchor stays canonical (4 anchors live, batched at the Merkle root —
  never presented as per-record). Chosen over Base because of single-sequencer and US-API dependency risk; facts cited in 06.
- Contract semantics inherit the doctrine: a seal proves **a statement was made at a time**. It never proves the statement
  is true. Coexistence is not correctness. Every contract section states its `proves` sentence and its `refuses` sentence.
- Custody: 3-of-5 shard ceremony, upgrade authority, and a **deliberate non-event when you are unavailable** — the system
  must keep verifying with no one in the room.

---

## 5. THREE LIVE DANGERS THE BLUEPRINT FOUND (fix before any publish)

1. **`resetOwner` has no server-side auth** — `src/lib/gate.functions.ts`. The auth middleware is client-side only, so an
   unauthenticated POST carrying `{confirm: "WIPE"}` (a literal readable in your shipped bundle at `PinGate.tsx:144`)
   reaches the service-role client and deletes every `auth.users` row, cascading projects and render jobs.
   One request wipes the platform. The repo already contains the correct pattern — `api/public/render.ts` does a
   constant-time bearer check.
2. **`.env` is committed** across 3 commits (`3696e85`, `7fd500a`) with live-shaped `REPLICATE_API_KEY` and
   `OPERATOR_API_TOKEN`. Deleting the file does not unshare it: rotation at the provider is the only fix. No value was
   read or printed during this work.
3. **The new migration aborts as written** — `supabase/migrations/20261101190000_apex_ledger_passport.sql` line 41 builds
   a ledger policy that subqueries `apex_projects`, which is created at line 100. Also: nothing in the code references any
   `apex_*` table yet, so the migration is currently orphaned as well as broken.

Two more recorded facts: `runStage` has **no production caller** — `/create` and `/api/public/render` hit Replicate
directly, ungated and uncapped, which bypasses the whole licence-and-budget doctrine; and a stage with three candidates can
spend **3× the budget cap** because the cap is applied per candidate.

---

## 6. OWNER-ONLY DECISIONS (14 collected in section 10; the ones that block work)

1. **Pick the headline revenue channel**: per-finished-minute production fee, or paid anchor on finished work. Both respect
   every rule; only one may be the door.
2. The 12 licence reads (only a human may mark a licence read).
3. Lovable Sync + Publish, and Supabase migration apply / edge-function deploy. A repo commit is not a live site.
4. GitHub push authorisation (nothing in this estate is pushed without your click).
5. Payment account and the anchor price.
6. Ratify or amend the cut list — once confirmed it is never re-litigated.
7. Rotate the two committed credentials.
8. Whether the 24 cut modules and ~1,097 registry rows freeze to `D:\ApexEmpire\_VAULT` (freeze, never delete; they stay counted).

---

## 7. THE SEQUENCE (each wave ends in a binary gate, no scores)

**Wave 0 — Consolidate (days, agent).** Module map 44 → 20 kept, cut rows get vault paths, checker stays green.
Gate: `apex-check.mjs` prints `0 failed` **and** the new cut-list check passes. Door: repo commit.

**Wave 0.5 — De-weaponise (immediate, agent).** Fix `resetOwner`, order the migration so tables precede policies, add the
`.env` ignore rule, route `/create` and `/api/public/render` through `runStage` so the licence gate has a caller.
Gate: a stranger POSTing the wipe payload is refused, one film job runs through the door and stops on an unread licence.

**Wave 1 — One film, all local, no server.** The platform makes a finished minute on your machine: stills, motion, edit
decisions, burned subs, loudness-normalised master, every artifact hashed and sealed, dialogue handled by an **admitted**
handoff rather than a silent hole. Gate: **the receipt verifies offline on a second machine with zero servers**, and a
wall-clock meter prints `job seconds ÷ finished seconds` at **≤ 90:1**.

**Wave 2 — Ledger on real steel, free door live.** Wave-1 evidence rows in Supabase; `/verify` published; a stranger with no
account proves the film from a pasted receipt. Gate: genuine receipt → APPROVED, tampered file → fails. Door: migration apply
+ your publish click.

**Wave 3 — First paid anchor.** An outside creator's finished film anchored for a price; the receipt still verifies free and
the price changes nothing the seal may say. Gate: money received **and** the anchored receipt verifies keyless.
Numbers to hold: licence-cleared **12/12**, stages **10/10**, wall-clock **≤ 45:1**, modules kept **20**, frozen rows still
counted.

---

## 8. WHAT WE REFUSE TO BUILD

Screens that would be theatre over an empty database. A second number-machine when the ledger already prints the real one.
Autonomous agent fleets where drivers already do the job. Community, academy, talent, marketplace and grants surfaces.
Any claim of legal ownership, admissibility, or "truth" from a seal. Any pay-to-change-a-result. Any published figure with
no source. Any public package from this repo — that is the other arm's distribution job.

---

## 9. HOW TO CHECK ANYTHING ABOVE

```
cd D:/ApexEmpire/films/lllppp
node --experimental-strip-types scripts/apex-check.mjs    # TOTAL: 68 checks passed, 0 failed
npx tsc --noEmit                                          # 0 errors
```
Sections: 01-spine · 02-modules · 03-tools · 04-connections · 05-business · 06-contract · 07-data · 08-screens · 09-legal · 10-cutlist-sequence
