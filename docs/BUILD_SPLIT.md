# The Build Split — two ends, one platform

Read this before any build. It is the contract between the operator's GitHub work and Lovable's
hosted work. Both ends build the same platform; neither end edits the other's files.

## The architecture in one sentence

The platform is a **switchboard on the internet**. It owns no GPU, runs no model and stores no
footage. Creators plug their own compute into it; the platform routes the job, records the receipt
and takes the toll. Nothing is installed on the operator's laptop.

## The four plugs

Every engine connects through exactly one of these. There is no fifth path.

1. **Cloud API + the creator's own key (BYOK)** — Replicate, fal, RunPod, DeepSeek, Akash, io.net.
   The platform forwards the request and never pays for it.
2. **The creator's own rig over the internet** — they supply their ComfyUI or Ollama endpoint.
   The platform sends the graph; their machine does the work.
3. **Webhook** — any tool that can POST connects in one line.
4. **Browser-native** — edit, colour grade, LUT, grain and the PSI seal run inside the visitor's
   own browser. No server, no GPU, no install on either side.

A stage with nothing plugged in reports `not connected`. It never fakes a result and never grows a
"Run" button it cannot honour.

## File ownership — the boundary that prevents merge conflicts

| Path | Owner | Rule |
| --- | --- | --- |
| `src/lib/apex/**` | GitHub end | Synced from the operator's repo. Lovable reads, never rewrites. |
| `verse-site/**` | GitHub end | The public rail, mirrored to GitHub Pages `docs/`. |
| `scripts/**`, `agent/**`, `docs/**` | GitHub end | Build, verify, publish, coordinate. |
| `src/routes/**`, `src/components/**` | Lovable | Pages, UI, the welcome gate, the owner keypad. |
| `src/styles.css` | Lovable | One visual language; GitHub end composes the existing utilities. |
| `supabase/**`, `src/lib/replicate-gateway.ts` | Lovable | Auth, data, the hosted cloud lane. |
| `src/lib/apex/vocabulary.ts` | GitHub end (shared contract) | One name per room. Lovable imports; it does not rename. |
| `src/lib/apex/connection.ts` | GitHub end (shared contract) | `CONNECTIONS`, `STAGE_CONNECTION`. The only source of tool/stage honesty. |

If Lovable needs a new room, a new label or a new connection state, it adds a request to the bottom
of this file instead of editing the contract. The GitHub end resolves it on the next sync.

## What the GitHub end builds

Published on GitHub Pages — free, always on, no operator click and no Lovable credits.

1. **Connector registry** — every engine as a live row: endpoint shape, auth method, capability,
   cost, licence, connection status. Wired, not merely listed.
2. **The four plugs** — the connection layer for BYOK, remote rig, webhook and browser-native.
3. **The 10-stage orchestrator** — dispatches each stage to whatever is connected, and reports
   `not connected` when nothing is.
4. **Browser NLE** — trim, cut, reorder, crossfade, stitch and export MP4 in the visitor's browser
   (WebCodecs + Canvas2D + single-threaded ffmpeg.wasm, so GitHub Pages needs no COOP/COEP headers).
5. **Browser colour grade** — WebGL shader pipeline, 3D LUT, film grain.
6. **PSI seal + Film Passport + offline verifier** — RFC 8785 JCS, SHA-256 Merkle inclusion,
   Ed25519, OpenTimestamps anchoring. Zero-dependency verification.
7. **Compute Swarm dashboard** — what is connected to the platform right now, with node telemetry
   and job routing. The operator's laptop is not a node unless the operator chooses.
8. **Open-core mirror + CI + LicenceGuard** — one-way publish, no secrets, every licence written or
   explicitly marked unverified.
9. **Split ledger** — 85/15 community and 50/50 co-production, reconciling to the cent.
10. **The public rail** — all ten stages as a live, honest interface on Pages.

## What Lovable builds

The hosted shop window at `sovereignfilmverse.tech`. This is the part that needs a server, an
account and the operator's money.

1. **The pages and the UI** — every route in `src/routes/**`, the welcome gate, the owner keypad,
   the obsidian HUD. Compose `src/components/hud.tsx`; do not invent a second visual language.
2. **The partner access door** — whichever option the operator chooses: free pre-production with a
   gated render, a capped guest pass, or BYOK. Until the operator decides, do not build all three.
3. **The quota wallet** — server-side, hard-capped, so a render can never spend unbounded money.
4. **The hosted cloud lane** — `src/lib/replicate-gateway.ts` stays as it is. The linked key is a
   gateway connection key and fails against `api.replicate.com` directly.
5. **Stripe Connect** — 85/15 and 50/50 payouts, after the operator completes KYC. Not before.
6. **SEO and share cards** — SSR metadata, og tags, the WhatsApp preview. A stale cache is busted
   with a query string, not by changing the title again.
7. **Read the two shared contracts** — import `vocabulary.ts` for every room name and
   `connection.ts` for every tool's honesty. Never rename a room and never invent a run action.
8. **Fix sync breakage minimally** — widen a type or drop an exact duplicate key; never rewrite
   catalogue data, so the next sync still merges.

## Honesty rules binding on both ends

- **Nothing is claimed that was not measured.** The DePIN discount, the interpolation compute
  saving and the per-frame storyboard speed are unverified. They stay labelled unverified on
  screen until a connected rig produces the measurement.
- **A seal is an audit trail, not a certificate of truth.** It proves a record was made and has not
  changed since its timestamp. It never proves the record is true. No "digital truth", no
  "legally untouchable", no absolutes.
- **C2PA is the language to be compatible with, not a competitor to defeat.** PSI exports should
  interoperate, not isolate.
- **An unread licence is not a cleared licence.** `unverified` is a valid answer; an invented
  permission never is.
- **The brain is DeepSeek, with Qwen as the open-weights fallback.** No Anthropic, no OpenAI, no
  other US-hosted model API appears in any stage, driver or copy.
- **Absence is stated, not hidden.** A tool that is catalogued but not connected says so.
- **No claim about third-party marks.** Genres and archetypes are descriptive; the platform is
  independent and unaffiliated.

## The publish topology

- `kawal393/lllppp` — private. The app Lovable deploys, plus ops state.
- `apex-architecture/sovereign-ai` — public, Apache-2.0. The open core, served from `docs/`.
- `scripts/publish-open-core.mjs` mirrors the app's `origin/main` into the open core, one way.
  Nothing flows back. It never copies a secret, never deletes, never force-pushes.
- `scripts/sync-lovable.mjs` merges `origin/main` into `apex-platform` and pushes both, so the two
  ends build from one commit. The ends do not connect automatically.

## Requests across the boundary

Append here. Format: `FROM | NEED | WHY | STATUS`. The other end resolves it and sets STATUS.

- GitHub end | Lovable: deploy `05789f8` so `/` ships its `<h1>` and the rail shows `Console`
  instead of `Admin` | the live sweep is 16/17 and the nav drifts from the shared vocabulary | OPEN —
  Lovable has pushed past `05789f8`; the live sweep re-runs before this closes
- GitHub end | Operator: choose the partner access door (free pre-production / guest pass / BYOK) |
  friends can browse but cannot create, and none of the three options is built | DONE — operator chose
  free pre-production; Lovable built it on /create (the one-screen Script → Board → Render → Cut layout)
- Lovable | GitHub end: the free script writer uses DeepSeek V3 with Qwen3 fallback and FLUX schnell
  frames on the hosted cloud lane, capped daily server-side | so the rail and registry can list them as
  wired for the script and storyboard stages | DONE — verified against
  `src/lib/preproduction.functions.ts:10-11`; the Replicate connector row names the three hosted models,
  the storyboard stage gained the Replicate route, and the Connect page labels the free lane as
  app-side and daily-capped, not as a plug the static rail can offer
