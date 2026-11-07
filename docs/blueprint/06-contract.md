# 06 — Contract layer: the Film Verse on-chain surface

Status: blueprint, not built. Scope note, stated up front: the corporate protocol line is
parked (EMPIRE_STATE §4 locks "protocol as the lock" and "verification tax" as permanently
closed paths). Every contract in this section therefore serves the FILM VERSE only —
creators, credits, splits, licensing. Nothing here re-opens a protocol-fee business, and
no contract in this section is allowed to hold money for anyone.

Doctrine inherited from the code and enforced below, in each contract's semantics:
- A seal is an audit trail, not digital truth. It proves a statement was made at a time by
  a key; never that the statement's contents are true (psi.ts `describeScope`, verify.ts
  `notClaims`).
- Verification is free forever and is never the lock or a metered gate
  (psi.ts `FREE_FOREVER = {seal:0, verify:0, exportReceipt:0}`; supabase policy "ledger
  events are readable by their owner" keeps the read path accountless).
- Money buys process, never outcome. No pay-to-suppress, no pay-to-unflag
  (EMPIRE_STATE §2 line 26, §4 Rectification Covenant).
- History is immutable; a retraction is a new event, never an UPDATE or DELETE
  (20261101190000_apex_ledger_passport.sql, policies "cannot be updated"/"cannot be deleted").
- Private keys never leave the creator's device (psi.ts `seal` takes a PEM and stores
  nothing; passport.ts `importPassport` throws on any blob carrying a private key).

---

## 1. What the Film Verse actually needs on-chain — and what is theatre

The chain earns its place for exactly one property: **a public append log that APEX does
not operate**, for agreements whose credibility depends on APEX not being able to rewrite
them. That is the split registry (future royalty maths must not be silently editable by
the platform) and the batch-root witness (a cheaper, chain-native sibling of the Bitcoin
anchor that already exists).

**Keep on-chain (the five contracts in §2):**
1. Split registry — credits/royalty percentages co-signed by creator keys.
2. Licence terms registry — declarations of what a work permits/requires/refuses.
3. Attribution registry — collaboration and works-made-for-hire statements, both sides signed.
4. Anchor batch — the existing `batchRoot` posted periodically, optional, never a gate.
5. Paid-tier entitlements — for process conveniences only (see §2.5 for the hard limits).

**Cut as theatre — named and decided:**
- **Ledger events on-chain.** The hash-chained ledger (ledger.ts `appendEvent`/`verifyChain`)
  is append-only in Postgres and ships inside `apex-delivery/1` packages that anyone can
  recompute offline. Putting rows on-chain adds cost and changes what a buyer can verify —
  the delivery package already needs no APEX server. Cut.
- **Passport on-chain.** A passport is an exported document with a public key inside it;
  `standing()` deliberately reports "declared vs checkable" rather than minting a credential.
  On-chain passports turn self-declaration into false provenance. Cut. (Only the key→address
  binding message goes on-chain, §4.)
- **NFT "certified work" tokens / reputation tokens.** Minting a seal as an NFT implies the
  chain adjudicated the work's truth, authorship or originality — the exact claim
  `describeScope` refuses. It is also a re-badged "recognition monopoly" that the parked
  protocol line made radioactive. Cut permanently.
- **On-chain dispute arbitration, on-chain governance, token voting.** Legal adjudication
  belongs to legal systems; a contract that "resolves" disputes makes claims no court
  will honour. Cut.
- **Any contract holding royalties or escrow funds.** See §2.2 — custody is routed to a
  licensed custodian or cut; the contract holds terms and hashes, never money.

## 2. The contract set

Common substrate for all five: contributors are identified by an EVM address plus their
passport Ed25519 SPKI key bound by a signed statement (§4). All contract inputs that carry
agreement text take the **hash of the canonical JSON** produced by ledger.ts `canonical()`
/ psi.ts `canonical()` (key-sorted, no whitespace) — so the bytes a chain hashes are the
bytes a browser re-hashes. Splits are basis points summing to exactly 10000. Every emitted
event is domain-separated EIP-712-style data the creator's existing tooling can re-verify.

### 2.1 SplitRegistry — contributor credit & royalty split

- **Inputs:** `workId` (32 bytes — the content hash from the manifest, or the epoch root if
  the work is a batch member), contributor list `(address, passportKey, bps)`, split basis
  string (hash of the canonical manifest naming percentages), proposer signature,
  per-contributor accept signatures.
- **States:** `Proposed → Accepted` (every listed key co-signs; the registry stores the
  signatures, not the keys' secrets) `→ Superseded` (a v2 entry referencing v1; v1 is never
  deleted). `Final` is not a state — splits are amended by supersession for the future
  period only.
- **Who calls what:** any passport-bound address may propose for a workId it signed a
  receipt for; only the listed contributors can move Proposed→Accepted; **no admin role can
  create, accept or rewrite an Accepted split.** That absence is the point.
- **Dispute:** a disputant appends a counter-entry (same workId, new basis string, own
  signature). The registry shows both, never chooses. Downstream payment tooling that uses
  splits must consume the *latest mutually-Accepted* entry; a dispute flag is advisory and
  cannot be cleared by either party alone. No call exists that changes an Accepted entry.
- **Proves / refuses:** *"This registry proves that on the recorded date the named keys
  signed these exact split terms for the work identified by this hash; it does not prove
  that any signer contributed to the work, that the work is original, or that the split is
  enforceable as a legal contract."*

### 2.2 LicenceRegistry — licence and rights declarations (not money escrow)

- **Inputs:** licensor address + passport key, grantee (address or "public"), machine-readable
  terms (permits/requires/refuses lists, mirroring passport.ts `licensingPreferences`),
  hash of the full licence document, term and territory strings.
- **States:** `Offered → Accepted`; `Revoked-by-declaration` is a new appended event that
  marks the record and references it — never a mutation (same rule as the SQL immutability
  policies).
- **Who calls what:** licensor creates and may append revocation declarations; grantee
  accepts; nobody else writes.
- **Dispute:** both parties' statements coexist on-chain; the canonical text stays in the
  off-chain ledger and delivery package. A chain revocation declaration is evidence of a
  *statement*, and the registry's UI text must say so.
- **Custody — the honest constraint:** this contract has **no payable function and holds
  no funds.** If the Film Verse later wants royalty collection between strangers, holding
  that money is a digital-currency custody/exchange service under AUSTRAC AML law —
  registration is mandatory for such services offered in or from Australia, and Treasury's
  licensing regime for crypto-asset secondary service providers extends ASIC exposure —
  so it is routed to a licensed custodian/payments provider and the chain keeps only the
  terms plus payment-receipt references. The alternative — building our own escrow — would
  read as an unlicensed financial product; per this section's brief, that feature is cut,
  not deferred.
- **Proves / refuses:** *"This record proves that the named key published and a counterparty
  accepted these licence terms on a public log neither can silently edit; it does not prove
  the licensor actually holds the underlying rights, and it holds no money."*

### 2.3 AttributionRegistry — collaboration / works-made-for-hire statements

- **Inputs:** `workId`, role string, epistemic basis label (`self-declared | signed-event |
  counterparty-confirmed`, the same three levels passport.ts `deriveContributions` uses),
  evidence refs (ledger event hashes), signatures of the parties.
- **States:** append-only. Works-made-for-hire = a two-signature statement (creator +
  contributor) that the contributor's credit basis is set to `counterparty-confirmed`.
- **Who calls what:** any bound address may append a statement about its own credits; only
  the counterparty's signature upgrades a credit to confirmed. APEX's own address confers
  nothing — deliberately.
- **Dispute:** contested credits get a counter-statement appended and both render; the
  registry never hides an entry. A retracted credit still displays, marked retracted —
  matching `openClaims` semantics where a claim is a review queue, not a bug list.
- **Proves / refuses:** *"This proves these keys signed a statement that a named person did
  or did not work on a named file-set at a recorded time; it does not prove the work
  happened, and a counterparty-confirmed label means exactly one thing: two keys signed
  the same sentence."*

### 2.4 AnchorBatch — optional witness of the existing batch root

- **Inputs:** a batch root computed off-chain by psi.ts `batchRoot` (sort hashes lexicographically,
  concatenate, sha256) plus `(leafCount, epochLabel, collectorKey, signature)`. On-chain
  the same sort-compare-hash must be byte-identical to the JS version — UTF-8 byte ordering
  of lowercase hex strings, sha256 via the precompile; the parity test is in §7.
- **States:** one write, no transitions. Root `Registered` forever; duplicate roots rejected
  (dedupe by root, mirroring the SQL unique index on `hash`).
- **Who calls what:** anyone may post a batch (permissionless collector set, first root
  wins); leafCount must be ≥ 1 — empty or grief batches are refused.
- **Dispute:** none possible — the contract asserts only "root R existed at block time T",
  the same sentence opentimestamps already makes against Bitcoin. If the chain reorgs or
  the sequencer censors, the Bitcoin anchor carries the timeline; this contract is a second
  mirror, never the primary proof.
- **Proves / refuses:** *"This proves the batch root existed by the block timestamp — which
  entitles every leaf in it to the same 'existed by' assurance; it refuses to prove any
  leaf's priority, ownership, truth, or that anchoring is required — a receipt with no
  anchor verifies identically, exactly as verify.ts already reports absence as
  cannot-check, never fail."*

### 2.5 TierEntitlement — paid tier, with the lock forbidden by construction

- **Inputs:** payer address, tier id, valid-until timestamp, off-chain payment reference
  (invoice hash from the existing crypto_invoices flow).
- **States:** `active → expired → grace`; renewals append, nothing overwrites history.
- **Who calls what:** a single merchant updater (the existing checkout backend) writes
  entitlements; users only read. Updater authority is 3-of-5 guarded (§5).
- **The hard rules, encoded as absences:** the contract gates **process conveniences only**
  — priority anchor-batch inclusion, extra storage, styled export templates. It has **no
  function** that mutes a dispute, lifts an attribution flag, accelerates or suppresses a
  registry entry, or is ever consulted by the public verification portal. `FREE_FOREVER`
  is enforced by topology: verification reads receipts and recomputes hashes; it never
  imports this contract, so a paid tier cannot meter it, and no admin can add a gate that
  the verification code path does not already read.
- **Proves / refuses:** *"This proves an address holds a paid allowance for named
  conveniences until a date; it refuses to certify anything about a work's quality, truth,
  standing or dispute outcome, because money buying outcomes is the one thing this system
  was designed to be unable to do."*

## 3. Chain and dependency choice

**Requirement recap:** no US-hosted API dependency on the critical path; Bitcoin anchoring
(opentimestamps, already live with confirmed anchors in the existing stack) stays the
canonical timeline; evaluate one smart-contract chain honestly.

**Evaluated honestly — EVM L2 (Base) as the negative case:** Base is cheap and has the
largest L2 stablecoin share, but Coinbase operates a **single sequencer** — as of 2026
Arbitrum, Base and Optimism all still run single-operator sequencers with censorship, MEV
and liveness failure as the known risks, decentralised sequencing only on late-2026/2027
roadmaps — and Base's February 2026 announcement of a "new, unified stack" is active
migration churn. The RPC surface (Coinbase CDP) is a US-hosted API. Rejected for our use.

**Evaluated honestly — Stacks/Clarity as the Bitcoin-native option:** it attaches to
Bitcoin and Clarity is decidable (good for registry safety), but its 2026 roadmap is
pivoting to BTC-yield and institutional finance, the sBTC bridge's trust model is a
governed aggregate-key set, and tooling overlaps little with our TypeScript stack. Not
chosen as the primary.

**Chosen: Polygon PoS (EVM), used as a *witness mirror*, with self-hosted access.**
- Why it fits: cheap writes for weekly batch roots and registry entries; EVM matches our
  TypeScript/viem tooling; the `bor` client is open, so read and write paths run through
  our own node — **no Infura/Alchemy/Coinbase dependency on the critical path**.
- Honest risks stated: PoS validator set is large but historically checkpointed by a
  small committee; sequencing is not trust-minimised; fee spikes happen under congestion;
  a reorg is possible. All are survivable **only because of the topology rule: the chain is
  never the source of truth.** Everything posted is recomputable from off-chain canonical
  bytes, the same facts are anchored to Bitcoin, and a chain failure means "re-post later",
  not "records lost".
- Escape hatch named for honesty: if the sequencer censors our batch, we do not rely on an
  L2 escape-hatch mechanism we don't control — the statement still lands in the Bitcoin
  anchor batch. That redundancy is why a modest chain is acceptable here.

Sources (checked 2026-11-01):
- [Orochi — L2 Sequencer Centralization in 2026](https://orochi.network/blog/Deep-Dive-into-Layer-2-Sequencers-the-Centralization-Challenge) — Arbitrum/Base/Optimism single-sequencer status, censorship/MEV/liveness risks.
- [Base docs — protocol overview](https://docs.base.org/specifications/base-protocol/overview) and [Base blog: a new unified stack](https://base.org/blog/next-chapter-for-base-chain-1) — sequencer role and 2026 stack migration.
- [Coinbureau — Stacks review 2026](https://coinbureau.com/review/stacks-stx), [Stacks 2026 roadmap](https://www.tradingview.com/news/chainwire:578a54c05094b:0-stacks-announces-2026-roadmap-targeting-bitcoin-native-finance-for-institutions-and-retail/) — PoX/Clarity, sBTC trust model, roadmap pivot.
- [AUSTRAC — virtual asset registration actions](https://www.austrac.gov.au/about-us/record-our-actions/virtual-asset-registration-actions), [Treasury CASP licensing consultation paper](https://treasury.gov.au/sites/default/files/2022-03/c2022-259046.pdf) — custody/DCE services require AUSTRAC registration; ASIC licensing extends to certain crypto services.

## 4. Composition with the off-chain ledger, seals and passport keys

- **Leaf → batch → epoch, three levels, one rule each:** a leaf is a receipt or ledger-event
  hash; `batchRoot(hashes)` (sort→concat→sha256) is the weekly batch; the **epoch root** is
  `batchRoot(batchRoots)` for a milestone. AnchorBatch posts the batch root; the epoch root
  additionally goes to the existing Bitcoin/opentimestamps anchor. One sentence covers both:
  the chain and Bitcoin witness the *roots*; only the off-chain bytes support the *claims*.
- **Key unification without key custody:** passport Ed25519 keys (generated by
  `generateIdentity`, never stored server-side) stay the signing keys for receipts. Chain
  addresses get a separate EVM key; the two are joined by a `signStatement` binding —
  "passport key K controls address A on chain C, nonce N" — recorded once in
  AttributionRegistry. Verification of a chain entry therefore descends to an offline
  Ed25519 check, never to an RPC call.
- **Canonical bytes are the contract (literally):** every hashed payload uses ledger.ts
  `canonical()` (key-sorted, whitespace-free JSON); the EVM side hashes the same UTF-8
  bytes. Any drift is caught by the parity test (§7), because two implementations of
  "canonical" that disagree produce a seal that verifies off-chain and fails on-chain —
  the worst possible failure mode.
- **Coexistence is not proof of truth — stated as reconciliation rules:** (1) the chain
  never overwrites the DB; the DB never claims the chain validated a row; (2) divergence
  between a chain root and recomputed off-chain bytes is appended to the ledger as an
  `human-review` event at epistemic `claim`, never auto-resolved; (3) any statement that is
  on-chain, in the DB, and in the delivery package still says the same three `notClaims`
  sentences verify.ts already prints. Three witnesses agreeing is agreement, not truth.

## 5. Guardian / custody model (contract keys only — no money custody exists)

- **Deployer & upgrader = the existing guardian lock: 3-of-5 shards, geographically
  distributed, on a ShardSafe-style multisig wrapper (deployed at ignition, per EMPIRE_STATE
  §4 three-pillar fortress).** Five custodians: Master, two external trusted parties, the
  future foundation trustee, and an attorney-of-record holding one shard under written
  succession.
- **Ceremony:** keys generated on air-gapped machines; each shard on separate hardware plus
  an encrypted paper backup; public addresses recorded in a sealed, Bitcoin-anchored genesis
  statement before any contract is deployed; no ceremony video with recoverable material.
- **Upgrade authority:** UUPS-style proxies; an upgrade requires 3-of-5 co-signature AND a
  7-day timelock with the upgrade's own hash and rationale appended to the off-chain ledger
  before it can execute. A code change nobody could read in advance is not an upgrade we
  are allowed to ship.
- **Freeze authority — deliberately crippled:** 3-of-5 may pause *new writes* to
  SplitRegistry/AttributionRegistry/TierEntitlement (a grief-resistance brake). It may
  **not** pause reads, verification, the Bitcoin anchor path, or any already-Accepted entry,
  and every pause auto-expires after 30 days. There is no function in any of the five
  contracts that deletes state or suppresses an entry — so a compromised guardian cannot
  censor history, only slow new appendages, and the attack is loud by construction.
- **Master unavailable:** the system is designed so this is a non-event — 3-of-5 already
  excludes any single person (stewardship of the genesis root is explicitly "not an
  exclusive-key decree", EMPIRE_STATE §4). With Master's shard absent, three remaining
  custodians operate pause/upgrade; with fewer than three reachable, nothing changes on
  chain at all — contracts keep running, entries keep verifying, and verification (free
  forever) is untouched. That is the intended posture: guardians protect *changes*, not
  *access*.

## 6. The refusal surface — claims this contract set cannot make

By construction (absent functions), not policy:
1. **No truth claim.** No function accepts a verdict of true/original/authentic. A seal
   proves a statement was made at a time — contract text and UI repeat this sentence.
2. **No authorship or ownership adjudication.** The registry records signatures, never
   decides who made or owns a work.
3. **No deletion or silent retraction.** Append-only; a retraction is a new entry (same
   rule already enforced by the Postgres immutability policies).
4. **No outcome for sale.** No callable path from money to dispute state, flag state,
   visibility or priority-of-truth. TierEntitlement gates process only (§2.5).
5. **No verification gate.** Nothing on-chain is required to verify anything; verify.ts
   never imports a contract. "Protocol as the lock" and the "verification tax" are not
   re-opened here in any form.
6. **No custody of funds.** No payable function anywhere in the set (§2.2).
7. **No credential minting.** No ERC-721/1155 "certified" token; no reputation asset.
8. **No mandatory anchoring.** Absence of an anchor or a chain entry is never a failure
   state — it is cannot-check at worst, matching verify.ts semantics.

## 7. Test plan — adversarial cases a rival should try

| # | Attack | Attempt | Verdict |
|---|--------|---------|---------|
| 1 | **Forge a receipt** | Flip one manifest field, re-hash, present as sealed | **Stopped** — canonical-key-sorted bytes change, signature fails. |
| 2 | **Forge a chain↔off-chain binding** | Claim address A "belongs to" passport key K without K's Ed25519 binding statement | **Stopped** — attribution entries require both keys; address alone grants nothing. |
| 3 | **Forge batch inclusion** | Claim a leaf hash was in a posted batch root | **Stopped** — recompute sort→concat→sha256; leaf absent ⇒ root differs. Parity test: JS `batchRoot` and EVM sha256 over identical sorted-hex bytes must match on 10k vectors and on non-hex-case/edge vectors. |
| 4 | **Replay across chains** | Reuse a signed split/anchor tx on a forked/second chain | **Stopped** — domain separator carries chainId + registry contract address; test on fork. |
| 5 | **Replay within a chain** | Resubmit a stale Accepted split after v2 supersession | **Contained** — entries are versioned by (workId, version); payment tooling must read the latest mutually-Accepted entry; test consumer helper rejects v1 once v2 is Accepted. |
| 6 | **Retract history** | Admin/guardian call deleting an entry or clearing a dispute flag | **Stopped by absence** — no such function exists; fuzz the full call matrix asserting every selector is append-or-read only. Retraction test: retract event keeps both rows visible and chain-verifiable. |
| 7 | **Censor us** | Sequencer refuses our batch posts | **Mitigated, not stopped** — Polygon PoS has no trust-minimised escape hatch today (same 2026 single-sequencer finding as all major L2s). The design answer is redundancy: the same root lands in the Bitcoin anchor batch; a 4-week chain-witness gap fires an ops alert and the epoch statement ships without the chain half. Honest label: process risk, never record risk. |
| 8 | **Bribe/coerce a verifier** | Compromise any service a checker depends on | **Stopped** — the verifier is a downloadable file (verify.ts): signature check is offline; chain is never consulted; no operator to bribe. A bribed *human* reviewer is caught by the epistemic labels, which say whose word each row is. |
| 9 | **Pay to suppress a dispute** | Bribe APEX or a guardian to hide an entry or freeze a rival's registry | **Stopped** — no visibility switch in any contract; pause freezes new writes only, auto-expires, cannot remove accepted entries, and requires 3-of-5 — which the off-chain covenant and ledger event make visible. |
| 10 | **Grief the anchor** | Flood with empty/synthetic batch roots | **Stopped** — leafCount ≥ 1, duplicate-root rejection, root must match a sealed collector statement. |
| 11 | **Evade custody rules** | Try to route royalties through a contract balance | **Stopped by absence** — no payable function, no token holding; property test asserts contract balances stay zero under a full fuzz sweep. |

Not stopped, stated plainly: social-engineering the split *terms* before signature (a
creator can sign a bad deal — the chain proves the signature, never the fairness; this is
the audit-trail doctrine, not a bug), and custody/wash-trade risk of the external payment
rail (owned by the licensed custodian, out of our codebase by design).

---

Build order note: AttributionRegistry and AnchorBatch are trivially small and reuse tested
off-chain code; SplitRegistry is the one that changes the industry conversation and is the
first thing worth building properly.
