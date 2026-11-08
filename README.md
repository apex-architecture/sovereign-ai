# Sovereign AI Filmverse

**The world studio, open to everyone.**

One studio for everyone on the planet — from a kid with big dreams and no money, to the biggest
film companies in the world. Ten stages from an idea to a finished film. A registry of every tool
there is, each with its real upstream link. And a **film passport**: a signed, machine-checkable
record of who made what, which anyone can verify for free, offline, with no account.

This repository is the **open core**. Clone it, run the whole studio on your own machine, point it
at your own ComfyUI, your own Ollama, your own GPU — and add a driver for the tool you wish existed.

```bash
git clone https://github.com/apex-architecture/sovereign-ai
cd sovereign-ai
npm install
npm run passport:selftest   # proves the browser signer and the server verifier agree
npm run dev                # the studio on your own machine
```

---

## The three doors

| | What it is | Cost |
| --- | --- | --- |
| **The open core** (this repo) | Studio, pipeline, driver contract, passport, registry, website | Free, Apache-2.0, forever |
| **The public rail** — [filmverse-1mil8xwzv4y.qoder.website](https://filmverse-1mil8xwzv4y.qoder.website) | Read, compare and verify any passport | Free, and it stays free |
| **The sovereign cloud** — [sovereignfilmverse.tech](https://sovereignfilmverse.tech) | Hosted GPU rendering, teams, distribution, anchoring | Paid. This is the business |

The code is free. Compute and trust are the business. Nobody may put a price on checking a
passport — that rule is written into the code, not just the docs.

## The website

`docs/` is the front door and the GitHub Pages source. `docs/index.html` is the welcome; the
studio dashboard is `docs/studio.html`; the free verifier is `docs/verify.html`; the passport spec
is `docs/passport.html`; the tool marketplace is `docs/tools.html`.

`docs/CNAME` points the site at **`sovereign-ai.in`**. The numbers on the front page are read at
runtime from `docs/registry.json`, which is generated from the catalogue — so the site can never
advertise a tool that the code does not have.

## What is actually here

```
src/            the studio — routes, components, and src/lib/apex (pipeline, drivers, passport)
src/lib/apex/
  catalog/      the tool catalogue: every tool, its licence, its cost, its upstream link
  drivers/      the driver contract and every driver the studio can actually reach
  canonical.ts  RFC 8785 canonical JSON — the bytes a receipt is signed over
  psi.ts        the receipt format and the server-side verifier
  seal.browser.ts  signing in the browser with WebCrypto Ed25519
  proof.ts      the ledger chain: commit -> seal -> anchor -> verify
  schema.ts     the rule that a licence is only "cleared" after a human read it
passport/       (same code, reachable as the spec surface — see src/lib/apex)
tools/          registry.json, generated — every catalogueued tool with its real link
scripts/        the build, the registry generator, the cross-implementation proof, the QA sweep
docs/           the website (GitHub Pages source)
supabase/       schema and migrations for anyone who wants their own backend
workflows/      ComfyUI workflow graphs
```

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | the studio, locally |
| `npm run build` | production build |
| `npm run passport:selftest` | 18 gates proving the browser signer and the server verifier agree byte for byte |
| `npm run tools:registry` | regenerate `tools/registry.json` and `docs/registry.json` from the catalogue |
| `npm run site:build` | minify and fingerprint the website |
| `npm run lint` | eslint |

### The passport, in one paragraph

A receipt makes exactly four statements: the bytes matched the commit hash, the seal existed on a
date, which stages produced which hashes, and what was deliberately not checked. Anything outside
those four is not a weak claim on a receipt — it is a claim a receipt cannot make at all. A seal is
an **audit trail, never digital truth**. The signature is Ed25519 over RFC 8785 canonical JSON, so
a manifest signed in a browser verifies on a server and vice versa; the cross-implementation proof
in `scripts/psi-selftest.mjs` runs that exact check on every push.

The key sorting detail that bites everyone: keys sort by **UTF-16 code unit**, never
`localeCompare`. A locale sort orders `"a"` before `"A"`, which would make a mixed-case key sign
different bytes in Node than in a browser — indistinguishable from forgery.

## Connecting a tool

Read [CONTRIBUTING.md](CONTRIBUTING.md). The short version: every tool is a **driver** — a small
adapter that speaks `src/lib/apex/drivers/contract.ts` and points at a real engine. A pull request
must name the tool's own repository, state the licence, and prove the driver is reachable. It must
never contain a credential, and it must never spend the operator's money: a paid API runs on the
*user's* key.

## Governance

[GOVERNANCE.md](GOVERNANCE.md) says who decides what: the passport specification is normative, the
open core is open to pull requests, and the sovereign cloud and the brand are not up for a vote.

## Security

[SECURITY.md](SECURITY.md). One line to remember: a receipt proves that a statement was made, at a
time, about exact bytes — not that the statement is true.

## Licence

Apache-2.0 for the code. Third-party tools are not bundled; each keeps its own licence, recorded in
the registry. A licence read is only "cleared" when a human has read the actual text.

---

Sovereign AI Filmverse · open core maintained by ROCKYFILMS888 PTY LTD (ABN 71 672 237 795),
Melbourne · a project of the APEX architecture.
