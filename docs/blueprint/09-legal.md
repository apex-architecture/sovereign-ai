# 09 — Legal, licence and security fence

**Status:** normative for the build. Nothing in this file is legal advice, and this file must not be
quoted as if it were. It is the fence: the words we may use, the gates that must hold, and the
questions that go out to a lawyer in instructions he can paste.

**Why the fence exists.** The repo already encodes the doctrine in code, and the code is the
authority here, not this document:

| Code | Doctrine it enforces |
|---|---|
| `src/lib/apex/schema.ts` `R()` | every permission field defaults to `"unverified"`; `licenseVerified` is forced back to `false` if `lastVerified` is null. "Free" is never a licence. |
| `schema.ts` `isClearedForWork()` | a row is offerable to a paying customer only when `licenseVerified && commercialUse === "yes"`. |
| `licenseguard.ts` `guard()` | binary verdict `cleared / verify-first / blocked` with one physical `nextAction`; copyleft and redistribution are checked **again** for `platform-bundle`. |
| `licenseguard.ts` `reviewQueue()` | unread licences are a queue to work, not an error list. |
| `licenseguard.ts` `canPromote()` | refuses to record a `legal-conclusion` assertion: *"APEX records evidence of claims; legal ownership and admissibility are decided elsewhere."* |
| `psi.ts` / `verify.ts` | a seal proves a key signed a manifest; `describeScope()` and `notClaims()` name what it does not prove; `FREE_FOREVER` prices seal / verify / exportReceipt at 0. |
| `ledger.ts` + `supabase/migrations/20261101190000_apex_ledger_passport.sql` | `epistemic` travels with every row (`claim` default, never defaulted upward); rows cannot be UPDATEd or DELETEd; a retraction is a new event; receipts are publicly readable by design. |
| `passport.ts` | private key generated on the creator's device, never a column, and `importPassport()` throws if a passport carries one. |
| `discovery.ts` `admissible()` | adoption needs a human-read licence, affirmative commercial use, a written exit, known data portability, and all 12 evaluator axes tested. |

Measured today by `npx tsx scripts/apex-check.mjs` (2026-11-01, this repo):
**rows awaiting a human licence read: 1109 of 1109**; rows clearing `isClearedForWork()`: **0**.
68 checks pass, 0 fail, including *"guard stops an unread licence before client work."*
The fence is correctly built and completely unpopulated. That is the honest state, and §9.9 says
what follows from it.

---

## 9.1 Licence obligations by family

Three use cases, always asked separately — `UseCase` in `licenseguard.ts`:

- **(a) client-work** — we operate the tool for a paying client; the client's media is rendered by
  an operator-side tool they or we pay for.
- **(b) platform-bundle** — the tool, its code or its weights ship inside something we distribute.
  This is where `redistribution` and copyleft are re-tested; a pass on (a) is not a pass on (b).
- **(c) output-rights** — what we may say about rights in what the tool produced. Licences answer
  this only rarely, and never in the way marketing wants.

Every row below must still be read against the actual text and dated (`applyHumanRead(rec, read,
datedOn)`). The table is a map of *what to look for*, not a clearance.

### Permissive code — MIT, ISC, BSD-2/3-Clause, Apache-2.0, CC0 code

| | (a) client-work | (b) platform-bundle | (c) output |
|---|---|---|---|
| **MIT / ISC** | yes | yes, with conditions | silent — says nothing about output |
| **BSD-2** | yes | yes, conditions | silent |
| **BSD-3** | yes | yes, conditions | silent |
| **Apache-2.0** | yes | yes, heavier conditions | silent |
| **CC0 (code/assets)** | yes | yes | nothing to pass on |

Conditions we actually have to meet, in physical terms:

- **MIT / ISC** — the copyright notice *and* the permission notice must be preserved in all copies
  or substantial portions. A bundled tool therefore ships a licence file. Attribution is satisfied
  by shipping the text; there is no source-disclosure duty.
- **BSD-2** — both notices preserved. **BSD-3** adds: you may not use the names of contributors to
  *endorse or promote* derivatives. For a platform that markets "powered by X", that clause is a
  live restriction on our own copy, not on their code.
- **Apache-2.0** — four duties when redistributing: (1) include the licence; (2) keep `NOTICE`
  content if the original ships one, in the distributed work's NOTICE; (3) state changes in the
  files you modified; (4) preserve source-form attribution notices. Plus §6: no trademark rights
  (do not rename a fork after the upstream mark), and §3's patent grant terminates if we sue the
  contributor for patent infringement — a litigation constraint, not just a credit clause.
- **CC0** — the public-domain *tool* is not a public-domain *result*. CC0's own deed warns that it
  does not address patent or trademark rights, personality/publicity/privacy rights, or the rights
  of others in the same material. A CC0 dataset row and a CC0 font row are not a CC0 film.

### Copyleft code — GPL-2.0 / GPL-3.0 / AGPL-3.0 / LGPL-2.1 / LGPL-3.0 / MPL-2.0

| | (a) client-work | (b) platform-bundle |
|---|---|---|
| **GPL-2.0 / GPL-3.0** | running it for a client is not conveying — but the boundary is where our business model sits, so it must be counsel-answered (§9.8 Q2) | conveying triggers Corresponding Source + licence text + no further restrictions |
| **AGPL-3.0** | §13: if users interact remotely, they must be offered the source of the modified module — a *hosted* product is a distribution event | same, plus our own hosting is the trigger |
| **LGPL-2.1 / -3.0** | linking permitted with conditions | must permit users to re-link/swap the library; v3 adds anti-tivoisation for the library |
| **MPL-2.0** | fine | file-level copyleft only — files we change stay MPL, the rest of our app may stay ours |

Fence rules carried into code review:

1. `guard()` deliberately holds a `platform-bundle` row at `verify-first` for any copyleft family
   and its `nextAction` is "Decide how X is distributed: separate process, or disclose source".
   That decision is a **build decision made before the code is written**, not a cleanup task after.
   A GPL module must be a separate binary/CLI we invoke, with its source offered alongside, or the
   linking module becomes open.
2. Copyleft obligations run to *our* users, so they cannot be satisfied by a client's contract.
3. LGPL/MPL are not "free to bundle with no conditions"; they are conditional. Treat as
   `restricted` until the specific clause is read.
4. A row whose `license` string is `source-available`, `custom-open`, `BUSL-1.1` or `mixed-per-asset`
   is **not in either family**. In this registry those strings cover 19 + 9 + 3 + 34 rows. They are
   read clause by clause or they stay `unverified` (which is what `guard()` does with them today:
   `verify-first`, forever, until a human dates them).

### Content licences — CC BY, CC BY-SA, CC BY-NC, CC BY-ND, CC BY-NC-ND, plain copyright

| | (a) client-work | (b) platform-bundle | notes that bite in film |
|---|---|---|---|
| **CC BY 4.0** | yes | yes | attribution is *removable on request* by the licensor, and we must indicate if we changed the material; the credit may not imply endorsement |
| **CC BY-SA 4.0** | yes | yes, but ShareAlike reaches the *adaptation* | a remix of a BY-SA clip in a delivered film can pull that film (or the clip's contribution) into SA terms; never mix SA material into a client deliverable without a per-asset decision |
| **CC BY-NC 4.0** | **no by default** | no | the deed's own test: *"A commercial use is one primarily intended for commercial advantage or monetary compensation."* A paid client job is monetary compensation. `commercialUse: "restricted"` at best, `no` in the common case |
| **CC BY-ND / NC-ND** | only unmodified re-use | no | ND says if you remix, transform or build on the material, **you may not distribute the modified material**. Editing a shot into a film is distributing modified material. Private inspection is not delivery |
| **All rights reserved** | only with a written licence per asset | no | a `licence-document` assertion, dated, with the grant quoted |

Structural point for the registry: content is licensed **per asset**, so a `mixed-per-asset` row can
never be cleared as a source. Only the individual asset row that carries its own URL, its own grant
text and its own date can enter a film. The catalogue may list the library; the ledger must list the
asset.

### Fonts — SIL OFL 1.1

The OFL text (verified against the official text at openfontlicense.org):

- Permitted: use, study, copy, make, and distribute **modified and unmodified** the font, **as long
  as it is not sold by itself**; bundled inside a larger work is fine.
- Every copy, modified or not, **must be accompanied by the licence text** (not the RFC-style
  "notice" of MIT — the licence itself).
- **Reserved Font Names**: a modified version may not use a reserved name unless the copyright
  holder gives explicit written permission. Renaming a modified family is the standard path.
- The licence does not apply to documents created using the fonts. **A title card rendered in an
  OFL font is not an OFL work** — no attribution duty attaches to the film, and no rights attach to
  the rendered pixels from the font side. The obligation is on the *software* copy: if we ship the
  .ttf inside an installer, ship the licence with it.
- Fonts whose files carry no licence, or a "personal use only" EULA, are the traps; the EULA row
  governs, not the site copy.

### Model weights — non-commercial, community, and acceptable-use licences

Weights are not code. The licence is often a bespoke agreement plus a policy document, and it is
attached **per checkpoint, per file**, which is exactly the blind spot `discovery.ts` records for the
Hugging Face source ("*the licence text behind each checkpoint, which is per-file*").

- **OpenRAIL / OpenRAIL-M (RAIL family)** — copyright-permissive grant with a schedule of **use
  restrictions**. Verified position (BigCode / RAIL FAQ / The Turing Way): the use restrictions must
  be included in any downstream redistribution **and in derivatives** — so if we fine-tune, our
  output model carries the same list. The restrictions bind *use*, not *output ownership*; RAIL
  licences do not grant us rights in generated content, they constrain what the model may be used
  for. So (a) is often yes, (b) requires the flow-down text to ship with the weights, and (c) is
  silent.
- **Llama family** — the license named in Meta's repo for Llama 4 is the **LLAMA 4 COMMUNITY LICENSE
  AGREEMENT** (verified against the raw file). Its operative shape: grant to use/reproduce/distribute
  and to create derivative works; an **Acceptable Use Policy incorporated by reference and required
  downstream**; a limit on Meta trademark use beyond indicating attribution ("license to use 'Llama'
  solely as required to comply with the last sentence of Section 1.b.i"); and a **>700 million monthly
  active users** condition requiring an express licence from Meta. Reported commentary
  (intuitionlabs / compliance-made-simple) states that for multimodal Llama 4 the incorporated policy
  withholds the grant from EU-domiciled users — treat that as **geographicRestrictions: "unverified,
  read the policy"**, not as a settled fact, because a wrong answer here either blocks a market we
  can serve or ships us into a market we cannot.
  Note also that the Llama 2-era requirement to disclose training-data information to derivative
  users is *not present* in the Llama 4 text we read; do not carry the old clause forward in the
  registry row by habit.
- **Non-commercial weights** (many research and audio models, `-NC` or `cc-by-nc` weight files) —
  `commercialUse: "no"`. `guard()` returns `blocked` and the nextAction is the row's exit list. No
  amount of "we only ran it locally" converts that; the restriction is on use, and we use it for pay.
- **Fine-tunes and LoRAs** inherit the base model's obligations in these licences; a community
  "MIT" label on a derivative checkpoint on a hub does not remove them. Record the base, the
  derivative and both texts.

### Proprietary services that are free to start

`proprietary-service` and `proprietary` rows are the family where the marketing page and the licence
disagree most often. Verified current state of the audio/film-relevant ones:

- **OpenAI (ROW) Terms of Use** — *"As between you and OpenAI, and to the extent permitted by
  applicable law, you (a) retain your ownership rights in Input and (b) own the Output."* Read that
  as exactly what it is: a bilateral allocation, conditioned on "to the extent permitted by
  applicable law". It cannot give a client rights a third party holds, and it cannot create
  copyright where the law requires a human author (§9.2).
- **Adobe Firefly** — commercial use and IP indemnification are **separate questions**, and the
  indemnity is scoped by product, plan and model (Adobe's own enterprise help page limits it to
  specified generally available Google and OpenAI media models made available through Firefly
  Creative Production for Enterprise). Never write "Adobe indemnifies our output" on a surface.
- **ElevenLabs / Suno / Udio** — free tiers are **personal use only**; commercial rights arrive with
  a paid plan, and the plans differ by *channel*: reported that film/TV/large studio game rights
  sit behind an Enterprise plan while lower plans stop at streaming-safe rights, and that Suno's
  free tier grants no commercial rights at all. The plan row is the licence. `guard()`'s
  `proprietary-service` branch is right in shape (client-work cleared, `platform-bundle` blocked:
  *"A rented service cannot be shipped as if it were APEX's own"*), but the cleared verdict must
  name the plan, and the plan is a per-project cost line, not a constant.
- **CapCut / stock-image "free" libraries / watermark tiers** — free does not mean redistributable,
  and platform watermarks are a delivery defect. `guard()`'s `proprietary` branch:
  *"Free to use is not free to redistribute"* — operator-side only, never bundled.
- **Bring-your-own-key only.** The nextAction for a `proprietary-service` row that wants to ship is
  always "Expose it as a bring-your-own-key connector only". The driver already refuses to lend
  compute: `replicate.ts` fails with *"no API key — BYO required, APEX does not lend compute"*.
  Keep that. When a client pays with their own key, their contract with the provider carries the
  obligation; when we pay with ours, we are the merchant of record for that tool's output and we own
  the plan-row exposure.

---

## 9.2 The generated-output problem, honestly stated

Three fields exist in `TechRecord` precisely because "the output is yours" is a sales sentence, not
a licence sentence.

**`outputConditions`** — what the licence says about what the tool produces. Reality by family:
open-source code licences say *nothing*; OFL explicitly disclaims application to documents; RAIL
constrains use but not output; hosted providers write a bilateral clause ("you own the Output, to the
extent permitted by applicable law"); image/audio services write plan-tiered commercial rights with
channel carve-outs. A row whose `outputConditions` is `"unverified"` cannot support any claim about
that tool's output. `guard()` does not currently consult `outputConditions`, so this is a **documented
gap that a human must read into the verdict** — do not treat "cleared for use" as "cleared to claim
the output".

**`trainingDataDisclosure`** — what the project discloses about what it was trained on, and what it
requires *us* to disclose about ours. Three separate duties, easy to conflate:
1. *the licensor's* disclosure (often none; datasets behind a paper, sometimes a data card);
2. *our* disclosure to the client of which model, variant and checkpoint touched which shot —
   already structurally supported (`ManifestInput.toolDeclarations`, `generation-run` ledger events);
3. *regulatory* disclosure of AI-generated content in the delivered work, which for EU-facing
   distribution has been on a fixed date since 2 August 2026 under Article 50 of the EU AI Act
   (machine-readable marking of synthetic content by providers; disclosure duties for deepfake
   deployments; Commission guidelines and a Code of Practice on transparency of AI-generated content
   published in July and October 2026).
   Where we cannot answer (1), we say so in the delivery package rather than repeating the vendor's
   marketing word "licensed data". Unknown provenance is a **disclosed unknown**, recorded as
   `"unverified"` — the registry's default is not a bug to hide.

**Ownership: what we may say, and the hard stop.**

- `canPromote()` refuses `legal-conclusion` assertions. Therefore the platform **never** writes, in a
  receipt, a passport, a landing page or a delivery package: "the copyright belongs to X", "this work
  is original", "this output is free of third-party rights", "no infringement", "clear for
  distribution". Those are conclusions on facts we do not hold.
- The US position we can cite as *background fact* (not as advice): the U.S. Copyright Office's
  *Copyright and Artificial Intelligence, Part 2 — Copyrightability* report (17 January 2025) requires
  human authorship and treats prompts alone as insufficient, while protecting human selection or
  arrangement; *Thaler v. Perlmutter*, 130 F.4th 1039 (D.C. Cir., decided 18 March 2025), affirmed
  that a non-human cannot be an author.
- Australia has **no** statutory "computer-generated works" author provision of the kind some other
  systems have; protection attaches to an original work with a human author, and originality is about
  human skill and labour (*IceTV Pty Ltd v Nine Network Australia Pty Ltd* [2009] HCA 14; the earlier
  "sweat of the brow" framing in *Telstra Corp Ltd v Desktop Marketing Systems* [2001] FCAFC 12 must
  be read through *IceTV*), while false attribution of authorship is separately actionable
  (Copyright Act 1968 (Cth) Part IX, e.g. s 195AC). Current Australian policy is under active
  consultation (Attorney-General's Copyright and AI reference group submissions, 2025).
  **Cite this to a lawyer; never to a client.**
- The permitted sentence is the evidentiary one:
  *"This receipt records that key K signed a manifest naming hash H, listing tools T as declared by
  person P on date D. It does not establish authorship, ownership, originality, or that no earlier
  copy exists."* That is `psi.ts describeScope()` and `verify.ts notClaims()` in prose — the code and
  the copy must say the same thing.
- Where a provider's terms *do* allocate output to the payer, our honest sentence is: **"the plan we
  hold (or the client's own key and plan) allocates output to the payer as between them and the
  provider, subject to applicable law and third-party rights. We record which plan row was in force
  on which date."** Recording the plan row is the deliverable; the ownership answer is not ours to
  give.

---

## 9.3 Attribution chain: many hands, one film

A finished film touches: the client, the operator running each stage, contributing humans
(DP, voice actor, composer, editor), the tool authors, the model licensors, the asset librarians,
the stock and music suppliers, and agents acting on someone's behalf. The chain's job is not to
resolve who owns what. Its job is to make every claim visible with its evidence level attached.

**How the ledger records it.** `ledger.ts` `appendEvent()` takes `epistemic`, defaults nothing, and
hash-covers the row plus `prevHash`, so an edited earlier row breaks every later hash; the SQL layer
makes the same promise structurally (`"ledger events cannot be updated"`, `"...cannot be deleted"`,
retraction is an append). Relevant `EventKind`s: `asset-intake`, `generation-run`, `licence-declaration`,
`contributor-agreement`, `human-review`, `approval`, `version-cut`, `delivery-package`, `publication`,
`retraction`.

**The five things never to be silently converted** (`licenseguard.ts` header, quoted because this is
where the doctrine lives): a creator's claim is not a licence; a licence is not an agreement; an
agreement is not a verified signature; a verified signature is not a legal conclusion.

Chain design rules for the build:

1. **One row per hand.** Each contributor gets a `contributor-agreement` event: `actor` (human or
   agent, never collapsed into "system"), the statement in their words, `refs` = the hashes of the
   material they touched, `details` = role, date, the plan/version in force, and what they were told
   about AI use.
2. **`epistemic` is written by the check, not by the person.** A row stays `"claim"` until
   something lifts it: `signature-verified` only when a real PSI verification returned true
   (`canPromote()` refuses a `verified-signature` assertion unless `signatureVerified === true`), and
   `independently-checked` only for a genuine second recomputation. Self-assessment upward is the
   failure mode this field exists to stop.
3. **`openClaims(chain)` is the worklist.** Rows still marked `claim` are the gap list a delivery
   must either close or disclose. `deliveryPackage(chain, projectId)` is what a buyer checks without
   an account: the events, the canonical bytes they hash over, and the root.
4. **`passport.ts` `standing()` must ship next to any credit list.** Its sentence is deliberately
   unflattering — *"[handle]: N declared credits, none independently checkable yet"* — and
   `deriveContributions()` lifts rows from the ledger rather than letting them be typed in, so a
   passport inherits the epistemic weight of the event it came from. A passport is a **record of
   claims about work**, never a credential, never a score, never "verified contributor".
5. **The chain is evidence of claims, not truth.** The correct description of a ledger for a client,
   a buyer or a regulator: *"this is a tamper-evident record of what each party said and when, with
   the verification level of each statement attached."* The wrong description — "the truth about this
   film", "proof of ownership", "audit trail" — is banned by §9.5 and §9.6, and `verifyChain()` only
   ever answers *is the chain intact*, which is a question about editing, not about facts.
6. **Moral rights survive assignment.** Attribution and integrity rights of authors and performers
   sit in Part IX of the Copyright Act 1968 (Cth) and are not the same thing as copyright; consent
   arrangements are narrower and technically specific. The credit block on a film is therefore a
   `contributor-agreement` object with its own terms, not a courtesy list. Question for counsel:
   §9.8 Q7.
7. **Retract, never correct.** When a claim proves wrong, append a `retraction` naming the row it
   retracts and *why*. The original row stays. A ledger that can be tidied is not evidence.

---

## 9.4 Australian surface — the company as it is

Entity of record: **ROCKYFILMS888 PTY LTD** (VIC), ABN **71 672 237 795**, **not registered for GST**.
Confirm the live ABR record before each invoice run; the ABR entry, not this file, is the fact.

### What GST registration actually changes

The law, and the compliance action. Nothing else appears in this section.

- **When registration is required.** A business must register for GST when its **GST turnover is
  $75,000 or more** — measured as current month plus the next 11 months (projected GST turnover),
  with a $150,000 threshold for non-profit bodies. Registration below the threshold is voluntary and
  available. (ATO, *Registering for GST*; ATO, *Annual GST reporting* — the annual-reporting page
  confirms a registered business under $75,000 is a real, reportable state.)
- **What changes on the day of registration.**
  1. We charge **10% GST** on taxable supplies made in Australia — so the *consumer-visible price* of
     a subscription changes; GST is not a rounding error we can absorb silently at the till.
  2. Displayed prices must show the **single total price** the customer pays. Section 48 of the
     Australian Consumer Law and the government's fair-trading rule require the displayed price to
     include all charges, taxes, duties, levies and fees, with no unadvertised additions
     (business.gov.au, *Display prices*; ATO, *How GST works*). The checkout must therefore be
     GST-aware the same day registration happens, in both directions.
  3. We must **lodge and pay by BAS** on the ATO's cycle (quarterly at our size; monthly at higher
     turnover bands), keep records, and issue **complying tax invoices** so a business customer can
     substantiate their own claim. Refunding a customer after GST was paid is not just a money
     movement — it needs the correct adjustment paperwork.
  4. We become entitled to **credits for the GST included in what we buy** — the real economic effect
     on the tooling bill (rented GPU time, per-job generation, hosting, mailboxes, domains).
  5. **Cross-border supplies become a documented question, not an assumption.** Many sales of
     services and digital products to overseas customers are GST-free, but the conditions are
     specific to the supply and the customer's location at the time of supply (ATO, *Exports and GST*;
     *GST-free sales*; and, from the buyer's side, ATO, *GST on imported services and digital
     products*). Whatever we do must be recorded, dated and reproducible per transaction.
- **What registration does not change.** It does not change the ACL obligations below, it does not
  change licence obligations, and it does not make any public statement about us lawful or unlawful.
- **Compliance actions for the build.**
  - Store `gst_status` and `gst_registration_date` as **facts about the company, entered by a human
    with a source** (ABR/ATO notice), never inferred from revenue.
  - Make the price renderer total-price-first: one field, `price_display_mode: "incl" | "excl"`, and
    the checkout refuses to render "excl" to an Australian consumer.
  - Emit a complying tax invoice (with our ABN, GST amount, and date) for every B2B invoice, and a
    credit note path for every refund, including refund of a "break-the-math" promise.
  - Put the money channel (Stripe/Gumroad/Lemon Squeezy or the crypto invoice) on the same record as
    the invoice, so a refund is traceable to an event in `apex_ledger_events` (money trail and
    evidence trail must not be two different truths).
  - Ask the accountant the *documented* questions in §9.8 Q8 before the first invoice to a non-Australian
    buyer, and before the first refund.

### Consumer law on a refund / "break-the-math" promise

The current offer shape (EMPIRE_STATE §4, sale #1): free sealed sample → live walkthrough →
**A$5,000 refundable, 14-day "break-the-math" guarantee**. That is a voluntary, advertised money-back
promise. The obligations it triggers:

1. **Consumer guarantees are not ours to reduce.** Under the ACL, goods and services carry statutory
   guarantees (acceptable quality, fit for purpose, due care and skill, reasonable time, and the
   related provisions), and **section 64 makes a term that purports to exclude, restrict or modify
   them void**, with s 64A allowing only limited deferral of remedies for service failures
   (Competition and Consumer Act 2010 (Cth), Sch 2, Subdivision C "Guarantees not to be excluded etc.
   by contract"; ACCC and Consumer Affairs Victoria guidance). A paid verification service is a
   *service*: due care and skill is the guarantee a buyer can hold us to regardless of what our
   contract says.
2. **Never misdescribe the guarantee we chose.** It is unlawful-adjacent and an ACCC enforcement
   target to tell a buyer that rights do not exist, cannot be claimed, or are replaced by our
   promise; misleading representations about the existence, exclusion or effect of a guarantee are
   actionable. Concretely: the checkout and terms must **not** say "no refunds except under our
   guarantee", "all sales final", "you waive your guarantees", or "our guarantee replaces your
   statutory rights". Correct wording: *"Our published money-back promise is in addition to your
   statutory rights, which cannot be excluded."*
3. **A published promise is a promise.** Under ACL s 18 (misleading or deceptive conduct) and the
   representations provisions, an advertised refund commitment must be **factually honourable on its
   stated terms**: the trigger ("a reproducible mathematical break"), the criteria, the reviewer
   count, the window, and the payout path must all be written down *before* sale, be objectively
   checkable by someone who is not us, and be paid when met. A 14-day window that our own process
   cannot physically complete inside is a misrepresentation, not a policy preference. If two-pipeline
   recomputation plus a human second pass takes longer than 14 days, either the promise or the
   pipeline changes — the deadline is the thing we owe.
4. **Money buys process, never outcome** (§2 extortion line). The guarantee must be drafted so that
   the *fee* is refundable on the published criteria and the *result* is produced only by the math.
   No tier, discount, or relationship may be described as affecting the result; no fee may be
   described as buying silence, suppression, or re-flagging (banned vocabulary in §9.5).
5. **Small-business contracts get the same scrutiny.** Our buyers are largely businesses. The unfair
   contract terms regime covers standard-form consumer **and small business** contracts — a business
   qualifies with **fewer than 100 employees or under $10 million annual turnover** — and since
   9 November 2024 courts can impose civil penalties for *including or relying on* an unfair term
   (ACCC, *Contracts*; ACCC media release on the law change; KLGates/Dentons summaries of the expanded
   regime). Terms to remove from our engagement letter: unilateral variation, unlimited liability
   caps, fees that survive a failure by us, auto-renewal traps, and "we may change the criteria at any
   time".
6. **Printed numbers carry their date.** Any PDF quoting a live ledger or challenge counter prints
   its as-at timestamp and points to the live page; an undated printed number becomes false within
   hours (EMPIRE_STATE §10).
7. **Refund mechanics.** The promise must state: currency, who pays the payment-processor fee back,
   whether a partial refund is possible, and what evidence the buyer must provide to claim. State it
   once, plainly, and never in a way that requires the buyer to argue with us about the math.
8. **Privacy and marketing obligations that attach to the same checkout** (not GST, but the same
   Australian surface): the APPs under the Privacy Act 1988 (Cth) with notifiable data breach duties,
   collection notices naming us as the entity, and — since **10 June 2025** — a statutory tort for
   serious invasions of privacy in Schedule 2 of that Act (OAIC, *Statutory tort for serious invasions
   of privacy*; Landers; Astris). Marketing email must carry sender identification and a working
   unsubscribe (Spam Act 2003 (Cth)). These are §9.7 and §9.8 Q9 items because receipts are
   public-by-design.

---

## 9.5 The vocabulary fence

Canonical vocabulary comes from EMPIRE_STATE §4 (2) LEGAL FENCE and §2. A public surface may contain
only the left column. The right column may not appear on a website, a receipt, a deck, an invoice, a
badge, or an email that leaves the building — the reason is stated for each.

| Use | Never | Why |
|---|---|---|
| **verification reward** | bounty | "bounty" reads as a prize for an outcome and drifts toward wagering/gambling framing plus payment-for-results. A reward for *doing the verification work* is what we actually pay. |
| **recomputation result** | finding, accusation, breach, violation, error, exposure | we do not adjudicate. `canPromote()` refuses a legal-conclusion assertion; a word that asserts a breach is an unrecordable legal conclusion printed on a public page. |
| **independent verification service** | audit, audited, assurance, inspection, certification, compliance check, "we are compliant" | audit and assurance are named regulated practices with their own standards, and "compliance" asserts a legal conclusion about someone else's conduct. Public copy says "no claim of compliance outcome". |
| **legal advice** → **not legal advice** | advice, counsel, opinion | we are not licensed to give it; a client relying on a receipt as advice is the harm the fence prevents. |
| **licensed custodian** (third party, named, holding funds) | escrow, "we hold your funds", "held in trust by APEX", trust account | self-held escrow of other people's money is a financial-services licensing exposure and a conflict: we would be referee and bank. Escrow is built only when the arena opens, and only through a licensed custodian. |
| **evidence of claims** / **record of what was stated** | truth, proof of ownership, verified owner, the real record, provenance of truth | the ledger's own `epistemic` field says a claim is a claim. A "truth" claim is the exact upgrade the module exists to refuse. |
| **tamper-evident chain** | audit trail, immutable ledger of facts | see audit; and "of facts" converts claims to findings. |
| **open verification protocol** | standard, "the standard", industry standard | individual IETF internet-drafts are not standards; already corrected once on /protocol and /challenge. Only the Certification Mark clause may read as a mark, and only when the foundation exists and issues it. |
| **money-back promise on published terms** | guarantee (unqualified), "guaranteed accurate", "no risk" | "guarantee" has a specific ACL meaning we must not blur or appear to displace (§9.4: s 64, and misdescribing guarantees is actionable). Say "we will refund A$X if Y, and this is in addition to your statutory rights". |
| **free, forever: sealing, verification, receipt export** (`FREE_FOREVER`) | verification tax, toll, paywall on checks, "unlock verification" | charging to prove a record is closed as a business path. A fee-gated check converts proof into leverage — the extortion line in §2. |
| **rectification = paid verification, math decides the result** | pay to suppress, pay to unflag, take-down for a fee, "resolution package", quiet word | a fee that changes a result is extortion with an invoice attached; explicitly rejected as a business path. |
| **no adverse action** (stated about our own process only) | we will not harm you, warning, ultimatum | the letter we serve must not read as a threat; describing our *process* is allowed, implying consequence to the subject is not. |
| **we express no opinion on the underlying conduct** | we believe, we conclude, it appears, suspicious | the third dissolving sentence; any hedged opinion is still an opinion. |
| **first / largest / only** → must wear the date | naked superlatives | §2: on a legal surface, "first" prints as genesis date + live figures + an open invitation to produce an earlier public timestamp. No date, no boast. |
| **the subject, the entity, the document** | a named person or company in a hostile frame | naming a target inside an accusation-shaped sentence is the defamation vector; the three dissolving sentences must sit above any named entity on a public surface. |

**The three dissolving sentences** — verbatim, always together, always above the numbers, on every
surface that names an entity or carries a receipt about someone else:

1. **This is not a prediction market.**
2. **We work only with public documents.**
3. **We express no opinion.**

They dissolve three specific misreadings: that a reward invites betting on an outcome; that we
obtained private material; that our output is a judgment about conduct. If any one is missing, the
page is not publishable.

**Dead-brand rule, restated because it is vocabulary:** `digital-gallows` and any gallows-derived
public name appear nowhere (dead brand, §2). Historical evidence files are exempt only because they
are evidence, and they are never shipped to a public surface.

---

## 9.6 What a receipt must never imply

A receipt is the most legally loaded artefact this platform makes: it looks like a certificate, it is
read as one, and it is not one. The rule set:

**A receipt proves, and only this:**
- the named key signed this exact canonical manifest (`signature: pass`);
- the file the checker holds hashes to the hash the manifest names (`fileMatches: pass`);
- an anchoring proof is attached and parseable, if the creator chose to anchor (`anchor: pass`).

**A receipt must never imply:**
1. **A seal is an audit trail.** `verifyChain()` answers "was this edited", not "is this true". The
   manifest's `toolDeclarations` are *as declared by the creator*; `attribution` and `licenceTerms`
   are strings somebody typed. A receipt is a signed statement about claims, and the reader must see
   the word "declared" next to them.
2. **Verification is not a product.** `FREE_FOREVER = {seal: 0, verify: 0, exportReceipt: 0}` and the
   SQL policy comment *"a delivery recipient must be able to read the evidence without holding an
   account — verification is free forever and is never the paid lock"*. No paywall, no account, no
   rate limit, no "premium verification", no metered read. (Hotfix precedent: GET `/v1/verify` was
   made keyless because *"reads are never metered, only notarize writes are"*. Same rule for this
   repo's public verify route.) A tier that unlocks a check is the business path we already closed.
   *Doc defect to fix, not to argue:* `psi.ts` `FREE_FOREVER.note` currently reads
   `"charging to prove a record is closed as a business path"` — the intended sentence is the
   negative. Correct it in a later src pass; until then no public copy quotes it.
3. **Nothing is pay-to-suppress.** The schema contains no operation that removes, hides, renames or
   re-tier a receipt; `receipts are immutable` / `undeletable` policies enforce it, and a retraction
   is an appended event. Therefore the platform cannot offer, hint at, price, or accept a payment
   that changes what a receipt says or whether it is findable. Absence of a delete path is the
   technical argument for the promise, so it must stay absent.
4. **Money buys process, not outcome.** The fee list may only ever describe *how much checking is
   done*: sample scope, recomputation pipelines run, human second passes, turnaround. No document may
   describe a fee as changing *what the check returns*, the reward's eligibility, or the verdict. The
   standing challenge pays only on a two-pipeline-verified mathematical break; a "valid contest" is
   exactly that, and never a matter of our discretion.
5. **Not authorship, ownership, originality, or priority.** `describeScope()` already prints it:
   *"not proven by this receipt: who made the work, who owns it, or that no earlier copy exists."*
   `verify.ts notClaims()` repeats it. The words **authentic**, **genuine**, **owned by**,
   **created by**, **original**, **first to create**, **uniqueness** may not appear in a receipt, its
   badge, or the verify page. An anchor proves a hash existed by a moment — not that nobody held it
   earlier.
6. **Not a compliance, safety or quality verdict.** No "AI Act compliant", "EU AI Act ready", "Art.50
   satisfied", "safe", "licensed data", "clean", "no copyright risk", "training-data verified". Where
   the manifest legitimately carries facts that feed someone else's compliance work, it must be
   labelled **input to your assessment, not an assessment**.
7. **Not a credential, score or endorsement of a person.** `standing()` must be exported with any
   passport; three self-declared rows are not evidence of work, and the count must not be styled like
   a rank. No "verified contributor" badge from a receipt alone.
8. **Not a legal instrument we control.** `verify.ts` runs on any machine with no APEX call — *"this
   verdict ... does not depend on APEX servers"*. A receipt that needs our API to be readable is a
   lease, not a receipt. The same rule is why `verify` reports `cannot-check` rather than silently
   passing when the checker holds only the receipt, and why `attachAnchor()` refuses a placeholder:
   a receipt stamped "pending" teaches people to distrust receipts.
9. **Not a live number printed dead.** Any receipt or PDF carrying a counter prints its as-at
   timestamp plus the live URL.
10. **Not an identity of us.** The recipient-facing record says **independent verification service**
    and the custodian/anchoring facts; it does not say "APEX certifies", "APEX guarantees", or
    "APEX endorses", and it never carries a personal name or phone (§2).

---

## 9.7 The security fence

### 9.7.1 Live credentials in a tracked file — measured, not assumed

**Fact (verified in this repo today):** `.env` **is tracked by git** (`git ls-files` returns `.env`;
commits touching it include `3696e85`, `7fd500a`, `6da03fe`), and `.gitignore` does **not** list it.
Variable **names** present (values are never written here, in any log, or in any chat or memory file):

`SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`REPLICATE_API_KEY`, `OPERATOR_API_TOKEN`.

Names read from code but absent from `.env`: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
`STRIPE_SECRET_KEY`, `LOVABLE_API_KEY`, `NODE_ENV`, plus the local-tool paths
`APEX_FFMPEG_BIN`, `APEX_WHISPER_BIN`, `APEX_BLENDER_BIN`, `APEX_COMFY_URL`, `APEX_OLLAMA_URL`,
`APEX_LOCAL_LLM`.

Severity, stated without drama:

- `REPLICATE_API_KEY` and `OPERATOR_API_TOKEN` are **secret-class** values in a **versioned** file.
  Anyone who can read the repo can call a paid generation provider on the company's bill and act as
  an operator. A value that has ever existed in a tracked file is treated as **disclosed**; the only
  fix is revocation at the provider, and rewriting git history afterwards is hygiene, not
  remediation, because it does not un-leak the value.
- `SUPABASE_PUBLISHABLE_KEY` (and its `VITE_` twin) are **client-visible by design**; they are not
  secrets, and their presence is not a finding. What must be true because they are public is RLS:
  `supabase/config.toml` plus the migrations enable RLS on `apex_ledger_events`,
  `apex_receipts`, `apex_passports`, and deliberately make receipts `select using (true)` (public by
  design) while blocking update and delete. **Test before shipping anything: does the publishable key
  alone let a stranger write to a table or read a row that is not meant to be public?** Publishable
  key + a permissive policy is a leak, and the policy is the secret.
- `SUPABASE_SERVICE_ROLE_KEY` is named in code and correctly **absent** from `.env`. It must never
  enter a tracked file, a client bundle, a log, or a ledger `details` field. It belongs only in the
  server-side secret store, read inside a function (`config.server.ts` explains the `.server.ts`
  suffix keeps it out of the Vite client bundle, and warns that `VITE_*` values ship to the browser).

**Actions, in order, before any client work:**
1. Revoke and reissue `REPLICATE_API_KEY` and `OPERATOR_API_TOKEN` at the providers; the replacement
   goes to the platform secret store (hosting secret/env/secrets-manager), never to the file.
2. Remove `.env` from tracking (`git rm --cached .env`) and add it to `.gitignore`; commit with the
   message naming this section. If the repo is or becomes public, decide separately about history.
3. Keep a committed, value-free template — `.env.example` — carrying only names and a comment per
   name: what it unlocks, who may hold it, where the real value lives, and its rotation date.
4. Add a CI check that fails on any secret-shaped string in a tracked file, matching **both** shapes:
   the `user:token@host` form and the bare token class (`ghp_…`, `github_pat_…`, `sk_live_`,
   `r8_`, JWT-shaped). A blank sweep result is a claim about the sweep: prove the sweep finds a
   known-positive file before believing "clean". Never sweep with a regex that can truncate a
   credential; hash the full bare value when fingerprinting.
5. Backup **after** purge, never before — mirroring first copies the live credential to a second
   place and labels it safety.
6. Rotate on a documented cadence and on every departure/contractor end; record rotation as a ledger
   `human-review`-class event with the date and the actor, no value, no hint.
7. Precedent to follow, not to repeat: EMPIRE_STATE §3 records *"a live token sat in this file;
   Master rotates it in hPanel tonight; a token is never pasted into empire memory again"*, and §32
   leaves an open action to *"rotate the plaintext placeholder admin key in
   _MARKETING_STACK/APEX_ADMIN.env"*. Memory files, `dev-server.log`, `npm-install.log`, `tsc*.log`
   and any `*.log` in this repo are **not** secret storage; `.gitignore` already excludes logs —
   verify that no log currently holds a value before relying on it.

### 9.7.2 Redaction in logs

`replicate.ts` has the right pattern and the wrong coverage:

```ts
/** Never let a credential echo back through an error body into Creative Memory. */
function redact(s: string, key: string): string {
  return key ? s.split(key).join("[redacted]") : s;
}
```

It replaces only **that driver's** key. Requirements:

- One shared redactor, used by every driver and every connector (`ollama`, `comfyui`, `ffmpeg`,
  `blender`, `whisper`, `cli-drivers`, `connectors`, `supabase`, `cost`), applied to: `JobResult.log`,
  error text, request/response bodies, and any string written to `details`/`response_log`.
- The redactor is **value-list driven**, not name-list driven: it strips every registered secret
  value plus shaped patterns (Bearer/`Token` headers, `key=` query params on provider URLs, JWT shape,
  long base64/hex runs), because providers echo request URLs and headers into error bodies, and a
  signed asset URL is itself a credential.
- Redaction happens **before** storage, not at display. `response_log` rows are persisted in Supabase
  and the ledger is exported in a `deliveryPackage` — anything written there is public by default and
  permanent by design. Unverified rule to close in review: does `redact()` cover the signed
  Replicate output URL that lands in `outputs`? An expiring URL in a public receipt is a hole.
- Never log: a private key (any form, any length), a seed/PEM/mnemonic, `Authorization` or
  `Cookie` headers, full request bodies containing client media paths, card or wallet material, or
  a client's identifiable subject data beyond what the receipt deliberately publishes.
- Every log line carries `as-at`; counters in logs are snapshots, not truth.

### 9.7.3 Keys and exported records — the absolute rules

- A **private key never leaves its device and never enters a record**. `psi.ts seal()` takes the PEM
  as an argument and derives the public half; it does not store the PEM. `passport.ts
  generateIdentity()` creates the pair locally and returns `privateKeyPem` only to the caller's
  device. The migration comment is explicit: *"the private key is never a column"*.
- `importPassport()` **throws** if the blob contains `privateKey` or `privateKeyPem`. Keep that, and
  extend the same refusal to receipt blobs, delivery packages, ledger rows, ledger `refs`/`details`,
  Creative Memory entries, and any CSV/JSON export — one shared validator: *no field of any exported
  object may be shaped like a private key* (PEM headers, PKCS#8 base64, seed-like 32-byte runs).
  Test it by feeding an export containing a *known dummy* key and demanding a rejection.
- Creator keys: custody and recovery are a **licensed/third-party or split-shard** problem, never
  "we hold them". Genesis/root key stewardship follows the Guardian Lock design (3-of-5 shards,
  geographically distributed, tripartite human custody at foundation formation, written succession);
  no single-person, single-file master key on one laptop is acceptable for anything that signs on
  behalf of users or the trust root.
- Anchoring proofs must be real objects (`attachAnchor()` rejects a short/placeholder proof); the
  same refusal applies to a security field — "rotation pending" is not a value, and a
  `lastRotated: null` row is visible in the queue, not hidden.
- Signing path for the company's own seals stays on the operator's device or a hardware-backed key;
  no service-role-style server key may seal on a creator's behalf unless the ledger records
  `actor.kind = "system"` and the receipt's `describeScope()` sentence about *who signed* still reads
  true.

### 9.7.4 The moment-of-use licence gate (the rule that ends arguments)

**An unverified licence blocks client work at the moment of use, not at the moment of review.**

- The gate is `isClearedForWork(rec)` → `licenseVerified && commercialUse === "yes"`, reached from
  `models.ts eligible(slot)`, and `guard(rec, "client-work")` must be evaluated **inside the run
  path**, immediately before the tool is invoked — not in a planning screen the operator can skip.
- Verdict handling, one sentence each for the operator:
  - `cleared` → run, and seal the decision in the ledger (`generation-run` with the row's
    `license` + `lastVerified`).
  - `verify-first` → **stop**. Print `reason` and `nextAction`; the next action is reading a licence
    text and dating it, which is a human act (`applyHumanRead`). No agent may set
    `licenseVerified`; the check *"no agent marked a licence as human-read — 0 rows"* is the guard
    against exactly that.
  - `blocked` → **stop**. The row's `replacementOptions` list is offered; a row with an empty exit
    list is not adopted and not usable (`admissible()` requires a written exit).
- `platform-bundle` is a **second, later gate**. Clearing (a) does not clear (b): redistribution and
  copyleft are re-tested at bundle time, which is why `guard()` re-checks them.
- Failure must be loud and cheap. Today `replicate.ts` returns `state: "failed"` with a reason string;
  for a licence stop the reason must name the row and the nextAction, and the run must not be billed
  as compute.
- The gate is not a moral preference, it is the mitigation for a specific legal and commercial
  exposure: offering a tool to a client whose licence we have not read misrepresents our right to
  provide it (ACL s 18 / s 29 framing), may breach the licence for the client's benefit, and may bind
  the client's deliverable to obligations they were never told about.

### 9.7.5 Security facts we must not overstate

- `securityStatus` is `"unverified"` on all rows by default. `discovery.ts` surfaces the supply-chain
  posture source (`openssf`) and records its blind spot: *"creative tools that are not packaged as
  dependencies"*. So: no CVE absence claims, no "no known vulnerabilities", no security
  certification, no "pen-tested", no SOC2, no "bank-grade encryption".
- Known real limitations to keep visible rather than fix with adjectives: the shipped
  `psi-verifier-py.verify()` checks structure but **not** the Ed25519 signature nor the anchor, so a
  structurally-valid seal with a forged signature passes — the *stranger-verifiable* promise is only
  complete once signature + anchor are checked (EMPIRE_STATE §32(f)(i), still open). And the
  three-way licence conflict on our own surfaces (Apache-2.0 README vs MIT spec vs proprietary engine)
  is unresolved: **we cannot enforce a licence doctrine we have not applied to ourselves.** Both are
  stop-conditions for public claims, not backlogs.
- No public surface may say "unhackable", "tamper-proof", "military-grade", or "post-quantum secure".
  PQ claims are *algorithm names and test results with dates*, not security guarantees.

---

## 9.8 Open questions that must go to a lawyer

Each is written so it can be pasted into an instruction sheet without rewriting. Send with the entity
details, the offer terms, and a copy of this section. Nothing here is a request for a scheme; each
asks for the law and our compliance path.

**Q1 — Output allocation in Australia.** "We operate generative AI tools for paying clients and
deliver rendered media. Advise whether, under the Copyright Act 1968 (Cth), a work produced by a
human directing an AI tool can be the client's copyright work, what contractual wording best records
the human contribution, and whether our own terms should avoid the word 'own' where a provider's
terms say 'to the extent permitted by applicable law, you own the Output'. Please also confirm what
we may say about output rights on a public page without giving advice."

**Q2 — Copyleft boundary in our business shape.** "Our tools run (i) on the operator's machine for a
single client, (ii) in a hosted web app where clients interact remotely, and (iii) bundled inside
software we distribute. For GPL-2.0, GPL-3.0, AGPL-3.0, LGPL-2.1/3.0 and MPL-2.0 components, tell us
in each case whether we are conveying or making available, what Corresponding Source must be offered,
to whom, and what build shape (separate process vs linking vs pure CLI) keeps our own code unaffected.
Do not assume that because the client supplies the tool the obligation is theirs."

**Q3 — Model-licence flow-down.** "For OpenRAIL/OpenRAIL-M style use restrictions and for the Llama
4 Community License plus its Acceptable Use Policy: what must we reproduce, and to whom, when we
fine-tune weights and let a client use the fine-tune? Can the restrictions be passed on by contract
rather than by shipping text? Is the reported restriction on EU-domiciled users applicable to an
Australian operator serving an Australian client? Please identify the exact clauses."

**Q4 — Free-tier and plan-row commercial rights.** "Our catalogue includes services whose free tier is
personal-use only and whose commercial rights are tiered by distribution channel (film/TV/streaming/
large studio game). Confirm the risk profile of operating a paid client job on a lower plan than the
one the service reserves for film delivery, and what disclosure to the client is required where the
plan does not cover the client's intended distribution."

**Q5 — Fonts and the delivered film.** "Confirm that a SIL OFL 1.1 font used to render titles and
credits creates no attribution obligation in the rendered work, that bundling the .ttf in our
installer requires shipping the licence text, and that Reserved Font Name rules bind us if we ship a
modified family."

**Q6 — Content licences inside a client deliverable.** "Advise on the practical handling of CC BY-SA
(ShareAlike) and CC BY-ND / BY-NC-ND assets appearing inside a delivered film, including whether
ShareAlike can reach the delivered edit, and what per-asset record satisfies a reasonable belief that
we had the right to include it. Also advise on CC0's non-covered rights (patent, trademark, publicity,
privacy, third-party components)."

**Q7 — Moral rights across many contributors.** "Under Part IX of the Copyright Act 1968 (Cth),
advise what wording we need in a contributor agreement to handle attribution and integrity rights of
authors and performers, whether consent instruments are enforceable as drafted for each category
(copyright assignment vs licence vs credit-only), and whether our credit-block process needs a
dispute path."

**Q8 — GST and the invoice/refund mechanics.** "We are ROCKYFILMS888 PTY LTD (VIC), ABN 71 672 237 795,
currently not registered for GST. Confirm the point at which registration becomes mandatory for
subscription revenue, what our invoicing and BAS obligations become, whether our sales to overseas
buyers are GST-free and on what evidence we must hold that view, and what documents (tax invoice,
credit note) we must produce when we pay a refund under our money-back promise. Please advise the
accounting records to keep per transaction rather than the strategy."

**Q9 — The refund promise under the ACL.** "We advertise an A$5,000 refundable, 14-day 'break-the-math'
promise to business buyers. Review the wording for: (i) any risk of misdescribing or displacing
non-excludable consumer guarantees (ACL s 64/64A and representations about guarantees); (ii) whether
the promise is a representation we can honour inside 14 days given our two-pipeline process; (iii)
unfair contract terms exposure under the small-business limb (fewer than 100 employees or under
$10m turnover) now that penalties apply; (iv) the exact checkout/terms sentences you would approve."

**Q10 — Receipt language and defamation.** "A public, permanently readable receipt will name a third
party, a document hash, a date and our recomputation result, with three dissolving sentences above it
('This is not a prediction market. We work only with public documents. We express no opinion.') and
'no adverse action' language in related correspondence. Advise whether that is defensible against an
imputation-based claim, what words must never appear, whether the reward mechanism needs a published
set of rules to avoid being characterised as a prohibited gaming/betting arrangement, and whether our
payment of a verification reward needs published, objective criteria."

**Q11 — Regulated-practice boundaries.** "Confirm the line between our permitted description
('independent verification service', 'recomputation result') and regulated activities: audit and
assurance opinions, legal advice, credit/financial product opinions, and the use of the words
'certification' and 'compliance' in marketing a mark we intend to control."

**Q12 — Custody of funds.** "Any buyer deposit or reward pool must sit with a licensed custodian,
never with us. Advise what arrangement is lawful and minimal at our scale, what must be disclosed to
the paying party, and what we must *not* do (no trust account in our own name, no holding client money
while also referee-ing their matter)."

**Q13 — Privacy Act duties around public receipts.** "Receipts and ledger rows are publicly readable
by design and can contain a handle, display name, location, role and a person's statement. Advise
whether ROCKYFILMS888 or its successor entity is subject to the APPs at our size, what collection
notice and privacy policy wording we need, the notifiable-data-breach steps we must be able to run,
and what our exposure is under the statutory tort for serious invasions of privacy commenced
10 June 2025 — including which fields we should refuse to publish."

**Q14 — Cross-border disclosure of synthetic content.** "Where a client's film reaches the EU, what
Article 50 transparency obligations attach, to whom (provider/deployer), and what must our delivery
package record so the client's own obligation can be met? We want the marking and disclosure
requirements stated, and confirmation of what we must not claim about compliance."

**Q15 — Our own licence.** "Three surfaces currently disagree: the verifier README says Apache-2.0,
the spec repo is MIT, the engine is proprietary. Advise a single doctrine for the platform's own
code, spec, marks and trademarks — including whether a certification mark is the right instrument and
what rules, and who may issue it."

---

## 9.9 What this means for the build

1. **The stop condition.** 1,109 of 1,109 registry rows await a human licence read and **zero** rows
   clear `isClearedForWork()`. With `guard()` in the run path, the platform therefore refuses every
   client job by construction. **No client may be invoiced and no tool may be offered until named
   rows are read, dated via `applyHumanRead()`, and cleared for the specific use case.** The first
   deliverable is not a feature; it is a licence-read batch. Sequence it by `priority: "now"` rows
   that are actually on the film path (per stage: ffmpeg, Blender, Kdenlive, Whisper, Ollama, ComfyUI,
   one `proprietary-service` generation provider), and put the three-way licence conflict of our own
   code (§9.8 Q15) in front of it — we cannot hold rows to a doctrine we have not applied to
   ourselves.
2. **Gate placement is a build requirement.** The licence verdict is computed inside the run path,
   per tool invocation, per use case, and written into the ledger row for the run. Any implementation
   that caches a "cleared" list from a planning screen is a fence failure.
3. **Two gates, never one.** `client-work` and `platform-bundle` are separate verdicts; shipping a
   tool inside the product re-tests redistribution and copyleft.
4. **The words are as load-bearing as the code.** Public copy, receipts, badges, invoices and emails
   use §9.5 only; the three dissolving sentences sit above anything that names an entity; and no
   surface claims compliance, ownership, truth, or security it cannot check offline.
5. **Verification stays free; nothing that changes a result is ever sold.** The absence of an update
   or delete path in the ledger and receipt policies is the argument we make publicly — it must remain
   technically true.
6. **Unverified is a state we publish, not hide.** `reviewQueue()`, `openClaims()`,
   `standing()` and `securityStatus: "unverified"` exist so the honest gaps stay on the surface. A
   number without a date, a claim styled as a fact, or a licence string without a reader's date is
   the same class of defect.

---

## Sources read for this section (verified 2026-11-01)

Licence texts: [SIL Open Font License official text](https://openfontlicense.org/open-font-license-official-text/) ·
[GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html) · [GNU AGPL v3 §13](https://www.gnu.org/licenses/agpl-3.0.html) ·
[Apache Licence 2.0](https://www.apache.org/licenses/LICENSE-2.0) ·
[CC BY-NC 4.0 deed](https://creativecommons.org/licenses/by-nc/4.0/deed.en) ·
[CC BY-NC-ND 4.0 deed](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.en) ·
[CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/) ·
[Llama 4 LICENSE (raw)](https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama4/LICENSE) ·
[BigCode CodeML OpenRAIL-M](https://www.bigcode-project.org/docs/pages/model-license/) ·
[RAIL FAQ](https://www.licenses.ai/faq-2) ·
[The Turing Way — licensing ML models](https://book.the-turing-way.org/reproducible-research/licensing/licensing-ml/) ·
[Hugging Face — OpenRAIL](https://huggingface.co/blog/open_rail)

Provider/output terms: [OpenAI Terms of Use (ROW)](https://openai.com/policies/row-terms-of-use/) ·
[OpenAI Service Terms](https://openai.com/policies/service-terms/) ·
[Adobe Firefly partner models & indemnity scope](https://helpx.adobe.com/firefly/web/work-with-enterprise-features/creative-production/partner-models-in-firefly-creative-production-for-enterprise.html) ·
[ElevenLabs music terms by plan](https://elevenlabs.io/music-terms) ·
[Stability — audio licensing/rights comparison](https://stability.ai/explainers/stable-audio-vs-competitors-licensing-export-rights-and-self-hosting-compared)

AI authorship: [U.S. Copyright Office, Copyright and AI Part 2 — Copyrightability (17 Jan 2025)](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) ·
[Thaler v. Perlmutter, 130 F.4th 1039 (D.C. Cir. 2025)](https://media.cadc.uscourts.gov/opinions/docs/2025/03/23-5233.pdf) ·
[DLA Piper — genAI copyrightability developments](https://www.dlapiper.com/en/insights/publications/2025/03/copyrightability-of-genai-outputs-in-the-us-key-developments) ·
[IBA — AI and copyright in Australia](https://www.ibanet.org/AI-and-copyright-in-Australia) ·
[Copyright Act 1968 (Cth), Part IX moral rights (AustLII)](https://www.austlii.edu.au/au/legis/cth/consol_act/ca1968133/) ·
[Arts Law — moral rights](https://www.artslaw.com.au/information-sheet/moral-rights/)

Australian tax/consumer: [ATO — Registering for GST](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst) ·
[ATO — Annual GST reporting](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-and-how-to-report-and-pay-gst/annual-gst-reporting) ·
[ATO — How GST works](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works) ·
[ATO — Exports and GST](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/australians-doing-business-overseas/exports-and-gst) ·
[ATO — GST-free sales](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-to-charge-gst-and-when-not-to/gst-free-sales) ·
[ATO — GST on imported services and digital products](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/gst-on-imported-services-and-digital-products) ·
[business.gov.au — Display prices](https://business.gov.au/legal/fair-trading/display-prices) ·
[Competition and Consumer Act 2010 (Cth) Sch 2 (ACL), Subdivision C — guarantees not to be excluded](https://www.austlii.edu.au/au/legis/cth/consol_act/caca2010265/sch2.html) ·
[ACCC — Consumer rights and guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees) ·
[Consumer Affairs Victoria — guarantees that apply automatically](https://www.consumer.vic.gov.au/consumers-and-businesses/products-and-services/refunds-repairs-and-returns/guarantees-that-apply-automatically) ·
[ACCC — Contracts / unfair contract terms](https://www.accc.gov.au/business/selling-products-and-services/contracts) ·
[ACCC media release — UCT law changes](https://www.accc.gov.au/media-release/businesses-urged-to-remove-unfair-contract-terms-ahead-of-law-changes) ·
[K&L Gates — Expanded UCT regime commenced](https://www.klgates.com/thought-leadership/Expanded-Unfair-Contract-Terms-Regime-Has-Commenced-Are-You-Compliant-11-10-2023) ·
[Dentons — UCT one-year/penalty commencement](https://www.dentons.com/en/insights/articles/2024/november/4/happy-birthday-to-australias-unfair-contract-terms-laws) ·
[DW Fox Tucker — consumer definition and limiting guarantees](https://www.dwfoxtucker.com.au/2024/06/when-are-goods-or-services-acquired-by-a-consumer-when-do-guarantees-under-the-australian-consumer-law-apply-can-suppliers-and-manufacturers-liability-be-limited)

Privacy and AI regulation: [OAIC — statutory tort for serious invasions of privacy (commenced 10 June 2025)](https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/statutory-tort-for-serious-invasions-of-privacy) ·
[Landers — privacy tort in force](https://landers.com.au/legal-insights-news/australia-introduces-landmark-privacy-tort-what-does-it-mean-for-you) ·
[EU AI Act Article 50 practical guide](https://artificialintelligenceact.eu/transparency-rules-article-50/) ·
[Stibbe — AI Act transparency obligations, rules and timeline](https://www.stibbe.com/publications-and-insights/the-ai-acts-transparency-obligations-rules-scope-and-timeline) ·
[European Commission — Code of Practice on transparency of AI-generated content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)

Repo evidence: `src/lib/apex/schema.ts`, `licenseguard.ts`, `discovery.ts`, `models.ts`, `psi.ts`,
`verify.ts`, `ledger.ts`, `passport.ts`, `drivers/replicate.ts`, `config.server.ts`,
`supabase/migrations/20261101190000_apex_ledger_passport.sql`, `scripts/apex-check.mjs`
(68 checks pass / 0 fail; `rows awaiting a human licence read: 1109 of 1109`),
and `C:\Users\apex1\.openhands\EMPIRE_STATE.md` §2 HARD RULES, §4 DOCTRINE (LEGAL FENCE), §8 DECISION LOG.
