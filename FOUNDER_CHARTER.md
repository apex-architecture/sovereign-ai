# FOUNDER CHARTER

**Sovereign AI Filmverse — the binding constitution of the house**
Version 1.0 · adopted 9 November 2026
Held by **ROCKYFILMS888 PTY LTD** · ABN 71 672 237 795 · Australia

This document governs the company, the platform and the open core. It is short on purpose.
Where it is silent, the repository is the evidence and the founder decides.

---

## 1. The three things this house owns

| | What it is | Who owns it | Where it lives |
|---|---|---|---|
| **The platform** | The hosted studio at `sovereignfilmverse.tech` — render, teams, distribution, secrets | ROCKYFILMS888 PTY LTD | Private repo `kawal393/lllppp` |
| **The open core** | Everything anybody may read, clone, fork or run: the driver contract, the passport schema, the registry, the rail | ROCKYFILMS888 PTY LTD, Apache-2.0 | Public repo `apex-architecture/sovereign-ai` |
| **The standard** | Proof of Stateful Integrity (PSI) — the receipt format and the rules for issuing and checking one | ROCKYFILMS888 PTY LTD | `ai-governance-standard.com`, IETF draft `draft-singh-psi` |

The standard is the only part that is not a product. The platform is where the work happens.
The open core is where the world may take the work and run it without us.

## 2. The one-way publish

The open core is a **mirror** of the platform's open code. It flows one way:

```
private app repo  ──publish-open-core.mjs──▶  public open core  ──▶  GitHub Pages
```

Nothing flows back. Consequences that are deliberate, not accidents:

- What the platform runs is exactly what the world clones. The mirror is verified, not claimed.
- **Nobody may push to the open core except the founder's publish script.** A pull request
  against the open core is a request, not a merge: it is taken to the private app repo, written
  there, and re-mirrored. This is what keeps the mirror true.
- The publish script never copies a secret, never deletes, and never force-pushes. It refuses and
  says so.
- The mirror carries a **vocabulary contract** (`src/lib/apex/vocabulary.ts`). The names of the
  rooms are generated from one file, and CI fails if the website and the repository disagree.
  A visitor's words on the screen and the code that ships them are the same words.

## 3. What the creator keeps

- The creator owns their prompts, scripts, inputs and generated media.
- The platform claims no rights over a creator's work, no right to train on it, and no right to
  resell it.
- A **Film Passport is an audit trail, not a certificate of truth.** It proves that an exact set
  of bytes existed in an exact state, sealed by an exact key, at or before an exact time. It
  does not prove that the work is good, lawful, original in the world, or that what it says is
  true. That judgement stays with the person reading it.
- Checking a passport is **free, forever**, and no party may put a price on it. The code is
  written so that a stranger can verify with no server of ours running.

## 4. The standard is open, the registry is the business

The PSI standard is published, specified and free. What is commercial:

| | Sold | Free |
|---|---|---|
| Hosted GPU rendering, by the operator's key or the customer's | **Yes** | |
| Teams, collaboration, distribution, the sovereign cloud | **Yes** | |
| The tool registry, measured and maintained | **Yes** (access) | The rows are readable |
| Issuing and checking a passport | | **Yes, forever** |

Anyone may build a competing host, a competing renderer, or their own implementation of the
standard. That is the point of the standard.

## 5. Equity, classes and vesting

Two classes of share. Class changes are founder-only.

**Class A — Founder.** Held by ROCKYFILMS888 PTY LTD. Ten votes per share. The only class that
may: amend this charter, issue or transfer shares, change the licence of the standard, or
remove a partner. One holder.

**Class B — Partners.** One vote per share. Vesting is four years with a one-year cliff, and
it vests on **shipped, measurable work**, not on elapsed time. A tranche vests when the work it
names is merged, live, and provable in the repository or on the platform.

| Partner | Class | Shares | Vesting start | Milestones that vest | Signature |
|---|---|---|---|---|---|
| _Founder_ | A | — | — | — | ROCKYFILMS888 PTY LTD |
| | B | | | | |

Every partner's vesting table is an annex to this charter and is signed separately. An annex
that is not signed does not vest and does not bind.

**Nothing is granted for having been in a room.** The work has to be in the repo or on the
platform, and it has to be running.

## 6. Decision rights

Only the founder decides, and these are the decisions reserved to the founder:

- the licence of the open core, the standard, and the brand;
- issuing equity, and changing a class;
- the identity of the company that holds the IP, and any transfer of it;
- the public claim set: what the platform is allowed to say about itself.

Everything else is delegated. The operator (or any agent working under it) decides the
architecture, the roadmap inside a release, the driver contract, the copy, and the day-to-day
work. A decision that has already been made and reported is not reopened without new
information.

**What a partner or contributor does not need permission for:** opening an issue, proposing a
change, running the open core, forking it, building on it, or leaving.

## 7. Honesty rules, binding on everything we ship

These are not style preferences. A build that breaks one of them is a bug.

1. **Nothing is claimed that was not measured.** Numbers on a page come from a run, and the run
   is named. A figure that cannot be reproduced is removed, not softened.
2. **A licence that has not been read is not cleared.** The registry says "unverified" until a
   human read it. A catalogue that lies about permissions is worse than no catalogue.
3. **The absence of a feature is stated, not hidden.** A navigation entry that does not go
   anywhere is marked as a gap.
4. **No claim of legal certainty.** Nothing in this house promises that a user cannot be
   sued. The platform provides tools; the person using them answers for what they make.
5. **No claim about a third party's marks.** The house is independent, is not affiliated with,
   endorsed by or sponsored by any studio, franchise or trademark holder, and says so plainly.

## 8. Money

- Compute is sold. Trust is not.
- The hosted cloud is the business: rendering, teams, distribution, and the sovereign registry.
- Creator tools that a lone person cannot afford are priced so that a beginner can start —
  a hard cap on free renders rather than an open promise, because an open promise is a
  liability.
- Where a customer brings their own key, the customer pays the model, and the platform charges
  for the orchestration, not for the model.

## 9. Amendment

This charter is changed only by the founder, in writing, with the version and the date. An
amendment takes effect when the founder's signature is on it. A partner may propose an
amendment at any time; the founder is not obliged to accept it.

**A charter is not a substitute for advice.** Before any third party signs an equity instrument
or takes a share, a lawyer in the relevant jurisdiction should read it. This document is the
company's stated position, not legal advice, and it is not represented as making anyone
untouchable.

---

*Adopted by ROCKYFILMS888 PTY LTD (ABN 71 672 237 795) on 9 November 2026. Version 1.0.*
*Companion documents: `GOVERNANCE.md` (day-to-day), `CONTRIBUTING.md` (how to contribute),
`SECURITY.md` (how to report a vulnerability), `NOTICE` (attribution).*
