# 04 — Connections: the driver layer (this is the product)

Scope: the connection/driver layer only — `src/lib/apex/drivers/*`, `src/lib/apex/orchestrate.ts`,
`src/lib/apex/connection.ts`, `src/lib/apex/connectors.ts`, `src/lib/apex/models.ts`,
`src/lib/apex/cost.ts`, enforced by `scripts/apex-check.mjs`.
Nothing here edits `src/`, `scripts/` or `supabase/`; this file states what those files do today and
what they must do.

Reproduce every number in this section:

```
node --experimental-strip-types scripts/apex-check.mjs          # prints "TOTAL: 68 checks passed, 0 failed"
node --experimental-strip-types -e "const c=await import('./src/lib/apex/connection.ts');console.log(c.CONNECTIONS.length, JSON.stringify(c.depthCount()), JSON.stringify(c.stageCoverage()))"
node --experimental-strip-types -e "const d=await import('./src/lib/apex/drivers/index.ts');const k=d.buildDrivers({comfyGraphs:async()=>null,replicate:{modelFor:()=>'x/y',usdPerJob:()=>0.65}});console.log(k.length,Object.keys(d.stageRoutes(k)).length)"
```

## 0. Measured today (not a summary of a summary)

| What | Measured | Source |
|---|---|---|
| Self-check gates green | **68 pass, 0 fail** | `scripts/apex-check.mjs` run 2026-11-01 |
| Connector rows in the phone book | **11** (ComfyUI, Ollama, Replicate, RunPod, FFmpeg, Blender, Whisper, OpenTimestamps, Supabase, PeerTube, Stripe) | `connectors.ts:53` `CONNECTORS.length` |
| Connector families declared | **18** | `connectors.ts:8` |
| Rows on the /connect screen | **12** — drivable 6, file-exchange 3, portal-only 1, not-yet 2 | `connection.ts:19` `depthCount()` |
| Real drivers built | **10** | `drivers/index.ts:28` `buildDrivers()` |
| Film stages routed | **9 of 10** | `drivers/index.ts:32` `stageRoutes()` |
| Stages with no driver at all | **1 — `dialogue`** | `connection.ts:39` `dialogue: []`; check prints `stages with no driver at all: dialogue` |
| Drivers that misdeclare depth | **0** | `orchestrate.misdeclaredDrivers(drivers)` |
| Drivable drivers actually reachable on this machine | **1 of 6 — ffmpeg only** (blender ENOENT, whisper binary present but probe says not runnable, ollama :11434 down, ComfyUI :8188 down, `REPLICATE_API_KEY` unset) | `probe()` on each shipped driver |
| Stages that complete when called with real drivers, intent `personal` | **0 of 9** — every attempt returns `blocked-by-licence` | `runStage()` over `stageRoutes()`, see G-2 |
| Registry rows awaiting a human licence read | **1109 of 1109** | check output `rows awaiting a human licence read` |
| Price entries with a verified source | **0** (`STARTER_PRICES: PriceEntry[] = []`) | `src/routes/cost.tsx:21` |
| Production callers of `runStage` / `buildDrivers` | **0** — only `scripts/apex-check.mjs` | grep of `runStage\|buildDrivers` across `src/` |

Doctrine line the layer must keep: *the contract is the connection; the registry row is only the
phone number* (`drivers/contract.ts:1-7`). A row in `connectors.ts` proves nothing about depth.

---

## 1. The connection contract, as a specification

### 1.1 Depth vocabulary

Two vocabularies exist and they are deliberately different sizes:

* `Depth` in `drivers/contract.ts:12` = `drivable | file-exchange | portal-only` (3). `DEPTH_LABEL`
  is asserted at exactly 3 keys by the check (`apex-check.mjs:241`). A driver may **not** declare
  `not-yet` — "not yet built" is a screen statement, never a runnable thing.
* `ConnectionDepth` in `connection.ts:8` adds `not-yet` (4) for the client-safe table only.

Invariant that keeps the two honest: a `not-yet` row must have **no** driver behind it
(`apex-check.mjs:271` "nothing built is still advertised as unbuilt"), and a row that claims a depth
must match the driver's `depth` exactly (`apex-check.mjs:269` "the screen tells the same depth story
as the code").

### 1.2 What a driver must implement per declared depth

`driverSatisfiesDepth()` (`contract.ts:67`) is the only referee; a driver that fails it is skipped
and logged, never run.

| Declared depth | Must exist | Also required in practice | Optional |
|---|---|---|---|
| `drivable` | `run(input)` **and** `probe()` | `record` with `licenseVerified: true` and `lastVerified` set (else `gateOnLicence` blocks), `runsOn`, non-empty `record.replacementOptions` | — |
| `file-exchange` | `handoff(input)` returning `{ instructions, files }` | `probe()` — `runStage` calls it *before* the handoff (`orchestrate.ts:80`), so a file-exchange driver without `probe()` throws; the contract's own switch does not require it (see G-7) | `run` must be absent |
| `portal-only` | `portalUrl(input)` | `probe()` may return `ok:false` by design — `runStage` handles portal-only **before** probing (`orchestrate.ts:74`) | `run`, `handoff` must be absent |

Every depth carries the same `record: TechRecord` from the Master Registry (`schema.ts:89`), so a
driver is never separable from its licence row.

### 1.3 The one door: exact order, as executed

`runStage(drivers, input, intent, hooks)` (`orchestrate.ts:39`) walks the candidate list in the order
`stageRoutes()` prefers. For each candidate, in this order:

1. **Empty list** → `state: "no-driver"`, write to ledger and memory, return. Nothing is invented.
2. **Depth self-consistency** — `driverSatisfiesDepth` false → log `"<tool> declares <label> but has
   no matching implementation"`, continue. The liar is named, not hidden.
3. **Licence gate at the moment of use** — `gateOnLicence(driver, intent)` (`contract.ts:82`) blocks
   when (a) `licenseVerified` is false, (b) intent is not `personal` and `commercialUse !== "yes"`,
   (c) intent is `redistribute` and `redistribution !== "yes"`. Blocked attempt → continue.
4. **Portal-only short-circuit** — records the URL as the attempt outcome and logs "a human publishes,
   APEX records the result"; it never probes and never runs.
5. **Probe** — `await driver.probe()`; `ok:false` → attempt `probed-unreachable`, continue. A hung or
   absent tool is discovered here, before any money or wall-clock is spent.
6. **File exchange** — `handoff()` → attempt `handoff-issued`, `state: "needs-human"`, `used = toolId`,
   continue looking (a later drivable candidate may still finish the stage).
7. **Run** — `await driver.run(input)`; spend and wall-clock accumulate across attempts; `succeeded`
   breaks the loop and freezes `used` + `outputs`.
8. **Anything that failed to break the loop but did attempt** → `state: "failed"` (`orchestrate.ts:110`).
9. **Always** `finish()` → `hooks.onLedger(run)` and `hooks.onMemory(run)` — the ledger and Creative
   Memory see the run whether it succeeded or not, and failed attempts are the most valuable rows.

`StageRun` therefore answers four questions in one object: who actually produced the artefact
(`used`), who tried (`attempts`), what it cost (`usdSpent`, `wallClockSeconds`), and what the tools
said verbatim (`log`). `totalSpend()` and `needsHuman()` (`orchestrate.ts:127,131`) are the two
roll-ups the screen reads.

### 1.4 `JobInput` / `JobResult` field contracts (driver-facing)

| Field | Contract the layer depends on |
|---|---|
| `task`, `inputs` | the only way a driver learns what to do; `ffmpeg.argsFor` returns `null` for an unknown task and reports `failed` rather than guessing flags (`ffmpeg.ts:79`) |
| `timeoutSeconds` | hard wall-clock ceiling: `exec` SIGKILLs (`exec.ts:23`), ComfyUI poll loop bounded by it (`comfyui.ts:91`), Ollama/Replicate via `AbortSignal.timeout` |
| `budgetUsd` | 0 means local-only; `replicate.run` refuses **before** the HTTP call when `price > budgetUsd` (`replicate.ts:62`) |
| `projectId/sceneId/stage` | the ledger key and the artefact name |
| `reproducible` | enough to replay the identical job: CLI drivers store `{binary, args}`, ComfyUI stores `{promptId, variant, graph}`, Ollama `{model, prompt}`, Replicate `{model, predictionId, status}` |
| `log` | the tool's own words, kept verbatim for memory; redaction happens before this field is written (only Replicate does this today — `replicate.ts:99`) |

Required additions (no driver emits them yet): `inputsHash`, `outputsHash[]`, `seed`, `toolVersion`
— see §2 "reproducible-run record" and G-12.

### 1.5 How a stage with no tool is admitted rather than faked

Three separate admissions, none of them allowed to look like success:

* **No candidate at all** → `state: "no-driver"`. Asserted by `apex-check.mjs:253` with stage
  `dialogue`. The screen renders it red: "no driver — this stage stops the pipeline"
  (`src/routes/connect.tsx:55`).
* **Declared but unimplemented** → `misdeclaredDrivers()` names `toolId (depth)` before a creator meets
  it (`apex-check.mjs:265` requires zero).
* **Advertised on the screen but unbuilt** → a `not-yet` row (`peertube`, `fish_speech`) with no driver
  object behind it, guarded by the "nothing built is still advertised as unbuilt" check.

---

## 2. Tool-by-tool integration plan (every class the platform needs)

Legend — **Method**: `cli` / `http-api` / `node-graph` / `python-api` / `library` / `desktop-app` /
`protocol` (the `INTEGRATION_METHODS` vocabulary in `schema.ts:76`). **Where**: local = creator machine
(`runsOn: "creator-machine"`), rented = someone else's GPU billed to the creator's own key.
**Target depth** is the depth this plan requires the driver to declare; declaring higher is a
misdeclaration and the checks catch it.

| # | Class | Driver `toolId` → tool | Method | Local vs rented | Env / credential | Artefacts in → out | Timeout (probe / job) | Reproducible-run record | Target depth | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Image / storyboard stills | `comfyui` → ComfyUI + SDXL-class graph | http-api (node-graph submitted as JSON) | local GPU | `APEX_COMFY_URL` (default `127.0.0.1:8188`) | prompt + saved graph + init image → `subfolder/filename` PNGs | 4s / caller-supplied, poll every 2s | `{promptId, variant, graph}` + required `checkpointDigest, seed, resolution` | drivable | shipped; **no graph stored** (`comfyGraphs` resolver returns `null` in every existing wiring) |
| 2 | Identity lock | `comfy_identity` → IP-Adapter-FaceID / InstantID / PuLID (registry `identity-lock`, 6 rows) + LoRA fine-tune (peft) | node-graph inside ComfyUI; LoRA is python-api | local GPU | same as #1 + `APEX_LORA_DIR` | character sheet + reference face + seed → lock PNG set, `.safetensors` adapter, identity report | 4s / 300–900s | `{graph, checkpointDigest, adapterHash, seed, referenceImageHash}` | drivable | **no driver** — stage `character_lock` routes to ComfyUI alone and inherits G-10 |
| 3 | Video / motion | `replicate` → hosted video model (BYO key) | http-api (`POST /v1/models/{owner}/{name}/predictions`, `Prefer: wait`) | rented, creator's account | `REPLICATE_API_KEY` + a verified `PriceEntry` | prompt + stills/init + variant → clip URL(s) | 8s / 600–1800s | `{model, predictionId, status}` + required `inputHash, seed, seconds, resolution` | drivable | shipped; **`probed-unreachable` here** (no key) and price is a bare lambda, not a `PriceEntry` |
| 3b | Video / motion (local) | `comfy_motion` → Wan 2.x / HunyuanVideo / LTX-Video (registry `video-generation`, 26 rows) | node-graph | local GPU | `APEX_COMFY_URL` | storyboard frames + graph → mp4 frames/clip | 4s / 900–3600s | `{promptId, graph, seed, checkpointDigest}` | drivable | not built; it is the fall-through that makes `replicate` non-essential |
| 4 | Dialogue / voice | `fish_speech` → Fish Speech (CC-BY-SA-4.0 weights / BSD-3 code, registry `creative-time.ts:399`); fallbacks CosyVoice, F5-TTS, Piper | python-api wrapped as cli | local GPU (rented only when the creator's machine lacks VRAM) | `APEX_FISH_SPEECH_BIN` or `APEX_TTS_URL`; voice-licence attestation recorded in `registry_rows`; `APEX_VOICE_CONSENT_REF` | script line + voice pack + target duration → `.wav` per line + timing sheet | 15s / 120–600s | `{binary, modelHash, voicePackHash, textHash, seed, speed}` | drivable | **not-yet — the only film stage with no driver at all** (G-1) |
| 5 | Music | `music_gen` → MusicGen / AudioCraft / Stable Audio Open (registry `music`, 21 rows) | python-api or node-graph | local GPU | `APEX_MUSIC_MODEL_DIR` | mood + bpm + duration → `.wav`/`.flac` stem + cue sheet | 15s / 300–900s | `{modelHash, promptHash, seed, bpm, seconds}` | drivable | not built; today `music` routes only to `ardour` (file-exchange) so the stage always ends `needs-human` |
| 6 | Sound / stems / separation | `demucs` → Demucs (MIT, `creative-sound-design.ts:16`); fallback Spleeter, UVR | python-api / cli | local CPU or GPU | `APEX_DEMUCS_BIN` | mixdown → vocals/drum/bass/other stems | 15s / 300–1200s | `{binary, model, inputHash, two_stem\|four_stem}` | drivable | not built; `sound` currently falls through ffmpeg→ardour and lands on `needs-human` |
| 7 | Subtitles | `whisper` → Whisper CLI (fallback whisper.cpp, faster-whisper, Vosk) | cli | local | `APEX_WHISPER_BIN`, model file on disk | audio → `<project>-<scene>.srt` | 15s / 300–1800s | `{binary, args, model, audioHash}` | drivable | shipped; **probe false-negative** on this machine even though the binary is on PATH (G-8). Burn step is `ffmpeg burn-subs` |
| 8 | Edit (multitrack) | `kdenlive` | desktop-app, file-exchange via its `.kdenlive` XML | local | none — works today | cut list + media → project file, human-rendered master | n/a (probe returns ok, no process) | handoff `files[]` + ingested master hash | file-exchange | shipped |
| 8b | Edit (pro) | `davinci_resolve` | desktop-app; scripting API exists only in Studio | local | none assumed; Studio + `APEX_RESOLVE_SCRIPTING=true` would lift it to drivable | timeline import list → IMF/ProRes master | n/a | delivered-file hash verified against ledger | file-exchange | shipped; record carries `commercialUse: "restricted"`, `redistribution: "no"`, `geographicRestrictions` |
| 8c | Edit / conform engine | `ffmpeg` | cli | local | `APEX_FFMPEG_BIN` | clips → concat / loudnorm (`I=-23 TP=-2 LRA=7`) / burned subs | 10s / caller-supplied | `{binary, args}` | drivable | shipped and the only reachable one here; only 3 tasks understood (G-11) |
| 9 | 3D / layout / previz | `blender` | cli headless (`-b -P script`) | local, GPU for Cycles | `APEX_BLENDER_BIN` | `.blend` + per-set render script → `<project>-<scene>.png` | 20s / 600–3600s | `{binary, args}` + required `blendHash, scriptHash, frames` | drivable | shipped; **ENOENT on this machine** → the whole storyboard/motion fall-through chain dies with it (G-6) |
| 10 | Finish / mastering | `otio_conform` → OpenTimelineIO + `ffmpeg` deliverables, ACES/OCIO, IMF (registry `video-finishing`, 15 rows) | library + cli | local | `APEX_OCIO_CONFIG` | edit decision + graded masters → delivery package per platform | 10s / 600–1800s | `{otioHash, lutHash, args, loudnessTarget}` | drivable for the conform, file-exchange for the grade | not built; `finish` routes ffmpeg→resolve→blender and lands `needs-human` |
| 11 | Publish (owned instance) | `peertube` → PeerTube `/api/v1` OAuth2 (`connectors.ts:235`) | http-api | creator's server | `APEX_PEERUBE_URL`, client id + refresh token | master + metadata → video URL + `video.published` webhook | 8s / 1800s (upload) | `{instance, channelUuid, videoUuid, contentHash}` | drivable | **not-yet** (G-15a) — the only honest self-hosted exit for a portal-only platform |
| 11b | Publish (platform) | `youtube` | no usable API path claimed | their website | the creator's own browser session | nothing in; published URL out | n/a | `portalUrl` recorded as the attempt outcome | portal-only | shipped — and mis-reported as `failed`, see G-3 |
| 12 | Storage / asset plane | `minio` → MinIO / SeaweedFS / Syncthing (registry `storage-sync`, 25 rows); Supabase Storage as the hosted twin | http-api (S3-compatible) | local or creator's server | `APEX_S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY`; `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` (present in `.env`) | artefact bytes → key + sha256; presigned URL back to the driver | 5s / 60–900s per part | `{key, etag, sha256, size}` | drivable | not built as a driver — `Supabase` exists only as a phone-book connector row; without it every `outputs[]` is a bare local path the app cannot read |
| 13 | Rented GPU / burst compute | `runpod` → RunPod serverless (`connectors.ts:115`), fallback Replicate/Lambda/owned card | http-api (pod run_sync/run_async) | rented, billed to the creator | `APEX_RUNPOD_API_KEY` + `APEX_RUNPOD_POD_ID` | ComfyUI graph + weights volume → same artefacts as local ComfyUI | 8s / pod-hours | `{podId, jobId, graph, gpuType, hoursBilled}` | drivable | not built — RunPod is a connector row with no driver, so `singlePointCapabilities()` has no video-motion alternative to route to |
| 14 | Script / language passes | `ollama` | http-api (`/api/generate`) | local | `APEX_OLLAMA_URL`, `APEX_LOCAL_LLM` (default `qwen2.5`) | task/prompt + variant → text (currently in `log`, not `outputs`) | 4s / 120–600s | `{model, prompt}` | drivable | shipped; down here (`:11434` nothing listening). Text in `log` instead of `outputs` breaks the artefact contract (G-12) |
| 15 | Provenance / sealing | `opentimestamps` | http/protocol | batched public service | none (no account) | manifest hash → `.ots` proof | n/a | `{batchRoot, proof}` | drivable (verify-only) | `psi.ts` signs and seals in-process; the anchor connector has no driver, so L3 stays operator-run |

Cross-class rule for the plan: **each class keeps at least two entrants installed** — one local and one
BYO-hosted — because `models.alternatives()` / `singlePointCapabilities()` return empty/flagged when a
capability has one entrant (`models.ts:81,87`). Today `music`, `identity-lock`, `voice`, `storage` and
`GPU` have zero drivers, so they are named single points, not routed risks.

Model competition still applies underneath every class above: `routeOrder(slots, capability, {offline,
budgetUsd}, rank)` filters to `eligible()` = `licenseVerified && commercialUse === "yes"`
(`models.ts:94,68`). With 1109 of 1109 rows unread, `routeOrder` returns `[]` for every capability —
the routing table is only as alive as the human licence read (G-2).

---

## 3. Gaps, each with a named fix

Ordered by how much of the pipeline each one stops. Evidence is measured, not inferred.

| ID | Gap (measured) | Named fix |
|---|---|---|
| **G-1** | `dialogue` is the one film stage with **no driver**: `STAGE_CONNECTION.dialogue = []`, `stageCoverage().empty = ["dialogue"]`, and it is absent from `stageRoutes()` while `STAGES_THE_PIPELINE_NAMES` names it | **Fish Speech driver** `fish_speech` at drivable depth: probe = `APEX_FISH_SPEECH_BIN --version` (or `GET /health` on a local TTS server); run = line-delivered script → per-line `.wav` + timing sheet; `reproducible = {modelHash, voicePackHash, textHash, seed}`; route `dialogue: [fish_speech, cosyvoice]`; keep it `not-yet` on the screen until `probe()` has returned ok from the runner, then flip the row and let the drift check confirm screen==code |
| **G-2** | The door cannot run anything today. `gateOnLicence` blocks on `licenseVerified === false` for **every** intent including `personal`; all 10 shipped records have it false; measured: all 9 routed stages return `blocked-by-licence` → `state: "failed"`. 6 "drivable" rows are latent, not live | **Licence-read queue + intent-scoped gate**: human reads the licence text for the 10 shipped tools first (that is the whole `guard.reviewQueue` = 1109-row queue narrowed to 10), sets `licenseVerified` + `lastVerified`, and the gate keeps its teeth; `personal` use of an unverified *free-open-source* tool routes to `needs-human` with the licence text attached instead of silently failing. Never a bulk `true` — `canPromote` already refuses to convert a claim into a legal conclusion (`apex-check.mjs:95`) |
| **G-3** | Portal-only is reported as failure. With cleared licences, `publish` returns `state: "failed", used: null` — the portal branch only `continue`s, and the tail rule at `orchestrate.ts:110` converts attempts-without-success into `failed`. `refuseAtPortalDepth()` (`studio.ts:105`) exists to fix exactly this and is **called by nothing** | **`portal-issued` terminal state** (or map portal-only onto `needs-human`) using the already-written `refuseAtPortalDepth`, so the screen says "a human publishes, APEX records the URL" instead of "failed"; add a check asserting a portal-only candidate never yields `failed` |
| **G-4** | `uncoveredStages(stageRoutes(drivers))` returns `[]` — it only sees empty arrays on keys that exist, and `dialogue` has no key. The real gap is found today by hand-rolled logic in `apex-check.mjs:261` | **`stageRoutes` returns a key for every `STAGES_THE_PIPELINE_NAMES` entry**, drivers array empty when nothing is wired; then `uncoveredStages` is the single source of truth for both the screen and the check |
| **G-5** | The one door has **no production caller**: `runStage`, `buildDrivers`, `onLedger`, `onMemory`, `StageRun` appear nowhere in `src/` outside their own definitions — only `scripts/apex-check.mjs` exercises them. `/connect` renders a static table | **Local runner daemon** (`apex-runner`) that owns `node:child_process` + `127.0.0.1` probes, authenticated by `APEX_RUNNER_TOKEN`, plus one server function `/api/jobs/run` that hands `runStage` a `JobInput` and pipes `StageRun` into `ledger.appendEvent` and `memory.remember`. Driver code must stay off the hosted web app — it spawns processes |
| **G-6** | Every local tool is declared `runsOn: "creator-machine"`, but `runsOn` is **read by nothing** (grep: only assignments). A job accepted from a customer could queue work on the creator's GPU | **Runner affinity gate in `runStage`**: refuse any candidate whose `runsOn` does not match the host actually executing the door, and record the refusal in the ledger as a `generation-run` with `details.host` — this is the code-level statement of "no silent use of a user's machine for someone else's job" |
| **G-7** | `JobState` declares `queued`, `running`, `timed-out` and no driver emits them; a killed ffmpeg job becomes `code -1` → `failed` (`ffmpeg.ts:96`), and "the job ran 20 minutes then we SIGKILLed it" is indistinguishable from "the tool refused". Also a `file-exchange`/`portal-only` driver without `probe()` throws at `orchestrate.ts:80`, though `driverSatisfiesDepth` does not require `probe` at those depths | **Timeout honesty + probe in the contract**: `exec.timedOut` maps to `state: "timed-out"` (and `queued`/`running` are removed or actually emitted by the runner); `driverSatisfiesDepth` requires `probe` at all three depths. New checks: "a killed job says timed-out, not failed"; "every driver has probe" |
| **G-8** | `whisper` is on PATH on this machine yet its probe returns `whisper not runnable:` — the probe treats a non-zero exit from `--help` as absence | **Presence probe by resolution, not exit code**: resolve the binary on PATH (or `<binary> --version` accepting stdout-with-usage), and make the probe report the *model file* separately from the binary — two different failures, two different fixes |
| **G-9** | The paid-call guard compares `price > input.budgetUsd`, but `price` comes from a bare `usdPerJob` lambda in `DriverConfig` (`drivers/index.ts:22`), not from `cost.ts` `PriceEntry`. `estimatePaid` refuses to quote without a verified price (`cost.ts:58`), yet `/cost` ships `STARTER_PRICES = []` — zero verified prices exist | **One price source**: `usdPerJob` is built from `priceTable(entries).get(provider)` and returns `Number.NaN` when the entry is missing or `verifiedOn === null`; `runStage` refuses `NaN` price exactly as it refuses over-budget. Check: "no paid driver without a `verifiedFrom`" |
| **G-10** | ComfyUI has no graphs: the only wiring in the repo passes `comfyGraphs: async () => null`, and `run` correctly reports "the pipeline cannot invent one". The screen row already admits it: "a saved graph per stage — none stored yet" | **Graph store per stage**, version-controlled next to the project (`graphs/<stage>.json`), hashed, resolved by `GraphResolver`, and the `storyboard`/`character_lock` rows stay `not-yet` until a real graph loads — the depth check then forces the screen to change or fail |
| **G-11** | FFmpeg understands three tasks (`concat`, `loudnorm`, `burn-subs`) and its output name has **no extension** (`${projectId}-${sceneId}`, `ffmpeg.ts:81-89`), so a "succeeded" concat returns a path that is not a container the pipeline can consume | **Task table**: one entry per real need (cut-list conform, transcode, frame extraction, subtitle burn, loudness), each with an explicit output container/extension and an input-count check before launch |
| **G-12** | Nobody verifies the artefact exists. `ffmpeg`/`blender`/`whisper` return `succeeded` on exit code alone; ComfyUI returns history filenames; Ollama returns `outputs: []` and buries the text in `log`; no `sha256` anywhere, though `LedgerEvent.refs` is defined as content hashes (`ledger.ts:35`) | **Output admission step in `runStage`**: stat + hash every declared output, write `outputsHash` into the `StageRun`, and treat an absent output as `failed` regardless of exit code — a success claim the platform cannot open is not a success |
| **G-13** | Classes with zero drivers: identity lock, voice, music, sound separation, storage, rented GPU, conform/finish. The registry holds candidates for all of them (21 music rows, 6 identity-lock rows, 15 voice rows, 25 storage-sync rows) and `connectors.ts` holds phone numbers for RunPod/Supabase/PeerTube/OpenTimestamps/Stripe — 5 of the 11 connector rows have no driver at all | **Driver-per-class backlog** in the §2 order (dialogue, identity, music, sound, storage, GPU, conform), each starting as a `not-yet` row and promoted only by a passing probe; the 11 connector rows are labelled in the registry as `phone number, not integration` so nobody reads them as built |
| **G-14** | Two doors. `/create` (`src/lib/render.functions.ts:23`) and the public API (`src/routes/api/public/render.ts:67`) POST straight to Replicate with the **platform's** `REPLICATE_API_KEY`, no licence gate, no `budgetUsd`, no depth, no `StageRun`; the public one writes `render_jobs` under the first user returned by `admin.listUsers({perPage:1})` and echoes the provider error body to the caller | **Fold both paths into `runStage`**: `/api/public/render` becomes a thin adapter that builds a `JobInput` (`runsOn: "any"`, BYO key, `budgetUsd` from the caller's plan), so no paid call exists that skipped the gate; the platform-lent-key pattern is deleted, because the driver's own doctrine is "APEX does not lend compute" (`replicate.ts:61`) |
| **G-15** | The two `not-yet` rows on the screen: `peertube` (self-hosted publication, has a real OAuth2 API and a connector row) and `fish_speech` | **`peertube` driver** at drivable depth (upload → `video.published` → URL into the ledger) so `publish` is not permanently one human click deep; **`fish_speech` driver** per G-1. Both rows flip `not-yet → drivable` in the same commit as their driver, and `apex-check.mjs:271` refuses to let a built tool keep the `not-yet` label |
| **G-16** | Credential hygiene is one-function deep and per-driver: `redact()` exists only inside `replicate.ts:99`. `log` is kept verbatim into Creative Memory by every other driver, and the public endpoint returns provider error text untouched | **Redaction at the boundary, not in the driver**: one `redactSecrets(s)` applied inside `finish()` before `onLedger`/`onMemory`, seeded from the process env's secret values; a driver must not be able to leak by forgetting to call it |
| **G-17** | Budget is per candidate, not per stage: the loop re-checks `input.budgetUsd` for each driver, so a 3-candidate `motion` stage can spend 3× the cap, and a paid failure still books its spend (`replicate.ts:77` charges `price` when the model errors) before falling through | **Stage-level spend ledger**: `runStage` compares the running `run.usdSpent + nextPrice` against the cap and refuses the remaining candidates — the point of `totalSpend()` is a per-project number, and a quote made from per-job caps is a fiction |

---

## 4. Human-in-the-loop handoffs (legitimate, and exactly what APEX does)

A handoff is not a failure to integrate — it is the honest depth for a GUI the platform cannot script.
The rule from `studio.ts:1-8`: at file-exchange depth APEX does all the machine work *around* the
person and records only what came back.

| Stage | Tool | What APEX prepares (in) | What the human does | What APEX ingests (out) | Current `StageRun` |
|---|---|---|---|---|---|
| edit | kdenlive | `${projectId}.kdenlive` project built from the cut list, plus `inputs[]` | confirm the cuts by eye, render to `${sceneId}-master.mp4` at the project preset | the rendered master, hashed, appended to the ledger chain as `generation-run`; "APEX records the rendered file, not the click" | `needs-human`, `used: kdenlive` |
| edit / finish | davinci_resolve | the import list, delivery spec, and the loudness/resolution target | grade, sound post, export IMF or ProRes master | delivered file hash verified against the ledger entry it was promised for | `needs-human` (wins only because ffmpeg failed first) |
| music, sound | ardour | `${projectId}-${sceneId}.ardour` session XML + the stems to place | balance dialogue against ambience, export to `${sceneId}-stems/` | the stem directory, hashed | `needs-human`, `used: ardour` |
| publish | youtube | the portal URL carrying `projectId` | click publish in Studio | the published URL, recorded as the attempt outcome, never claimed as an automated action | today: `failed` (G-3) |
| (any depth) | licence read | the licence text + a diff against the row's claims | a human reads it and sets `licenseVerified`, `lastVerified`, `commercialUse` | the cleared row, which is what lets a driver run at all | blocks everything (G-2) |

Handoff contract the layer must add (none of it exists yet):

* `handoff()` output is a **job folder**, not a sentence: `instructions.md`, the ready-made project/session
  file, `manifest.json` listing `inputs[]` with hashes, and an `expected_outputs[]` list with exact names
  so the ingest step can prove the human delivered what was asked.
* `files[]` today are invented path strings (`${projectId}.kdenlive`, `${projectId}-${sceneId}.ardour`) that
  no code writes; a handoff must only list files that exist, or `handoff-issued` becomes the same lie as a
  fake integration, one level up.
* `needsHuman(runs)` is the queue the creator works; every entry must carry its `instructions` verbatim from
  `run.log`, which is why the string is written for a person and not for a parser.
* Nothing at file-exchange depth may be described as "integrated" on any screen, and nothing may be
  *described* as drivable without a `run()`.

---

## 5. Guardrails that must stay in code

These are load-bearing because a document cannot enforce them. Each row names the file that holds it
and the check that keeps it.

| Guardrail | Where it lives today | Keep / strengthen |
|---|---|---|
| A paid call is refused when price > budget, **before** the HTTP request | `replicate.ts:62` → `refused: ${model} costs $X, this job is capped at $Y` | Keep; add stage-level cumulative cap (G-17) and `budgetUsd: 0` ⇒ local-only enforced for every driver, not just Replicate |
| No quote without a verified price | `cost.ts:58` `estimatePaid` returns `usd: Number.NaN` + "fill in priceList before quoting a client"; `judgeBudget` sets `withinBudget = false` when any price is unknown (`cost.ts:99`) | Keep; wire the same `PriceEntry` into `usdPerJob` so the driver and the quote cannot disagree (G-9) |
| Credentials never enter a log, record or result | `replicate.ts:99` `redact(s, key)` splitting on the key value; the key is read from `process.env` per call and never stored on the record (`replicate.ts:43,58`) | Keep and move redaction to `finish()` so it covers every driver and the public endpoint (G-16); no secret in a `TechRecord`, a `JobResult.reproducible`, or a ledger `details` field |
| A licence a human has not read stops the tool at the moment of use | `contract.ts:82` `gateOnLicence`; `schema.ts:159` a row with `lastVerified === null` cannot keep `licenseVerified: true`; `isClearedForWork` = `licenseVerified && commercialUse === "yes"` | Keep the gate; fix the intent scoping (G-2) rather than loosening the proof required |
| No silent use of a user's machine for someone else's job | declared as `runsOn: "any" \| "creator-machine" \| "apex-server"` and BYO-key doctrine "APEX does not lend compute" — **but read nowhere** | Enforce runner affinity in `runStage` (G-6) and stop attributing public-API jobs to `listUsers()[0]` (G-14); the person who owns the hardware is a routing input, not a comment |
| A tool that overclaims is skipped and named | `orchestrate.ts:62` + `misdeclaredDrivers()`; check "no shipped driver misdeclares its depth" | Keep; add the missing-`probe` case (G-7) |
| Failed attempts are kept, verbatim, and never rewritten as successes | `run.attempts` per candidate, `run.log` per tool, `hooks.onMemory` on every run, `memory.dontRepeat()` returns only failures | Keep; failures are the product's most valuable rows — never a `WAIT`, always a `FAIL` |
| Every connector carries its own exit | `connectors.ts:281` `connectorsWithoutExit()` asserted empty; `schema.ts` `replacementOptions` "never empty"; `SINGLE_POINT_RISK` names every provider-cloud host | Keep; a capability with one driver is reported, not routed around |
| Local-first when offline is required | `models.ts:94` `routeOrder` keeps only `runs === "local"` when `need.offline` | Keep; it is the reason a rented-GPU driver can never be the only motion route |
| A verdict refuses to overclaim | `psi.ts`/`verify.ts` checks (`notClaims`, `anchor === "cannot-check"`, placeholder anchor refused) | Keep — the same discipline the depth vocabulary applies to tools |
| Binary gates, no scores | `judgeBudget.withinBudget`, `canMove("rejected","adopted") === false`, `EVAL_AXES` pass/fail with `evidence` | Keep: every gate in this layer answers pass/fail plus the next physical action |

---

## 6. How depth drift is detected (screen must equal code)

Drift = the `/connect` screen (`src/routes/connect.tsx`, fed by the client-safe `connection.ts`)
telling a different story than `drivers/index.ts`. Four independent detectors, all mechanical:

1. **Depth agreement, per tool.** Import `buildDrivers()` and `CONNECTIONS` in one process, build
   `toolId → depth` from the drivers, then fail on any screen row that is not `not-yet` and whose depth
   differs (`apex-check.mjs:269`). The failure detail prints `toolId: screen=X code=Y|absent`, so "absent"
   is itself the finding: a row claiming a connection with no driver object behind it.
2. **Nothing built is still advertised as unbuilt.** A `not-yet` row whose `toolId` *does* exist in the
   driver table fails (`apex-check.mjs:271`). This is what forces the promotion commit to touch both files.
3. **Routing agreement, per stage.** Union of stage keys from `STAGE_CONNECTION` and `stageRoutes()`, compared
   as sorted tool sets (`apex-check.mjs:279`); any drift prints `stage screen=[a+b] code=[a]`. Order matters in
   `stageRoutes` (it is the fall-through order), so the comparison is on the set and the check should also assert
   identical order when both sides are non-empty.
4. **Self-declaration at runtime.** `runStage` logs "<tool> declares *label* but has no matching
   implementation" on every pass, and `misdeclaredDrivers()` asserts zero out-of-band — a driver cannot drift
   because a screen was edited; the contract referee catches it whether or not anyone looked.

Blind spots to close so the detector set is complete (each is a measured behaviour, not a theory):

* **A missing stage key is invisible to `uncoveredStages`** — it returns `[]` while `dialogue` is uncovered
  (G-4). Fix by making `stageRoutes()` emit a key for every `STAGES_THE_PIPELINE_NAMES` entry; then the check
  line can call `uncoveredStages` instead of hand-rolling the filter, and the screen's
  `stageCoverage().empty` and the code's gap list are the same array.
* **A depth with no terminal state** — portal-only reports `failed`, so the screen would be right about the
  table and wrong about what happened (G-3). Drift detection must cover *states*, not only rows: assert that a
  portal-only candidate never yields `failed`, and that a `file-exchange` candidate never yields `succeeded`.
* **Declared-but-unexercised states** — `queued`, `running`, `timed-out` appear in `JobState` and nowhere else
  (G-7). A check should assert every declared state is emitted by at least one driver or by the door, or be
  deleted; an unreachable state in the vocabulary is drift waiting to be misread.
* **Depth claimed from a machine that cannot reach the tool** — `runsOn` is unread (G-6), so "drivable" can be
  true in code and false in the room. The runner should report probe results back per host and the check gate
  "drivable" on a probe that has passed **on the runner**, recorded with a date, exactly as `lastVerified`
  records a licence read. Depth is a claim with an expiry, not a label.
* **Phone-book vs driver** — 5 of the 11 `connectors.ts` rows have no driver (G-13). Add a check that prints
  each connector's driver status so no reader mistakes `RunPod: apiBaseUrl, authMethod` for a connection.

The line this section exists to hold: 68 gates pass, `dialogue` is empty, 6 tools are drivable on paper, 1
is reachable on this machine, and 0 stages currently complete. The screen is accurate; the platform is not
yet capable. Closing G-1, G-2 and G-5 is what turns "the one door" from a well-tested contract into a thing
that finishes a shot.
