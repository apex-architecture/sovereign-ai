# Governance of the Sovereign AI Filmverse

This repository is the **open core** of the platform. It is hosted in the `apex-architecture`
GitHub organisation, whose sole admin is Kawaljeet Singh.

## Who decides what

| Domain | Decided by | Why |
| --- | --- | --- |
| The passport specification (canonical form, signature format, receipt wording) | The originator, as a **normative spec** — changes need a version bump and a parity test, not a vote | A standard that can be voted on is not a standard. Anyone may implement it. |
| The open-core code (this repo) | Open contribution, by pull request, under the rules in CONTRIBUTING.md | The code is the invitation. |
| The sovereign cloud, hosted rendering, anchoring and pricing | The operating company | That is where the work and the cost live. |
| The brand, the trademarks, the private infrastructure and the hosted ledger | The originator, through an IP holding company | The name and the proof belong to the person who built them. |

## The three doors

1. **The open core (this repo).** Free, Apache-2.0, clone it and run the whole studio on your
   own machine. No account, no key, no payment.
2. **The public rail.** `https://filmverse-1mil8xwzv4y.qoder.website` — read, verify, compare.
   Verification is priced at zero as a rule of the platform, permanently.
3. **The sovereign cloud.** Hosted GPU rendering, team collaboration, distribution and anchoring
   of finished work. This is the business.

## Licence boundary

Open source here means: the studio, the pipeline, the driver contract, the passport and the tool
registry are free and forkable. It does **not** mean the hosted service is free, and it does not
mean the passport's *wording* is up for a vote — only its *implementation* is.

## No contribution gets the keys

Pull requests can add a driver, a tool row, a fix or a translation. They cannot add a paid API
call that spends the operator's money, publish credentials, or upload model weights. The rules are
in CONTRIBUTING.md and they are enforced by CI.
