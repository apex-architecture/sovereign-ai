# Contributing a tool to the Sovereign AI Filmverse

Every tool on the platform is a **driver**. A driver is a small adapter that speaks the studio's
contract (`src/lib/apex/drivers/contract.ts`) and points at a real engine — your GPU, your
ComfyUI, your cloud account, your own service. Anyone can add one; nobody can add one that
spends someone else's money without their key.

## What a pull request must contain

1. **A driver**, or a row in the registry that names an existing driver.
   `src/lib/apex/drivers/` — copy `contract.ts` and implement it.
2. **The licence, read.** A row may not claim a licence it has not been read against. Set
   `license`, and set `lastVerified` to the date a human read the actual licence text. A row
   with `license: "unverified"` is a row that may not be offered to a customer or bundled.
3. **The real upstream link.** `officialUrl` must be the project's own repository or product
   page. Not a blog post, not a YouTube video, not an aggregator.
4. **The honest cost.** `$0` means free to run on your own machine. A paid API says what it costs
   and that it needs the user's own key.
5. **A test.** `scripts/psi-selftest.mjs` must stay green, and any new driver needs a way to prove
   it is reachable.

## Hard rules

- **No credentials, ever.** Not in code, not in a committed `.env`, not in a log line, not in a test
  fixture. Use `VITE_*/process.env` and a `.env.example` that shows the shape only.
- **No uploaded weights.** Drivers point at models people already have or can download from the
  model's own home. Do not commit checkpoints.
- **No spending the operator's money.** A driver that calls a paid API on the platform's own key is
  rejected. A paid API runs on the *user's* key.
- **No marketing copy.** Describe what the tool does, not how great it is.

## How to add a tool that is not yet a driver

Open the registry (`tools/registry.json` is generated from
`src/lib/apex/catalog/` — edit the catalog, then run `npm run tools:registry`) and add a row with
the fields above. Rows without a driver are marked `no-driver` and the platform will say so
plainly rather than pretending.

## First run

```bash
git clone https://github.com/apex-architecture/sovereign-ai
cd sovereign-ai
npm install
npm run passport:selftest   # proves the browser signer and the server verifier agree
npm run dev                # the studio on your own machine
```
