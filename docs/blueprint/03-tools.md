# 03 — THE TOOL SET (open-source arms register)

Status of the ground truth at writing time — **measured, not remembered, and three of the
briefing numbers were wrong** (see §0). Reproduce every figure in this section with the command
printed at the end of §0.

- `MASTER_REGISTRY` = 109 + 82 + 130 + 183 + 287 + 318 = **1,109 rows** (`src/lib/apex/index.ts:18-25`).
- **55 of 56** `CATEGORIES` carry rows (`schema.ts:12-69`); the one empty category is **`workflow-automation`**.
- **0 rows cleared for client work.** `isClearedForWork` needs `licenseVerified && commercialUse === "yes"`
  (`schema.ts:164-166`); measured `licenseVerified = true` on **0** rows, `lastVerified !== null` on **0**
  rows, `commercialUse = "yes"` on **0** rows.
- **1,109 of 1,109 rows await a human licence read** — `licenceReviewNeeded()` (`index.ts:68`) and
  `reviewQueue()` (`licenseguard.ts:108`) both return the whole table. `guard(row, "client-work")`
  returns `verify-first` for **all 1,109**. The repo's own checker prints the same line:
  `READ rows awaiting a human licence read: 1109 of 1109`.
- **0 duplicate names across the six catalogues** (`index.ts:55`) — no row is a second agent
  describing the same tool twice.
- **0 rows without a written exit** (`index.ts:50`; checker line: `PASS every row has a written exit — 0 missing`).
  The exit *lists* exist; what is missing is a **resolvable** exit — see §0c.
- Drivers actually built: **10** (`drivers/index.ts:28`). Depths: **6 drivable / 3 file-exchange / 1 portal-only / 2 not-yet**
  (`connection.ts:19-32`). Stage routes: **9 of 10** named stages (`dialogue` is `[]`, `connection.ts:39`).
- **All 10 wired drivers currently return `blocked-by-licence` for `client-work`** (`drivers/contract.ts:82-101`,
  because `licenseVerified === false` on every record). The platform can make a film for itself;
  it cannot sell one. That is the whole content of §5.

---

## 0. WHAT WAS CLAIMED, WHAT WAS MEASURED

| Briefing claim | Measured | Verdict |
|---|---|---|
| 1,109 unique rows across 6 catalogues | 1,109 rows, `duplicateNames()` = 0 | **CONFIRMED** |
| 55 of 56 categories have rows | 55 covered; empty = `workflow-automation` | **CONFIRMED** |
| Zero rows cleared for client work | 0 (`shapeOf().clearedForClientWork`, `schema.ts:164`) | **CONFIRMED** |
| All 1,109 await a human licence read | 1,109 (`licenceReviewNeeded`, `reviewQueue`) | **CONFIRMED** |
| "top five tools with no written exit" | **0 rows lack `replacementOptions`** | **FALSE AS STATED** — restated in §0c |

**Where the rows sit** (counted by import, not by `grep`): `creative-visual` 109, `creative-time` 82,
`creative-sound-design` 130, `intelligence` 183, `platform-infra` 287, `economy-reach` 318. The brief
calls this directory `src\lib\apex\catalogues\`; it is `src\lib\apex\catalog\`. `docs/blueprint/` held
only §05 and §10 before this file.

### 0c. The real exit finding

Every row has *a* list, so `rowsWithoutExit()` is silent about the danger. Measured instead:

- **147 rows** carry exactly **one** exit (`replacementOptions.length === 1`).
- **572** exit mentions across **385** rows name something that is **not a registry row**; **510 distinct
  exit names** cannot be resolved to a row. 59 rows are entirely unresolvable, **32 of them in
  film-critical categories** — including five rows at priority `now` that Tier-1 depends on (§6.4).
- **1 record in code has no exit at all**: `makePortalDriver` builds its record with
  `replacementOptions: []` (`drivers/studio.ts:95`) — i.e. the `youtube` portal row. Portal depth is
  the one place the "never a single point of failure" rule is not enforced, because it builds a
  record rather than reading one.

### 0d. Reproduce

```
node --experimental-strip-types scripts/apex-check.mjs
node --experimental-strip-types -e "import('file:///D:/ApexEmpire/films/lllppp/src/lib/apex/index.ts').then(m=>console.log(JSON.stringify(m.shapeOf())))"
```
(`--experimental-strip-types` runs the `.ts` catalogues directly, provided every specifier ends in `.ts`
and is a `file:///` URL — a bare `D:/…` specifier fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.)

---

## 1. THE TIER-1 WORKING SET

The short list the first version of the Film Verse must drive to produce a finished film. Depth is
**what the driver table says**, not what the tool is capable of. `licence family` is the string the
registry holds — **every one of them unread by a human**, so every one of them gates at
`verify-first`. "Clear today?" is binary: **no row in this table is cleared.**

| Stage | Primary tool | Its written exit, verbatim from the row | Licence family as recorded | Depth (code) | Clear today? |
|---|---|---|---|---|---|
| **storyboard** | ComfyUI | InvokeAI; StableSwarmUI; SD.Next | GPL-3.0 | drivable — **but "a saved graph per stage — none stored yet"** (`connection.ts:24`) | no |
| storyboard (alt) | Blender | Bforartists; Maya (if licensed); Godot for previz | GPL-3.0 (`schema` row) vs **GPL-2.0-or-later** (driver record) — two answers, §6.3 | drivable | no |
| **character lock** | IP-Adapter-FaceID | InstantID; PuLID; character LoRA | custom-open | drivable *through ComfyUI only* | no |
| character lock | InstantID / PuLID | PuLID; IP-Adapter-FaceID; character LoRA | Apache-2.0 (both rows) | drivable through ComfyUI | no |
| character lock | LoRA fine-tuning (peft-based) | kohya_ss; AI-Toolkit; ostris ai-toolkit — **none of the three is a row** | Apache-2.0 | drivable (python) | no |
| **motion** | Wan 2.x | HunyuanVideo; LTX-Video; **RunPod rented GPU** (a rented service, not a row) | Apache-2.0 | drivable via ComfyUI / Replicate (`your account`) | no |
| motion (alt) | HunyuanVideo / LTX-Video | Wan 2.x; CogVideoX / AnimateDiff; Stable Video Diffusion | custom-open (both) | drivable | no |
| motion (frame interp) | RIFE | FILM; GMFlow; Blender VSE interpolation | MIT | drivable | no |
| motion (lip-sync) | Wav2Lip / MuseTalk / LivePortrait | each other + SadTalker | custom-open (all three) | drivable | no |
| **dialogue** | **Fish Speech — nothing wired at all** | CosyVoice; Piper; F5-TTS (`F5-TTS` is not a row) | CC-BY-SA-4.0 (weights) / BSD-3-Clause (code) | **not-yet** (`connection.ts:31`) | no |
| dialogue (alt) | CosyVoice | Fish Speech; Piper; F5-TTS | Apache-2.0 | not-yet | no |
| dialogue (do not ship) | ChatTTS | Piper; Coqui TTS; MeloTTS | **CC-BY-NC-4.0 (research)** — non-commercial as recorded | not-yet | no, and cannot be cleared for a paying job on that string |
| **music** | MusicGen | AudioCraft; Stable Audio Open; Riffusion | **CC-BY-NC-4.0 / MIT (code, mixed)** — NC sits on the weights | file-exchange at best | no |
| music (alt) | Stable Audio Open | MusicGen; AudioLDM; Riffusion | Stable AI Community License | not wired | no |
| music (the $0 path) | MuseScore + Surge XT + Hydrogen, mixed in Ardour | (rows exist; the DAW chain is what ships) | GPL-2.0-or-later / MIT / LGPL families as recorded | file-exchange | no |
| **sound** | Demucs | Spleeter; Ultimate Vocal Remover; AudioSep | MIT | drivable | no |
| sound (mix) | FFmpeg + Ardour | GStreamer; HandBrake (same libavcodec engine); Shutter Encoder / Qtractor; Zrythm; MusE | GPL-2.0-or-later / LGPL-2.1-or-later (build-dependent) / GPL-2.0-or-later | **drivable (ffmpeg) + file-exchange (ardour)** | no |
| **subtitles** | Whisper | whisper.cpp; WhisperX; Vosk | MIT | drivable | no |
| subtitles (render) | ffmpeg subtitles filter + WebVTT tooling | (burn-in is drivable; the sidecar format is a standard row) | GPL-2.0-or-later as recorded / W3C | drivable / protocol | no |
| subtitles (human polish) | Subtitle Edit | Aegisub; Amara; ffmpeg subtitles filter | GPL-3.0 | **no driver** — desktop-app | no |
| **edit** | FFmpeg | GStreamer; HandBrake; Shutter Encoder | GPL/LGPL build-dependent | drivable | no |
| edit (timeline) | Kdenlive | OpenShot; Pitivi; Olive; Shotcut | registry **GPL-3.0-or-later** vs driver record **`license: "unverified"`** — §6.3 | file-exchange ("a human confirms the timing") | no |
| edit (exchange format) | OpenTimelineIO | FCPXML (Final Cut exchange); CMX3600 EDL; AAF — **none of the three is a row** | Apache-2.0 | library, no driver | no |
| **finish** | DaVinci Resolve | Blender Video Sequence Editor; Kdenlive; Olive | driver: proprietary freemium (Resolve) / paid (Studio), `commercialUse: "restricted"`, `redistribution: "no"`; registry row "DaVinci Resolve free edition" says `proprietary-free` | file-exchange — "Studio edition for scripting — not assumed" | no |
| finish (comp/colour) | Natron + OpenColorIO + Blender Compositor | Blender Compositor; Gaffer; OpenShade / LUT files only; Arri Color; own transform tables / Natron; GStreamer pipelines; Kdenlive filters | GPL-2.0 / BSD-3-Clause / GPL-3.0 | **no drivers** — desktop-app / library | no |
| finish (master formats) | OpenEXR · ACES · AV1 · x264 · x265 · IMF · MXF | DPX; ProRes mezzanine; VP9; Matroska — mixed resolvability | BSD-3-Clause / standard spec / RF (AOM) / GPL-2.0-or-later / SMPTE standard | library/cli, no drivers | no |
| **publish** | YouTube Data API — **the platform records the URL, it does not publish** | PeerTube; Vimeo API; Owncast | proprietary-service | **portal-only**, and its driver record has `replacementOptions: []` (§0c) | no |
| publish (sovereign) | PeerTube | Owncast; Jellyfin; YouTube Data API | AGPL-3.0 | **not-yet** — needs a server and an API driver | no |
| **provenance (cross-stage)** | C2PA + OpenTimestamps + Sigstore | c2pa-rs/-python/-js are separate rows; anchoring falls back to Bitcoin anchoring row | C2PA standards / standard-spec families | none wired | no |

**Reading of the table.** **Seven** of the ten stages have a drivable path today (`storyboard`,
`character_lock`, `motion`, `sound`, `subtitles`, `edit`, `finish` — `stageCoverage()` reports 9 of 10
routes non-empty); **music is file-exchange only** — a human balances and exports in Ardour;
**publish is portal-only** — "APEX records the published URL; it does not publish"; and
**dialogue has nothing** — the single stage where the Film Verse cannot act, with `STAGE_CONNECTION.dialogue = []`
and no driver. The second real problem is not coverage but custody: **not one of these rows has been
read by a human**, so `blocked-by-licence` stops every one of them at the moment of use — including
all 10 wired drivers, measured. Tier-1 is therefore **~25 rows, not 1,109** — and §5 is the queue that
turns them from inventory into instruments.

---

## 2. THE COMPLETE KINGDOM-BY-KINGDOM ENUMERATION

All **1,109 rows**, one line per tool, grouped kingdom → category. Licence string is what the row
records — **`unverified` on 95 rows means not even the family is on file**; no row is human-read.

Legend: `▲` = in the Tier-1 working set of §1 — **48 rows** carry the mark, because §1 names an
alternate for most stages. `★` = row priority `now` (**75 rows platform-wide**, 41 of them in film
categories). `†` = a driver exists in `drivers/index.ts` — **9 rows, not 10**: the tenth driver,
`Replicate`, has no registry row at all (§3.6). Category headers carry the §4 verdict (`KEEP` or
`FREEZE`) so this list doubles as the cut manifest. `sound-fx` is listed twice because the two agents
who wrote `creative-time` and `creative-sound-design` both filed rows there: 3 + 24 = 27 rows, one
category, two kingdoms.

### Kingdom `creative-visual` — 109 rows

#### `image-generation` — 29 rows · **KEEP**

- ▲ ★ † ComfyUI — `GPL-3.0` · priority now · node-graph · $0
- AUTOMATIC1111 Stable Diffusion WebUI — `AGPL-3.0` · web-app · $0
- InvokeAI — `Apache-2.0` · web-app · $0
- Fooocus — `GPL-3.0` · web-app · $0
- SD.Next — `MIT` · web-app · $0
- StableSwarmUI — `MIT` · web-app · $0
- Krita AI Diffusion — `MIT` · plugin-or-cli · $0
- Hugging Face Diffusers — `Apache-2.0` · python-api · $0
- ★ ControlNet — `Apache-2.0` · priority now · node-graph · $0
- ★ IP-Adapter — `Apache-2.0` · priority now · node-graph · $0
- Segment Anything — `Apache-2.0` · python-api · $0
- Grounding DINO — `Apache-2.0` · python-api · $0
- Detectron2 — `Apache-2.0` · python-api · $0
- MMDetection — `Apache-2.0` · python-api · $0
- Ultralytics YOLO — `AGPL-3.0` · python-api · $0
- rembg — `MIT` · cli · $0
- BackgroundMattingV2 — `MIT` · cli · $0
- Waifu2x — `MIT` · web-app · $0
- Upscayl — `AGPL-3.0` · desktop-app · $0
- ★ Stable Diffusion — `custom-open` · priority now · node-graph · $0
- ★ SDXL — `custom-open` · priority now · node-graph · $0
- ★ FLUX — `custom-open` · priority now · node-graph · $0
- PixArt — `unverified` *(no family on file)* · node-graph · $0
- Kandinsky — `unverified` *(no family on file)* · node-graph · $0
- Wurstchen — `unverified` *(no family on file)* · node-graph · $0
- AuraFlow — `custom-open` · node-graph · $0
- Lumina — `Apache-2.0` · node-graph · $0
- HunyuanImage — `custom-open` · node-graph · $0
- Qwen-Image — `Apache-2.0` · node-graph · $0

#### `video-generation` — 26 rows · **KEEP**

- ▲ ★ Wan 2.x — `Apache-2.0` · priority now · node-graph · $0
- ▲ HunyuanVideo — `custom-open` · node-graph · $0
- ▲ LTX-Video — `custom-open` · node-graph · $0
- CogVideoX — `custom-open` · python-api · $0
- Stable Video Diffusion — `custom-open` · node-graph · $0
- AnimateDiff — `Apache-2.0` · node-graph · $0
- VideoCrafter — `custom-open` · python-api · $0
- Open-Sora — `Apache-2.0` · python-api · $0
- Open-Sora-Plan — `Apache-2.0` · python-api · $0
- Mochi — `Apache-2.0` · node-graph · $0
- FramePack — `Apache-2.0` · node-graph · $0
- ▲ LivePortrait — `custom-open` · node-graph · $0
- ▲ MuseTalk — `custom-open` · node-graph · $0
- SadTalker — `Apache-2.0` · node-graph · $0
- ▲ Wav2Lip — `custom-open` · python-api · $0
- ▲ ★ RIFE — `MIT` · priority now · cli · $0
- FILM — `unverified` *(no family on file)* · python-api · $0
- GMFlow — `Apache-2.0` · python-api · $0
- RAFT — `BSD-3-Clause` · python-api · $0
- BasicVSR++ — `Apache-2.0` · python-api · $0
- RealBasicVSR — `Apache-2.0` · python-api · $0
- ★ MoviePy — `MIT` · priority now · python-api · $0
- ★ PySceneDetect — `BSD-3-Clause` · priority now · cli · $0
- ★ Auto-Editor — `GPL-3.0` · priority now · cli · $0
- Manim — `MIT` · cli · $0
- ★ ComfyUI-video-workflows — `GPL-3.0` · priority now · node-graph · $0

#### `three-d` — 24 rows · **KEEP**

- ▲ ★ † Blender — `GPL-3.0` · priority now · plugin-or-cli · $0
- Wings 3D — `unverified` *(no family on file)* · desktop-app · $0
- Bforartists — `GPL-3.0` · desktop-app · $0
- MakeHuman — `custom-open` · desktop-app · $0
- MB-Lab — `unverified` *(no family on file)* · plugin-or-cli · $0
- FreeCAD — `LGPL-2.1` · plugin-or-cli · $0
- OpenSCAD — `GPL-3.0` · cli · $0
- SolveSpace — `GPL-3.0` · desktop-app · $0
- BRL-CAD — `CDDL-1.0` · cli · $0
- LibreCAD — `unverified` *(no family on file)* · desktop-app · $0
- Instant Meshes — `unverified` *(no family on file)* · desktop-app · $0
- MeshLab — `GPL-3.0` · cli · $0
- Meshroom — `MPL-2.0` · node-graph · $0
- MeshFix — `unverified` *(no family on file)* · cli · $0
- Open3D — `MIT` · python-api · $0
- COLMAP — `BSD-3-Clause` · cli · $0
- AliceVision — `MPL-2.0` · cli · $0
- OpenMVG — `MPL-2.0` · cli · $0
- OpenMVS — `AGPL-3.0` · cli · $0
- Regard3D — `GPL-3.0` · desktop-app · $0
- Nerfstudio — `Apache-2.0` · python-api · $0
- gsplat — `Apache-2.0` · python-api · $0
- ★ USD (OpenUSD) — `Apache-2.0 (modified)` · priority now · library · $0
- OpenVDB — `MPL-2.0` · library · $0

#### `animation` — 7 rows · **KEEP**

- OpenToonz — `custom-open` · desktop-app · $0
- Krita Animation — `GPL-3.0` · desktop-app · $0
- Synfig Studio — `GPL-3.0` · desktop-app · $0
- Pencil2D — `GPL-2.0` · desktop-app · $0
- Tahoma2D — `custom-open` · desktop-app · $0
- Wick Editor — `unverified` *(no family on file)* · web-app · $0
- Rigify — `GPL-3.0` · plugin-or-cli · $0

#### `vfx-compositing` — 7 rows · **KEEP**

- ▲ ★ Natron — `GPL-2.0` · priority now · desktop-app · $0
- ▲ ★ Blender Compositor — `GPL-3.0` · priority now · cli · $0
- G'MIC — `CeCILL-2.0` · cli · $0
- OpenFX — `BSD-3-Clause` · protocol · $0
- ▲ ★ OpenColorIO — `BSD-3-Clause` · priority now · library · $0
- GStreamer — `LGPL-2.1` · cli · $0
- frei0r — `GPL-2.0` · protocol · $0

#### `identity-lock` — 6 rows · **KEEP**

- ▲ IP-Adapter-FaceID — `custom-open` · node-graph · $0
- ▲ InstantID — `Apache-2.0` · node-graph · $0
- ▲ PuLID — `Apache-2.0` · node-graph · $0
- ▲ ★ LoRA fine-tuning (peft-based character training) — `Apache-2.0` · priority now · python-api · $0
- TTP / pose-lock — `unverified` *(no family on file)* · python-api · $0
- ▲ ★ ControlNet-openpose — `custom-open` · priority now · node-graph · $0

#### `upscale` — 5 rows · **KEEP**

- ★ Real-ESRGAN — `BSD-3-Clause` · priority now · cli · $0
- SwinIR — `Apache-2.0` · python-api · $0
- LaMa — `Apache-2.0` · python-api · $0
- InstructPix2Pix — `Apache-2.0` · node-graph · $0
- VapourSynth — `BSD-2-Clause` · cli · $0

#### `render-farm` — 3 rows · **KEEP**

- Blender Flamenco — `AGPL-3.0` · cli · $0
- OpenCue — `Apache-2.0` · http-api · $0
- ★ Deadline-style custom worker queue — `unverified` *(no family on file)* · priority now · cli · $0

#### `face-restore` — 2 rows · **KEEP**

- ★ GFPGAN — `Apache-2.0` · priority now · python-api · $0
- CodeFormer — `custom-open` · python-api · $0


### Kingdom `creative-time` — 82 rows

#### `music` — 21 rows · **KEEP**

- ▲ MusicGen — `CC-BY-NC-4.0 / MIT (code, mixed)` · plugin-or-cli · $0
- AudioCraft — `MIT (code) / CC-BY-NC (weights)` · plugin-or-cli · $0
- ▲ Stable Audio Open — `Stable AI Community License` · plugin-or-cli · $0
- Riffusion — `MIT (code) / research weights` · plugin-or-cli · $0
- DDSP — `Apache-2.0` · plugin-or-cli · $0
- Basic Pitch — `Apache-2.0` · plugin-or-cli · $0
- ▲ Hydrogen — `GPL-2.0-or-later` · plugin-or-cli · $0
- ▲ Surge XT — `GPL-3.0-or-later` · plugin-or-cli · $0
- ZynAddSubFX — `GPL-2.0-or-later` · plugin-or-cli · $0
- Yoshimi — `GPL-2.0-or-later` · plugin-or-cli · $0
- Vital — `GPL-3.0-or-later (base) / proprietary features` · plugin-or-cli · $0
- Pure Data — `LGPL-2.1-or-later` · plugin-or-cli · $0
- SuperCollider — `GPL-2.0-or-later` · plugin-or-cli · $0
- Csound — `LGPL-2.1-or-later` · plugin-or-cli · $0
- ▲ MuseScore — `GPL-3.0-or-later` · plugin-or-cli · $0
- LilyPond — `GPL-3.0-or-later` · plugin-or-cli · $0
- Frescobaldi — `GPL-3.0-or-later` · plugin-or-cli · $0
- LinuxSampler — `GPL-2.0-or-later` · plugin-or-cli · $0
- FluidSynth — `LGPL-2.1-or-later` · plugin-or-cli · $0
- SFZ — `open specification` · plugin-or-cli · $0
- TuxGuitar — `LGPL-2.1-or-later` · plugin-or-cli · $0

#### `video-editing` — 17 rows · **KEEP**

- ▲ † FFmpeg — `GPL-2.0-or-later / LGPL-2.1-or-later (build-dependent)` · plugin-or-cli · $0
- ▲ † Kdenlive — `GPL-3.0-or-later` · plugin-or-cli · $0
- Shotcut — `GPL-3.0-or-later` · plugin-or-cli · $0
- Olive — `GPL-3.0-or-later` · plugin-or-cli · $0
- OpenShot — `GPL-3.0-or-later` · plugin-or-cli · $0
- Pitivi — `LGPL-3.0-or-later / GPL-3.0-or-later (contribs)` · plugin-or-cli · $0
- LosslessCut — `MIT` · plugin-or-cli · $0
- Flowblade — `GPL-3.0-or-later` · plugin-or-cli · $0
- Avidemux — `GPL-2.0-or-later` · plugin-or-cli · $0
- LiVES — `GPL-2.0-or-later` · plugin-or-cli · $0
- Cinelerra — `GPL-2.0-or-later` · plugin-or-cli · $0
- MLT Framework — `GPL-3.0-or-later / LGPL-3.0-or-later (dual)` · plugin-or-cli · $0
- MediaInfo — `BSD-2-Clause` · plugin-or-cli · $0
- MKVToolNix — `GPL-2.0-or-later` · plugin-or-cli · $0
- HandBrake — `GPL-2.0-or-later` · plugin-or-cli · $0
- Shutter Encoder — `GPL-3.0-or-later` · plugin-or-cli · $0
- Blender video sequence editor — `GPL-3.0-or-later` · plugin-or-cli · $0

#### `video-finishing` — 15 rows · **KEEP**

- ▲ OpenTimelineIO — `Apache-2.0` · plugin-or-cli · $0
- ▲ OpenEXR — `BSD-3-Clause` · plugin-or-cli · $0
- ▲ ACES — `standard/spec (config Apache-2.0)` · plugin-or-cli · $0
- ▲ IMF — `SMPTE standard` · plugin-or-cli · $0
- ▲ MXF — `SMPTE standard` · plugin-or-cli · $0
- Matroska — `open specification (LGPL implementations)` · plugin-or-cli · $0
- WebM — `royalty-free open format` · plugin-or-cli · $0
- ▲ AV1 — `RF (Alliance for Open Media)` · plugin-or-cli · $0
- ▲ x264 — `GPL-2.0-or-later` · plugin-or-cli · $0
- ▲ x265 — `GPL-2.0-or-later / commercial (dual)` · plugin-or-cli · $0
- dav1d — `BSD-2-Clause` · plugin-or-cli · $0
- opencolorio-luts — `BSD-3-Clause` · plugin-or-cli · $0
- ▲ † DaVinci Resolve free edition — `proprietary-free` · plugin-or-cli · $0
- Natron finishing — `GPL-2.0-or-later` · plugin-or-cli · $0
- Stirling video masters via ffmpeg — `Apache-2.0 / proprietary (dual)` · plugin-or-cli · $0

#### `voice` — 15 rows · **KEEP**

- ▲ Fish Speech — `CC-BY-SA-4.0 (weights) / BSD-3-Clause (code)` · plugin-or-cli · $0
- ▲ CosyVoice — `Apache-2.0` · plugin-or-cli · $0
- OpenVoice — `MIT` · plugin-or-cli · $0
- ▲ ChatTTS — `CC-BY-NC-4.0 (research)` · plugin-or-cli · $0
- MaryTTS — `LGPL-3.0 / AGPL-3.0 (components)` · plugin-or-cli · $0
- Festival — `University of Edinburgh free licence` · plugin-or-cli · $0
- Tortoise TTS — `Apache-2.0` · plugin-or-cli · $0
- Bark — `MIT` · plugin-or-cli · $0
- StyleTTS2 — `MIT` · plugin-or-cli · $0
- MeloTTS — `MIT` · plugin-or-cli · $0
- Parler-TTS — `Apache-2.0 (code) / CC (data)` · plugin-or-cli · $0
- Coqui TTS — `MPL-2.0` · plugin-or-cli · $0
- RVC — `MIT` · plugin-or-cli · $0
- so-vits-svc — `AGPL-3.0-or-later (some MIT forks)` · plugin-or-cli · $0
- WhisperX alignment-for-dubbing — `BSD-4-Clause / MIT (components)` · plugin-or-cli · $0

#### `audio-daw` — 11 rows · **KEEP**

- ▲ † Ardour — `GPL-2.0-or-later` · plugin-or-cli · $0
- LMMS — `GPL-2.0-or-later` · plugin-or-cli · $0
- Qtractor — `GPL-2.0-or-later` · plugin-or-cli · $0
- Rosegarden — `GPL-2.0-or-later` · plugin-or-cli · $0
- MusE — `GPL-2.0-or-later` · plugin-or-cli · $0
- Zrythm — `AGPL-3.0-or-later` · plugin-or-cli · $0
- Tenacity — `GPL-3.0-or-later / LGPL-3.0-or-later` · plugin-or-cli · $0
- Audacity — `GPL-3.0-or-later` · plugin-or-cli · $0
- Sonic Visualiser — `GPL-3.0-or-later` · plugin-or-cli · $0
- Spek — `GPL-3.0-or-later` · plugin-or-cli · $0
- Reaper — `proprietary-trial` · plugin-or-cli · $0

#### `sound-fx` — 3 rows · **KEEP**

- Airwindows — `MIT` · plugin-or-cli · $0
- Patchage — `GPL-2.0-or-later` · plugin-or-cli · $0
- SoLo — `MIT` · plugin-or-cli · $0


### Kingdom `creative-sound-design` — 130 rows

#### `games-interactive` — 33 rows · **FREEZE (§4a)**

- ★ Godot — `MIT` · priority now · plugin-or-cli · $0
- Bevy — `MIT` · library · $0
- GDevelop — `MIT` · web-app · $0
- Flax Engine — `source-available` · desktop-app · $0
- O3DE — `Apache-2.0` · desktop-app · $0
- Stride — `MIT` · desktop-app · $0
- Urho3D — `MIT` · library · $0
- Cocos Creator — `source-available` · desktop-app · $0
- Defold — `source-available` · desktop-app · $0
- Phaser — `MIT` · library · $0
- PixiJS — `MIT` · library · $0
- ★ Three.js — `MIT` · priority now · library · $0
- Babylon.js — `Apache-2.0` · library · $0
- PlayCanvas — `MIT` · web-app · $0
- melonJS — `MIT` · library · $0
- Box2D — `MIT` · library · $0
- Bullet — `Zlib` · library · $0
- Jolt Physics — `MIT` · library · $0
- ODE — `BSD-3-Clause` · library · $0
- Rapier — `Apache-2.0` · library · $0
- ENet — `MIT` · library · $0
- Nakama — `Apache-2.0` · http-api · $0
- Colyseus — `MIT` · library · $0
- Mirror — `MIT` · library · $0
- OpenXR — `Apache-2.0` · library · $0
- Monado — `Boost` · cli · $0
- WebXR — `W3C` · protocol · $0
- A-Frame — `MIT` · library · $0
- Open Brush — `MIT` · desktop-app · $0
- Tiled — `GPL-2.0` · cli · $0
- LDtk — `MIT` · desktop-app · $0
- Kenney asset tools — `CC0-1.0` · desktop-app · $0
- Aseprite — `source-available` · cli · $0

#### `design-graphics` — 27 rows · **KEEP**

- ★ GIMP — `GPL-3.0` · priority now · cli · $0
- ★ Krita — `GPL-3.0` · priority now · desktop-app · $0
- MyPaint — `GPL-2.0` · desktop-app · $0
- Pinta — `GPL-3.0` · desktop-app · $0
- LazPaint — `GPL-3.0` · desktop-app · $0
- KolourPaint — `GPL-2.0` · desktop-app · $0
- ★ Inkscape — `GPL-3.0` · priority now · cli · $0
- Karbon — `GPL-2.0` · desktop-app · $0
- sK1 — `GPL-3.0` · desktop-app · $0
- LibreOffice Draw — `MPL-2.0` · desktop-app · $0
- Penpot — `AGPL-3.0` · web-app · $0
- Quant-UX — `BSD-3-Clause` · web-app · $0
- Excalidraw — `MIT` · web-app · $0
- Pencil Project — `GPL-2.0` · desktop-app · $0
- Scribus — `GPL-2.0` · desktop-app · $0
- ★ ImageMagick — `MIT-like` · priority now · cli · $0
- GraphicsMagick — `MIT-like` · cli · $0
- ★ OpenCV — `Apache-2.0` · priority now · python-api · $0
- VIPS — `LGPL-3.0` · cli · $0
- FontForge — `GPL-3.0` · python-api · $0
- Birdfont — `GPL-3.0` · desktop-app · $0
- Glyphr Studio — `MIT` · web-app · $0
- HarfBuzz — `MIT` · library · $0
- FreeType — `FTL` · library · $0
- LittleCMS — `MIT` · cli · $0
- LaTeX — `LPPL` · cli · $0
- Typst — `Apache-2.0` · cli · $0

#### `sound-fx` — 24 rows · **KEEP**

- ▲ ★ Demucs — `MIT` · priority now · python-api · $0
- Spleeter — `MIT` · cli · $0
- Ultimate Vocal Remover — `MIT` · desktop-app · $0
- AudioSep — `unverified` *(no family on file)* · python-api · $0
- LSP Plugins — `GPL-3.0` · desktop-app · $0
- x42 Plugins — `GPL-2.0` · desktop-app · $0
- Calf Studio Gear — `LGPL-2.1` · desktop-app · $0
- Dragonfly Reverb — `GPL-3.0` · desktop-app · $0
- DISTRHO — `GPL-3.0` · desktop-app · $0
- Guitarix — `GPL-2.0` · desktop-app · $0
- JACK — `GPL-2.0` · cli · $0
- PipeWire — `MIT` · cli · $0
- Carla — `GPL-2.0` · desktop-app · $0
- OpenAL Soft — `LGPL-2.1` · library · $0
- miniaudio — `public-domain` · library · $0
- SoLoud — `source-available` · library · $0
- Essentia — `AGPL-3.0` · python-api · $0
- librosa — `ISC` · python-api · $0
- Madmom — `BSD-3-Clause` · cli · $0
- BEATs — `MIT` · python-api · $0
- CLAP — `MIT` · library · $0
- Wav2Vec2 — `MIT` · python-api · $0
- HuBERT — `MIT` · python-api · $0
- EnCodec — `MIT` · cli · $0

#### `writing-script` — 20 rows · **KEEP**

- Manuskript — `GPL-3.0` · desktop-app · $0
- novelWriter — `GPL-3.0` · desktop-app · $0
- Bibisco — `AGPL-3.0` · desktop-app · $0
- Quoll Writer — `AGPL-3.0` · desktop-app · $0
- oStorybook — `GPL-3.0` · desktop-app · $0
- ★ Fountain syntax tooling — `MIT` · priority now · cli · $0
- Trelby — `GPL-2.0` · desktop-app · $0
- KIT Scenarist — `GPL-3.0` · desktop-app · $0
- Sigil — `GPL-3.0` · desktop-app · $0
- Calibre — `GPL-3.0` · cli · $0
- EPUBCheck — `BSD-3-Clause` · cli · $0
- ★ Pandoc — `GPL-2.0` · priority now · cli · $0
- Zettlr — `GPL-3.0` · desktop-app · $0
- Joplin — `MIT` · desktop-app · $0
- Logseq — `AGPL-3.0` · desktop-app · $0
- TriliumNext — `AGPL-3.0` · web-app · $0
- Zotero — `GPL-3.0` · desktop-app · $0
- JabRef — `Apache-2.0` · desktop-app · $0
- ComicTagger — `MIT` · cli · $0
- OpenComic — `GPL-3.0` · desktop-app · $0

#### `subtitle` — 14 rows · **KEEP**

- ▲ ★ † Whisper — `MIT` · priority now · python-api · $0
- ★ whisper.cpp — `MIT` · priority now · cli · $0
- WhisperX — `BSD-3-Clause` · python-api · $0
- Vosk — `Apache-2.0` · python-api · $0
- Kaldi — `Apache-2.0` · cli · $0
- Coqui STT — `MPL-2.0` · python-api · $0
- ESPnet — `Apache-2.0` · python-api · $0
- NeMo — `Apache-2.0` · python-api · $0
- SpeechBrain — `Apache-2.0` · python-api · $0
- ▲ ★ Subtitle Edit — `GPL-3.0` · priority now · desktop-app · $0
- Aegisub — `BSD-3-Clause` · desktop-app · $0
- ▲ WebVTT tooling — `W3C` · cli · $0
- ▲ ★ ffmpeg subtitles filter — `GPL-3.0` · priority now · cli · $0
- Amara — `AGPL-3.0` · web-app · $0

#### `photography` — 12 rows · **FREEZE (§4a)**

- ★ darktable — `GPL-3.0` · priority now · cli · $0
- ★ RawTherapee — `GPL-3.0` · priority now · cli · $0
- ART — `GPL-3.0` · desktop-app · $0
- digiKam — `GPL-2.0` · desktop-app · $0
- Shotwell — `GPL-2.0` · desktop-app · $0
- Immich — `AGPL-3.0` · web-app · $0
- PhotoPrism — `MIT` · web-app · $0
- Piwigo — `GPL-2.0` · web-app · $0
- Lychee — `MIT` · web-app · $0
- Hugin — `GPL-2.0` · cli · $0
- Enblend — `GPL-2.0` · cli · $0
- Enfuse — `GPL-2.0` · cli · $0


### Kingdom `intelligence` — 183 rows

#### `research-compute` — 34 rows · **FREEZE (§4a)**

- Jupyter — `BSD-3-Clause` · web-app · $0
- JupyterLab — `BSD-3-Clause` · web-app · $0
- JupyterHub — `BSD-3-Clause` · web-app · $0
- R — `GPL-2.0+` · cli · $0
- Python — `PSF-2.0` · cli · $0
- GNU Octave — `GPL-3.0` · cli · $0
- Scilab — `GPL-3.0 / CeCILL` · cli · $0
- SageMath — `GPL-2.0+` · cli · $0
- SymPy — `BSD-3-Clause` · python-api · $0
- Maxima — `GPL-2.0+` · cli · $0
- GeoGebra — `unverified` *(no family on file)* · web-app · $0
- ParaView — `BSD-3-Clause` · desktop-app · $0
- VTK — `BSD-3-Clause` · library · $0
- OpenFOAM — `GPL-3.0` · cli · $0
- OpenModelica — `GPL-3.0` · cli · $0
- QGIS — `GPL-2.0+` · desktop-app · $0
- GRASS GIS — `GPL-2.0+` · cli · $0
- GDAL — `MIT` · cli · $0
- PostGIS — `GPL-2.0+` · library · $0
- DuckDB — `MIT` · python-api · $0
- Apache Spark — `Apache-2.0` · cli · $0
- Apache Flink — `Apache-2.0` · cli · $0
- Apache Beam — `Apache-2.0` · python-api · $0
- Polars — `MIT` · python-api · $0
- Pandas — `BSD-3-Clause` · python-api · $0
- NumPy — `BSD-3-Clause` · python-api · $0
- SciPy — `BSD-3-Clause` · python-api · $0
- scikit-learn — `BSD-3-Clause` · python-api · $0
- XGBoost — `Apache-2.0` · python-api · $0
- LightGBM — `MIT` · python-api · $0
- CatBoost — `Apache-2.0` · python-api · $0
- Statsmodels — `BSD-3-Clause` · python-api · $0
- NetworkX — `BSD-3-Clause` · python-api · $0
- igraph — `GPL-2.0+` · python-api · $0

#### `ai-training` — 29 rows · **KEEP**

- PyTorch — `BSD-3-Clause` · python-api · $0
- JAX — `Apache-2.0` · python-api · $0
- TensorFlow — `Apache-2.0` · python-api · $0
- Keras — `Apache-2.0` · python-api · $0
- HF Transformers — `Apache-2.0` · python-api · $0
- ★ HF Diffusers — `Apache-2.0` · priority now · python-api · $0
- HF Datasets — `Apache-2.0` · python-api · $0
- HF Accelerate — `Apache-2.0` · python-api · $0
- PEFT — `Apache-2.0` · python-api · $0
- TRL — `Apache-2.0` · python-api · $0
- Axolotl — `Apache-2.0` · cli · $0
- torchtune — `BSD-3-Clause` · python-api · $0
- DeepSpeed — `Apache-2.0` · python-api · $0
- Megatron-LM — `Apache-2.0` · python-api · $0
- Colossal-AI — `Apache-2.0` · python-api · $0
- LitGPT — `Apache-2.0` · cli · $0
- Unsloth — `Apache-2.0` · python-api · $0
- bitsandbytes — `MIT` · python-api · $0
- llama-factory — `Apache-2.0` · web-app · $0
- PyTorch Lightning — `Apache-2.0` · python-api · $0
- Ray Train — `Apache-2.0` · python-api · $0
- Ludwig — `Apache-2.0` · python-api · $0
- MLflow — `Apache-2.0` · web-app · $0
- Kubeflow — `Apache-2.0` · web-app · $0
- Metaflow — `Apache-2.0` · python-api · $0
- ClearML — `Apache-2.0` · web-app · $0
- Aim — `Apache-2.0` · web-app · $0
- DVC — `Apache-2.0` · cli · $0
- Pachyderm — `Apache-2.0` · http-api · $0

#### `ai-retrieval-memory` — 28 rows · **FREEZE (§4a)**

- Open WebUI — `BSD-3-Clause` · web-app · $0
- LibreChat — `MIT` · web-app · $0
- LobeHub — `MIT` · web-app · $0
- AnythingLLM — `MIT` · web-app · $0
- Big-AGI — `MIT` · web-app · $0
- Chatbot UI — `MIT` · web-app · $0
- NextChat — `MIT` · web-app · $0
- Perplexica — `MIT` · web-app · $0
- PrivateGPT — `MIT` · http-api · $0
- RAGFlow — `Apache-2.0` · web-app · $0
- Quivr — `unverified` *(no family on file)* · web-app · $0
- Khoj — `AGPL-3.0` · web-app · $0
- Onyx — `MIT (core)` · web-app · $0
- txtai — `Apache-2.0` · python-api · $0
- Verba — `MIT` · web-app · $0
- GraphRAG — `MIT` · python-api · $0
- LightRAG — `MIT` · python-api · $0
- Mem0 — `Apache-2.0` · python-api · $0
- Zep — `unverified` *(no family on file)* · http-api · $0
- Letta — `Apache-2.0` · http-api · $0
- Chroma — `Apache-2.0` · python-api · $0
- Qdrant — `Apache-2.0` · http-api · $0
- Milvus — `Apache-2.0` · http-api · $0
- Weaviate — `BSD-3-Clause` · http-api · $0
- LanceDB — `Apache-2.0` · python-api · $0
- FAISS — `MIT` · python-api · $0
- ★ pgvector — `PostgreSQL` · priority now · library · $0
- Vespa — `Apache-2.0` · http-api · $0

#### `ai-agents` — 23 rows · **KEEP**

- LangChain — `MIT` · python-api · $0
- LangGraph — `MIT` · python-api · $0
- LlamaIndex — `MIT` · python-api · $0
- Haystack — `Apache-2.0` · python-api · $0
- PydanticAI — `MIT` · python-api · $0
- CrewAI — `MIT` · python-api · $0
- AutoGen — `MIT` · python-api · $0
- Semantic Kernel — `MIT` · python-api · $0
- Smolagents — `Apache-2.0` · python-api · $0
- OpenHands — `MIT` · cli · $0
- Dify — `Apache-2.0 (with restrictions)` · web-app · $0
- Flowise — `Apache-2.0` · web-app · $0
- Langflow — `MIT` · web-app · $0
- ★ n8n — `Sustainable Use License (fair-code)` · priority now · web-app · $0
- Activepieces — `MIT (core)` · web-app · $0
- Node-RED — `Apache-2.0` · web-app · $0
- Kestra — `Apache-2.0` · web-app · $0
- Windmill — `AGPL-3.0` · web-app · $0
- ★ Temporal — `MIT` · priority now · http-api · $0
- Prefect — `Apache-2.0` · python-api · $0
- Dagster — `Apache-2.0` · python-api · $0
- Apache Airflow — `Apache-2.0` · cli · $0
- Trigger.dev — `Apache-2.0` · web-app · $0

#### `ai-evaluation-safety` — 21 rows · **FREEZE (§4a)**

- Langfuse — `MIT (core)` · web-app · $0
- Arize Phoenix — `unverified` *(no family on file)* · web-app · $0
- OpenTelemetry — `Apache-2.0` · protocol · $0
- DeepEval — `Apache-2.0` · python-api · $0
- Ragas — `Apache-2.0` · python-api · $0
- promptfoo — `MIT` · cli · $0
- Inspect AI — `MIT` · cli · $0
- HELM — `Apache-2.0` · python-api · $0
- LM Evaluation Harness — `MIT` · cli · $0
- Guardrails AI — `Apache-2.0` · python-api · $0
- NeMo Guardrails — `Apache-2.0` · python-api · $0
- Presidio — `MIT` · python-api · $0
- LLM Guard — `Apache-2.0` · python-api · $0
- Giskard — `unverified` *(no family on file)* · python-api · $0
- Evidently — `Apache-2.0` · python-api · $0
- WhyLabs — `Apache-2.0 (SDK)` · http-api · per-job
- TruLens — `MIT` · python-api · $0
- Garak — `unverified` *(no family on file)* · cli · $0
- ART Adversarial Robustness Toolbox — `Apache-2.0` · python-api · $0
- Model Cards tooling — `Apache-2.0` · python-api · $0
- Datasheets for Datasets — `unverified` *(no family on file)* · protocol · $0

#### `knowledge-graph` — 20 rows · **FREEZE (§4a)**

- Wikidata — `CC0 (data)` · http-api · $0
- DBpedia — `CC BY-SA (data)` · http-api · $0
- Apache Jena — `Apache-2.0` · http-api · $0
- RDF4J — `EDL-1.0 (BSD-style)` · library · $0
- Oxigraph — `MIT / CeCILL-B` · http-api · $0
- RDFLib — `BSD-3-Clause` · python-api · $0
- Neo4j Community — `GPL-3.0 (Community)` · http-api · $0
- Memgraph — `BSL 1.1` · http-api · $0
- ArangoDB — `SSPL (Community)` · http-api · $0
- TerminusDB — `Apache-2.0` · http-api · $0
- TypeDB — `AGPL-3.0` · http-api · $0
- OpenAlex — `CC0 (data)` · http-api · $0
- ORCID — `unverified` *(no family on file)* · http-api · $0
- ROR — `CC0 (data)` · http-api · $0
- DataCite — `unverified` *(no family on file)* · http-api · $0
- Schema.org — `unverified` *(no family on file)* · protocol · $0
- SKOS — `unverified` *(no family on file)* · protocol · $0
- PROV-O — `unverified` *(no family on file)* · protocol · $0
- FOAF — `unverified` *(no family on file)* · protocol · $0
- ActivityStreams — `unverified` *(no family on file)* · protocol · $0

#### `ai-runtime` — 15 rows · **KEEP**

- ★ † Ollama — `MIT` · priority now · http-api · $0
- ★ llama.cpp — `MIT` · priority now · cli · $0
- vLLM — `Apache-2.0` · http-api · $0
- Hugging Face TGI — `Apache-2.0` · http-api · $0
- MLC LLM — `Apache-2.0` · cli · $0
- LocalAI — `MIT` · http-api · $0
- KoboldCpp — `GPL-3.0` · http-api · $0
- Jan — `AGPL-3.0` · desktop-app · $0
- GPT4All — `MIT` · desktop-app · $0
- MLX — `MIT` · python-api · $0
- ONNX Runtime — `MIT` · library · $0
- OpenVINO — `Apache-2.0` · library · $0
- llamafile — `Apache-2.0` · cli · $0
- SGLang — `Apache-2.0` · http-api · $0
- TensorRT-LLM — `Apache-2.0` · python-api · $0

#### `translation` — 13 rows · **KEEP**

- LibreTranslate — `AGPL-3.0` · http-api · $0
- Argos Translate — `MIT` · python-api · $0
- Bergamot — `MPL-2.0` · library · $0
- Marian NMT — `MIT` · cli · $0
- OpenNMT — `MIT` · python-api · $0
- NLLB implementations — `CC-BY-NC-4.0 (weights)` · python-api · $0
- Apertium — `GPL-3.0` · cli · $0
- OmegaT — `GPL-3.0` · desktop-app · $0
- Weblate — `GPL-3.0` · web-app · $0
- Translate Toolkit — `GPL-2.0+` · python-api · $0
- GNU gettext — `GPL-3.0` · cli · $0
- ICU — `Unicode (MIT-style)` · library · $0
- CLDR — `Unicode (MIT-style)` · protocol · $0


### Kingdom `platform-infra` — 287 rows

#### `deploy-infra` — 38 rows · **FREEZE (§4a)**

- ★ Docker — `Apache-2.0` · priority now · cli · $0
- Podman — `Apache-2.0` · cli · $0
- containerd — `Apache-2.0` · cli · $0
- Kubernetes — `Apache-2.0` · http-api · $0
- K3s — `Apache-2.0` · http-api · $0
- MicroK8s — `Apache-2.0` · http-api · $0
- Nomad — `BUSL-1.1` · http-api · $0
- OpenTofu — `MPL-2.0` · cli · $0
- Terraform — `source-available` · cli · $0
- Ansible — `GPL-3.0` · cli · $0
- Pulumi — `Apache-2.0` · cli · $0
- Salt — `Apache-2.0` · cli · $0
- Nix — `LGPL-2.1-or-later` · cli · $0
- NixOS — `LGPL-2.1-or-later` · cli · $0
- Guix — `GPL-3.0` · cli · $0
- Packer — `BUSL-1.1` · cli · $0
- Vagrant — `BUSL-1.1` · cli · $0
- Coolify — `Apache-2.0` · http-api · $0
- Dokku — `MIT` · cli · $0
- CapRover — `Apache-2.0` · http-api · $0
- Kamal — `MIT` · cli · $0
- OpenStack — `Apache-2.0` · http-api · $0
- Cloud Foundry — `Apache-2.0` · http-api · $0
- ★ Caddy — `Apache-2.0` · priority now · http-api · $0
- Traefik — `MIT` · http-api · $0
- ★ Nginx — `BSD-2-Clause` · priority now · http-api · $0
- HAProxy — `GPL-2.0-or-later` · http-api · $0
- Envoy — `Apache-2.0` · http-api · $0
- Kong Gateway — `Apache-2.0` · http-api · $0
- APISIX — `Apache-2.0` · http-api · $0
- Tyk — `MPL-2.0` · http-api · $0
- Istio — `Apache-2.0` · http-api · $0
- Linkerd — `Apache-2.0` · http-api · $0
- WireGuard — `GPL-2.0 / MIT` · protocol · $0
- Headscale — `BSD-3-Clause` · http-api · $0
- NetBird — `BSD-3-Clause` · http-api · $0
- Cloudflare Workers — `proprietary` · http-api · per-job
- Cloudflare Pages — `proprietary` · http-api · per-job

#### `cryptography-keys` — 32 rows · **FREEZE (§4a)**

- ★ OpenSSL — `Apache-2.0` · priority now · library · $0
- LibreSSL — `BSD` · library · $0
- BoringSSL — `Apache-2.0 / ISC / BSD` · library · $0
- ★ libsodium — `ISC` · priority now · library · $0
- Botan — `BSD-2-Clause` · library · $0
- wolfSSL — `GPL-2.0-or-later / commercial dual` · library · $0
- Bouncy Castle — `MIT-style` · library · $0
- age — `MIT` · cli · $0
- minisign — `unverified` *(no family on file)* · cli · $0
- signify — `unverified` *(no family on file)* · cli · $0
- GnuPG — `GPL-3.0-or-later` · cli · $0
- OpenPGP — `RFC 9580 standard` · protocol · $0
- Sequoia PGP — `GPL-3.0-or-later` · cli · $0
- OpenSSH — `BSD` · cli · $0
- HashiCorp Vault — `source-available` · http-api · $0
- OpenBao — `MPL-2.0` · http-api · $0
- Infisical — `MIT` · http-api · $0
- SOPS — `MPL-2.0` · cli · $0
- KeePassXC — `GPL-3.0-or-later` · desktop-app · $0
- Vaultwarden — `GPL-3.0-or-later / AGPL-3.0` · http-api · $0
- pass — `GPL-2.0-or-later` · cli · $0
- gopass — `MIT` · cli · $0
- Aegis Authenticator — `GPL-3.0` · desktop-app · $0
- privacyIDEA — `AGPL-3.0` · http-api · $0
- Circom — `GPL-3.0` · cli · $0
- snarkjs — `GPL-3.0` · cli · $0
- Halo2 — `MIT / Apache-2.0` · library · $0
- arkworks — `MIT / Apache-2.0` · library · $0
- Plonky3 — `MIT / Apache-2.0` · library · $0
- Noir — `MIT / Apache-2.0` · cli · $0
- RISC Zero — `Apache-2.0` · library · $0
- SP1 — `Apache-2.0` · cli · $0

#### `ci-cd-codehosting` — 31 rows · **FREEZE (§4a)**

- ★ Git — `GPL-2.0` · priority now · cli · $0
- ★ GitHub — `proprietary` · priority now · http-api · subscription
- Forgejo — `GPL-3.0` · http-api · $0
- Gitea — `MIT` · http-api · $0
- GitLab Community Edition — `MIT (Community Edition)` · http-api · $0
- Codeberg — `proprietary (non-profit community service)` · http-api · $0
- SourceHut — `AGPL-3.0` · http-api · $0
- Gerrit — `Apache-2.0` · http-api · $0
- Jenkins — `MIT` · http-api · $0
- Woodpecker CI — `Apache-2.0` · http-api · $0
- Forgejo Actions — `GPL-3.0` · http-api · $0
- Buildbot — `GPL-2.0-or-later` · http-api · $0
- Buildkite agent — `MIT (agent) / hosted service` · cli · $0
- Drone CI — `Apache-2.0` · http-api · $0
- Tekton — `Apache-2.0` · http-api · $0
- Argo CD — `Apache-2.0` · http-api · $0
- Flux CD — `Apache-2.0` · http-api · $0
- Dagger — `Apache-2.0` · cli · $0
- Earthly — `MPL-2.0` · cli · $0
- Buildah — `Apache-2.0` · cli · $0
- Kaniko — `Apache-2.0` · cli · $0
- Renovate — `AGPL-3.0` · http-api · $0
- Trivy — `Apache-2.0` · cli · $0
- Grype — `Apache-2.0` · cli · $0
- Syft — `Apache-2.0` · cli · $0
- Cosign — `Apache-2.0` · cli · $0
- SLSA tooling — `Apache-2.0` · cli · $0
- OpenSSF Scorecard — `Apache-2.0` · cli · $0
- Gitleaks — `MIT` · cli · $0
- Semgrep Community Edition — `LGPL-2.1-or-later` · cli · $0
- SonarQube Community Build — `LGPL-3.0 (Community Build)` · http-api · $0

#### `digital-forensics` — 28 rows · **FREEZE (§4a)**

- Autopsy — `GPL-2.0 (modules vary)` · desktop-app · $0
- Sleuth Kit — `CPL-1.0 / GPL / IBM` · cli · $0
- Volatility — `Volatility Software License` · cli · $0
- Plaso — `Apache-2.0` · cli · $0
- Timesketch — `Apache-2.0` · http-api · $0
- YARA — `BSD-3-Clause` · cli · $0
- Zeek — `BSD-3-Clause` · cli · $0
- Suricata — `GPL-2.0-or-later` · cli · $0
- Wireshark — `GPL-2.0-or-later` · desktop-app · $0
- Arkime — `Apache-2.0` · http-api · $0
- Velociraptor — `AGPL-3.0` · http-api · $0
- osquery — `MIT / Apache-2.0 (dual)` · cli · $0
- GRR — `Apache-2.0` · http-api · $0
- MISP — `AGPL-3.0 (some GPL)` · http-api · $0
- TheHive — `AGPL-3.0` · http-api · $0
- Cortex — `AGPL-3.0` · http-api · $0
- DFIR-IRIS — `LGPL-3.0` · http-api · $0
- Chainsaw — `GPL-3.0` · cli · $0
- Hayabusa — `GPL-3.0` · cli · $0
- ClamAV — `GPL-2.0-or-later` · http-api · $0
- Ghidra — `Apache-2.0` · desktop-app · $0
- radare2 — `GPL-3.0` · cli · $0
- Cutter — `GPL-3.0` · desktop-app · $0
- Frida — `wxWindows Library Licence / LGPL-2.1` · cli · $0
- JADX — `Apache-2.0 / GPL dual` · desktop-app · $0
- MobSF — `AGPL-3.0` · http-api · $0
- OWASP ZAP — `Apache-2.0` · desktop-app · $0
- OWASP Dependency-Check — `Apache-2.0` · cli · $0

#### `observability` — 25 rows · **FREEZE (§4a)**

- ★ Prometheus — `Apache-2.0` · priority now · http-api · $0
- ★ Grafana — `AGPL-3.0` · priority now · http-api · $0
- Loki — `AGPL-3.0` · http-api · $0
- Tempo — `AGPL-3.0` · http-api · $0
- Mimir — `AGPL-3.0` · http-api · $0
- VictoriaMetrics — `Apache-2.0` · http-api · $0
- Jaeger — `Apache-2.0` · http-api · $0
- Zipkin — `Apache-2.0` · http-api · $0
- Fluent Bit — `Apache-2.0` · cli · $0
- Fluentd — `Apache-2.0` · cli · $0
- Vector — `MIT / Apache-2.0` · cli · $0
- Graylog — `SSPL-1.0 (Open Search License)` · http-api · $0
- Wazuh — `GPL-2.0-or-later` · http-api · $0
- Zabbix — `GPL-2.0-or-later` · http-api · $0
- Netdata — `GPL-3.0 (community core)` · http-api · $0
- Checkmk — `GPL-2.0 (Raw Edition)` · http-api · $0
- Icinga — `GPL-2.0-or-later` · http-api · $0
- Nagios — `GPL-2.0 (Core)` · http-api · $0
- ★ Uptime Kuma — `MIT` · priority now · http-api · $0
- Gatus — `Apache-2.0` · http-api · $0
- GlitchTip — `MIT` · http-api · $0
- Sentry self-hosted — `FSL-1.1-MIT` · http-api · $0
- SigNoz — `Apache-2.0` · http-api · $0
- HyperDX — `MIT` · http-api · $0
- OpenObserve — `AGPL-3.0` · http-api · $0

#### `storage-sync` — 25 rows · **KEEP**

- MinIO — `AGPL-3.0` · http-api · $0
- SeaweedFS — `Apache-2.0` · http-api · $0
- Garage — `AGPL-3.0` · http-api · $0
- Ceph — `LGPL-2.1-or-later` · http-api · $0
- OpenStack Swift — `Apache-2.0` · http-api · $0
- Nextcloud — `AGPL-3.0` · http-api · $0
- ownCloud — `GPL-2.0-or-later / AGPL-3.0 (phased)` · http-api · $0
- Seafile — `AGPL-3.0 (Community Edition)` · http-api · $0
- Syncthing — `MPL-2.0` · http-api · $0
- FileBrowser — `MIT` · http-api · $0
- SFTPGo — `AGPL-3.0` · http-api · $0
- Pydio Cells — `AGPL-3.0` · http-api · $0
- Rclone — `MIT` · cli · $0
- Restic — `BSD-2-Clause` · cli · $0
- BorgBackup — `BSD-3-Clause` · cli · $0
- Kopia — `Apache-2.0` · http-api · $0
- Duplicati — `LGPL-2.1-or-later` · http-api · $0
- Rustic — `Apache-2.0 / MIT` · cli · $0
- ZFS — `CDDL-1.0` · cli · $0
- OpenZFS — `CDDL-1.0 / MIT` · cli · $0
- Btrfs — `GPL-2.0-or-later` · cli · $0
- TrueNAS SCALE — `BSD-3-Clause / GPL (mixed)` · http-api · $0
- OpenMediaVault — `GPL-3.0` · http-api · $0
- Apache Ozone — `Apache-2.0` · http-api · $0
- Cloudflare R2 — `proprietary` · http-api · per-job

#### `identity-auth` — 24 rows · **FREEZE (§4a)**

- Keycloak — `Apache-2.0` · http-api · $0
- Authentik — `MIT` · http-api · $0
- Zitadel — `Apache-2.0` · http-api · $0
- Ory — `Apache-2.0` · http-api · $0
- Authelia — `Apache-2.0` · http-api · $0
- Kanidm — `unverified` *(no family on file)* · http-api · $0
- LemonLDAP::NG — `unverified` *(no family on file)* · http-api · $0
- Dex — `Apache-2.0` · http-api · $0
- Casdoor — `Apache-2.0` · http-api · $0
- SuperTokens — `Apache-2.0` · http-api · $0
- Logto — `MIT` · http-api · $0
- OpenFGA — `Apache-2.0` · http-api · $0
- SpiceDB — `Apache-2.0` · http-api · $0
- Cerbos — `unverified` *(no family on file)* · http-api · $0
- OPA Open Policy Agent — `Apache-2.0` · http-api · $0
- Cedar — `Apache-2.0` · library · $0
- Casbin — `Apache-2.0` · library · $0
- Auth.js — `ISC` · library · $0
- WebAuthn — `W3C standards` · protocol · $0
- FIDO2 — `FIDO Alliance standards` · protocol · $0
- OAuth 2.0 — `IETF standards` · protocol · $0
- OpenID Connect — `IETF standards` · protocol · $0
- SAML — `OASIS standards` · protocol · $0
- SCIM — `IETF standards` · protocol · $0

#### `rights-licensing` — 24 rows · **KEEP**

- ★ SPDX — `Apache-2.0` · priority now · protocol · $0
- REUSE — `GPL-3.0-or-later` · cli · $0
- ★ ScanCode Toolkit — `Apache-2.0` · priority now · cli · $0
- FOSSology — `GPL-2.0` · http-api · $0
- ORT OSS Review Toolkit — `Apache-2.0` · cli · $0
- ClearlyDefined — `MIT` · http-api · $0
- Licensee — `MIT` · cli · $0
- CycloneDX — `Apache-2.0` · protocol · $0
- OpenChain ISO/IEC 5230 — `ISO/IEC 5230 standard` · protocol · $0
- Creative Commons tools — `MIT (tools; licences are CC)` · http-api · $0
- CC REL — `Creative Commons standards` · protocol · $0
- IPTC Photo Metadata — `IPTC standards` · protocol · $0
- PLUS Coalition — `unverified` *(no family on file)* · protocol · $0
- Dublin Core — `unverified` *(no family on file)* · protocol · $0
- RightsStatements.org — `unverified` *(no family on file)* · protocol · $0
- ODRL — `unverified` *(no family on file)* · protocol · $0
- W3C Permissions and Obligations Expression — `unverified` *(no family on file)* · protocol · $0
- Data Privacy Vocabulary — `unverified` *(no family on file)* · protocol · $0
- MusicBrainz metadata — `CC BY-NC-SA 2.0 (data)` · http-api · $0
- DDEX — `unverified` *(no family on file)* · protocol · $0
- ISRC — `unverified` *(no family on file)* · protocol · $0
- ISWC — `unverified` *(no family on file)* · protocol · $0
- ISBN — `unverified` *(no family on file)* · protocol · $0
- DOI — `unverified` *(no family on file)* · protocol · $0

#### `database` — 20 rows · **KEEP**

- ★ PostgreSQL — `PostgreSQL License` · priority now · http-api · $0
- ★ SQLite — `public domain` · priority now · library · $0
- MariaDB — `GPL-2.0-or-later` · http-api · $0
- MySQL — `GPL-2.0-or-later` · http-api · $0
- CockroachDB — `unverified` *(no family on file)* · http-api · $0
- ClickHouse — `Apache-2.0` · http-api · $0
- Apache Cassandra — `Apache-2.0` · http-api · $0
- ScyllaDB — `unverified` *(no family on file)* · http-api · $0
- FoundationDB — `Apache-2.0` · http-api · $0
- Redis — `source-available` · http-api · $0
- Valkey — `BSD-3-Clause` · http-api · $0
- KeyDB — `BSD-3-Clause` · http-api · $0
- Dragonfly — `Apache-2.0` · http-api · $0
- MongoDB Community — `source-available` · http-api · $0
- CouchDB — `Apache-2.0` · http-api · $0
- SurrealDB — `unverified` *(no family on file)* · http-api · $0
- QuestDB — `Apache-2.0` · http-api · $0
- TimescaleDB — `Apache-2.0` · http-api · $0
- InfluxDB — `unverified` *(no family on file)* · http-api · $0
- Cloudflare D1 — `proprietary` · http-api · per-job

#### `provenance-standard` — 20 rows · **KEEP**

- ▲ ★ C2PA — `C2PA standards` · priority now · protocol · $0
- Content Authenticity Initiative SDK — `MIT` · library · $0
- c2pa-rs — `MIT / Apache-2.0` · library · $0
- c2pa-python — `MIT / Apache-2.0` · python-api · $0
- c2pa-js — `MIT / Apache-2.0` · library · $0
- ▲ ★ OpenTimestamps — `MIT` · priority now · cli · $0
- ▲ ★ Sigstore — `Apache-2.0` · priority now · protocol · $0
- in-toto — `Apache-2.0` · protocol · $0
- The Update Framework — `MIT` · cli · $0
- Rekor — `Apache-2.0` · http-api · $0
- Certificate Transparency — `Apache-2.0 (tooling) / standard` · protocol · $0
- transparency-dev Merkle tooling — `Apache-2.0` · library · $0
- IPFS — `MIT / Apache-2.0` · protocol · $0
- IPLD — `MIT / Apache-2.0` · library · $0
- DID Core — `W3C standards` · protocol · $0
- Verifiable Credentials — `W3C standards` · protocol · $0
- DIDComm — `DIF standards` · protocol · $0
- BBS signatures anoncreds — `unverified` *(no family on file)* · library · $0
- OpenID4VC — `OpenID standards` · protocol · $0
- Bitcoin anchoring — `MIT` · protocol · $0

#### `search-index` — 20 rows · **FREEZE (§4a)**

- Meilisearch — `MIT` · http-api · $0
- Typesense — `Apache-2.0` · http-api · $0
- OpenSearch — `Apache-2.0` · http-api · $0
- Elasticsearch — `AGPL-3.0` · http-api · $0
- Apache Solr — `Apache-2.0` · http-api · $0
- Sonic — `MIT` · http-api · $0
- ZincSearch — `MIT` · http-api · $0
- Manticore Search — `Apache-2.0` · http-api · $0
- Tantivy — `MIT` · library · $0
- PostgreSQL full-text search — `PostgreSQL License` · http-api · $0
- SQLite FTS5 — `public domain` · library · $0
- SearXNG — `AGPL-3.0` · http-api · $0
- YaCy — `GPL-2.0-or-later` · http-api · $0
- Apache Tika — `Apache-2.0` · http-api · $0
- Tesseract OCR — `Apache-2.0` · cli · $0
- PaddleOCR — `Apache-2.0` · python-api · $0
- Docling — `MIT` · python-api · $0
- Unstructured — `Apache-2.0` · python-api · $0
- Apache PDFBox — `Apache-2.0` · library · $0
- OCRmyPDF — `MPL-2.0` · cli · $0


### Kingdom `economy-reach` — 318 rows

#### `hardware-fabrication` — 31 rows · **FREEZE (§4a)**

- KiCad — `GPL-3.0` · desktop-app · $0
- LibrePCB — `GPL-3.0` · desktop-app · $0
- Horizon EDA — `GPL-3.0` · desktop-app · $0
- Fritzing — `GPL-3.0` · desktop-app · $0
- OpenROAD — `Apache-2.0` · cli · $0
- Magic VLSI — `MIT-like per-file` · cli · $0
- KLayout — `GPL-3.0` · desktop-app · $0
- ngspice — `BSD-style` · cli · $0
- Qucs-S — `GPL-3.0` · desktop-app · $0
- GNU Radio — `GPL-3.0` · cli · $0
- Arduino — `unverified` *(no family on file)* · desktop-app · $0
- PlatformIO — `Apache-2.0` · cli · $0
- ESPHome — `GPL-3.0` · cli · $0
- Zephyr RTOS — `Apache-2.0` · cli · $0
- FreeRTOS — `MIT` · library · $0
- RIOT OS — `LGPL-2.1` · cli · $0
- OpenWrt — `unverified` *(no family on file)* · cli · $0
- PrusaSlicer — `AGPL-3.0` · desktop-app · $0
- OrcaSlicer — `AGPL-3.0` · desktop-app · $0
- Cura — `LGPL-3.0` · desktop-app · $0
- SuperSlicer — `unverified` *(no family on file)* · desktop-app · $0
- Slic3r — `unverified` *(no family on file)* · cli · $0
- Klipper — `GPL-3.0` · cli · $0
- Moonraker — `GPL-3.0` · http-api · $0
- OctoPrint — `AGPL-3.0` · web-app · $0
- Mainsail — `unverified` *(no family on file)* · web-app · $0
- Fluidd — `unverified` *(no family on file)* · web-app · $0
- CNCjs — `MIT` · web-app · $0
- LinuxCNC — `GPL-2.0` · cli · $0
- Kiri:Moto — `unverified` *(no family on file)* · web-app · $0
- OpenBuilds CONTROL — `unverified` *(no family on file)* · desktop-app · $0

#### `federated-social` — 30 rows · **FREEZE (§4a)**

- ★ ActivityPub — `W3C` · priority now · protocol · $0
- Mastodon — `AGPL-3.0` · http-api · $0
- Pixelfed — `AGPL-3.0` · http-api · $0
- Lemmy — `AGPL-3.0` · http-api · $0
- Misskey — `AGPL-3.0` · http-api · $0
- GoToSocial — `AGPL-3.0` · protocol · $0
- Friendica — `AGPL-3.0` · web-app · $0
- Hubzilla — `MIT` · web-app · $0
- BookWyrm — `AGPL-3.0` · web-app · $0
- Mobilizon — `AGPL-3.0` · http-api · $0
- Pleroma — `unverified` *(no family on file)* · protocol · $0
- Akkoma — `unverified` *(no family on file)* · protocol · $0
- Diaspora — `AGPL-3.0` · web-app · $0
- GNU social — `unverified` *(no family on file)* · web-app · $0
- Matrix — `Apache-2.0` · protocol · $0
- Synapse — `AGPL-3.0` · http-api · $0
- Dendrite — `Apache-2.0` · http-api · $0
- Conduit — `unverified` *(no family on file)* · http-api · $0
- Element — `Apache-2.0` · web-app · $0
- Mattermost — `unverified` *(no family on file)* · http-api · $0
- Rocket.Chat — `MIT` · http-api · $0
- Zulip — `Apache-2.0` · http-api · $0
- XMPP Prosody — `MIT` · protocol · $0
- ejabberd — `unverified` *(no family on file)* · protocol · $0
- Snikket — `unverified` *(no family on file)* · protocol · $0
- Nostr — `unverified` *(no family on file)* · protocol · $0
- AT Protocol — `MIT` · protocol · $0
- Discourse — `GPL-2.0` · web-app · $0
- Flarum — `MIT` · web-app · $0
- NodeBB — `GPL-3.0` · web-app · $0

#### `publishing-cms` — 30 rows · **FREEZE (§4a)**

- ★ WordPress — `GPL-2.0` · priority now · web-app · $0
- ★ Ghost — `MIT` · priority now · http-api · $0
- Drupal — `GPL-2.0` · web-app · $0
- Joomla — `GPL-2.0` · web-app · $0
- Grav — `MIT` · web-app · $0
- Hugo — `Apache-2.0` · cli · $0
- Jekyll — `MIT` · cli · $0
- Eleventy — `MIT` · cli · $0
- Astro — `MIT` · library · $0
- Zola — `MIT` · cli · $0
- Publii — `GPL-3.0` · desktop-app · $0
- WriteFreely — `AGPL-3.0` · web-app · $0
- Plume — `unverified` *(no family on file)* · web-app · $0
- ClassicPress — `GPL-2.0` · web-app · $0
- Strapi — `unverified` *(no family on file)* · http-api · $0
- Directus — `unverified` *(no family on file)* · http-api · $0
- Payload CMS — `MIT` · library · $0
- KeystoneJS — `MIT` · library · $0
- TinaCMS — `Apache-2.0` · library · $0
- Decap CMS — `MIT` · library · $0
- Quartz — `MIT` · cli · $0
- MkDocs — `BSD-2-Clause` · cli · $0
- Docusaurus — `MIT` · cli · $0
- VitePress — `MIT` · cli · $0
- Sphinx — `BSD-3-Clause` · cli · $0
- BookStack — `MIT` · web-app · $0
- Wiki.js — `AGPL-3.0` · web-app · $0
- MediaWiki — `GPL-2.0` · http-api · $0
- Docmost — `AGPL-3.0` · web-app · $0
- DokuWiki — `GPL-2.0` · web-app · $0

#### `asset-library-image` — 24 rows · **KEEP**

- ★ Wikimedia Commons — `mixed-per-asset` · priority now · http-api · $0
- ★ Openverse — `mixed-per-asset` · priority now · http-api · $0
- Unsplash — `proprietary-service` · http-api · $0
- Pexels — `proprietary-service` · http-api · $0
- Pixabay — `proprietary-service` · http-api · $0
- Flickr Commons — `public-domain` · web-app · $0
- Europeana — `mixed-per-asset` · http-api · $0
- The Met Open Access — `CC0` · http-api · $0
- Library of Congress Digital Collections — `mixed-per-asset` · http-api · $0
- Internet Archive — `mixed-per-asset` · http-api · $0
- Rijksmuseum — `CC0` · http-api · $0
- Art Institute of Chicago Open Access — `CC0` · http-api · $0
- Cleveland Museum of Art Open Access — `CC0` · http-api · $0
- OpenClipart — `public-domain` · web-app · $0
- Public Domain Vectors — `public-domain` · web-app · $0
- SVG Repo — `mixed-per-asset` · web-app · $0
- OpenMoji — `CC BY-SA 4.0` · library · $0
- Twemoji — `CC BY 4.0` · library · $0
- Noto Emoji — `unverified` *(no family on file)* · library · $0
- Heroicons — `MIT` · library · $0
- Tabler Icons — `MIT` · library · $0
- Lucide — `ISC` · library · $0
- Phosphor Icons — `MIT` · library · $0
- Material Symbols — `Apache-2.0` · library · $0

#### `crm-operations` — 24 rows · **FREEZE (§4a)**

- ERPNext — `GPL-3.0` · http-api · $0
- Odoo Community — `LGPL-3.0` · web-app · $0
- Dolibarr — `GPL-3.0` · web-app · $0
- Tryton — `GPL-3.0` · http-api · $0
- Twenty CRM — `unverified` *(no family on file)* · http-api · $0
- EspoCRM — `GPL-3.0` · web-app · $0
- SuiteCRM — `AGPL-3.0` · web-app · $0
- Corteza — `Apache-2.0` · http-api · $0
- Monica CRM — `AGPL-3.0` · web-app · $0
- Frappe CRM — `MIT` · web-app · $0
- OroCRM — `unverified` *(no family on file)* · web-app · $0
- CiviCRM — `AGPL-3.0` · web-app · $0
- Mautic — `unverified` *(no family on file)* · http-api · $0
- Listmonk — `AGPL-3.0` · http-api · $0
- Postal — `MIT` · http-api · $0
- Zammad — `AGPL-3.0` · http-api · $0
- FreeScout — `AGPL-3.0` · web-app · $0
- osTicket — `unverified` *(no family on file)* · web-app · $0
- GLPI — `GPL-2.0` · web-app · $0
- UVdesk — `MIT` · web-app · $0
- Chatwoot — `MIT` · http-api · $0
- Papercups — `MIT` · web-app · $0
- Keila — `unverified` *(no family on file)* · web-app · $0
- Mailtrain — `unverified` *(no family on file)* · web-app · $0

#### `video-hosting` — 23 rows · **KEEP**

- ▲ ★ PeerTube — `AGPL-3.0` · priority now · http-api · $0
- ★ Owncast — `MIT` · priority now · http-api · $0
- MediaMTX — `MIT` · protocol · $0
- OvenMediaEngine — `AGPL-3.0` · protocol · $0
- MistServer — `unverified` *(no family on file)* · protocol · $0
- SRS — `MIT` · protocol · $0
- Janus WebRTC — `GPL-3.0` · protocol · $0
- Jitsi — `Apache-2.0` · web-app · $0
- LiveKit — `Apache-2.0` · http-api · $0
- mediasoup — `ISC` · library · $0
- Pion WebRTC — `MIT` · library · $0
- nginx-rtmp-module — `unverified` *(no family on file)* · plugin-or-cli · $0
- Jellyfin — `GPL-2.0` · http-api · $0
- Kodi — `GPL-2.0` · desktop-app · $0
- Navidrome — `GPL-3.0` · http-api · $0
- Ampache — `AGPL-3.0` · web-app · $0
- Funkwhale — `AGPL-3.0` · http-api · $0
- AzuraCast — `EPL-2.0` · web-app · $0
- Castopod — `AGPL-3.0` · http-api · $0
- Icecast — `GPL-2.0` · protocol · $0
- Liquidsoap — `unverified` *(no family on file)* · cli · $0
- OBS Studio — `GPL-2.0` · desktop-app · $0
- ▲ † YouTube Data API — `proprietary-service` · http-api · $0

#### `asset-library-text` — 20 rows · **FREEZE (§4a)**

- Project Gutenberg — `public-domain` · web-app · $0
- Standard Ebooks — `public-domain` · http-api · $0
- Wikisource — `mixed-per-asset` · http-api · $0
- Open Library — `mixed-per-asset` · http-api · $0
- DOAB — `mixed-per-asset` · http-api · $0
- DOAJ — `CC0` · http-api · $0
- OpenStax — `CC-BY` · http-api · $0
- MIT OpenCourseWare — `CC BY-NC-SA` · http-api · $0
- OpenLearn — `CC BY-NC-SA` · web-app · $0
- CORE — `mixed-per-asset` · http-api · $0
- arXiv — `mixed-per-asset` · http-api · $0
- Zenodo — `mixed-per-asset` · http-api · $0
- Figshare — `mixed-per-asset` · http-api · subscription
- Dryad — `CC0` · http-api · $0
- Crossref — `CC0` · http-api · $0
- Semantic Scholar — `mixed-per-asset` · http-api · $0
- Europe PMC — `mixed-per-asset` · http-api · $0
- PubMed Central — `mixed-per-asset` · http-api · $0
- OpenAIRE — `mixed-per-asset` · http-api · $0
- OER Commons — `mixed-per-asset` · web-app · $0

#### `payments-billing` — 19 rows · **FREEZE (§4a)**

- Kill Bill — `Apache-2.0` · http-api · $0
- Lago — `AGPL-3.0` · http-api · $0
- Hyperswitch — `Apache-2.0` · http-api · $0
- BTCPay Server — `MIT` · http-api · $0
- GNU Taler — `AGPL-3.0` · http-api · $0
- ★ Invoice Ninja — `BSL-1.1` · priority now · http-api · $0
- Akaunting — `GPL-3.0` · web-app · $0
- Crater — `GPL-3.0` · web-app · $0
- SolidInvoice — `MIT` · web-app · $0
- Open Payments — `unverified` *(no family on file)* · http-api · $0
- PayPal integration — `proprietary-service` · http-api · per-job
- ★ Stripe integration — `proprietary-service` · priority now · http-api · per-job
- Adyen integration — `proprietary-service` · http-api · per-job
- Mollie integration — `proprietary-service` · http-api · per-job
- Razorpay integration — `proprietary-service` · http-api · per-job
- GoCardless integration — `proprietary-service` · http-api · per-job
- Apache Fineract — `Apache-2.0` · http-api · $0
- Mifos — `unverified` *(no family on file)* · http-api · $0
- Open Collective — `MIT` · web-app · $0

#### `geospatial` — 18 rows · **FREEZE (§4a)**

- OpenStreetMap — `ODbL` · http-api · $0
- MapLibre — `BSD-3-Clause` · library · $0
- Protomaps — `unverified` *(no family on file)* · library · $0
- TileServer GL — `BSD-2-Clause` · http-api · $0
- Martin — `unverified` *(no family on file)* · http-api · $0
- Tegola — `unverified` *(no family on file)* · http-api · $0
- Valhalla — `unverified` *(no family on file)* · http-api · $0
- OSRM — `BSD-2-Clause` · http-api · $0
- GraphHopper — `unverified` *(no family on file)* · http-api · $0
- pgRouting — `GPL-2.0` · library · $0
- GeoServer — `GPL-2.0` · http-api · $0
- MapServer — `MIT` · http-api · $0
- GeoNode — `unverified` *(no family on file)* · web-app · $0
- OpenLayers — `BSD-2-Clause` · library · $0
- Leaflet — `BSD-2-Clause` · library · $0
- CesiumJS — `Apache-2.0` · library · $0
- deck.gl — `MIT` · library · $0
- Kepler.gl — `unverified` *(no family on file)* · library · $0

#### `commerce-marketplace` — 17 rows · **FREEZE (§4a)**

- Medusa — `MIT` · http-api · $0
- Saleor — `BSD-3-Clause` · http-api · $0
- Vendure — `unverified` *(no family on file)* · http-api · $0
- WooCommerce — `GPL-2.0` · web-app · $0
- Sylius — `MIT` · http-api · $0
- Spree Commerce — `BSD-3-Clause` · http-api · $0
- Solidus — `BSD-3-Clause` · http-api · $0
- Bagisto — `MIT` · web-app · $0
- PrestaShop — `OSL-3.0` · web-app · $0
- OpenCart — `GPL-3.0` · web-app · $0
- Magento Open Source — `unverified` *(no family on file)* · web-app · $0
- Drupal Commerce — `GPL-2.0` · web-app · $0
- Shopware Community Edition — `MIT` · http-api · $0
- Sharetribe — `MIT` · web-app · $0
- Mercur — `MIT` · http-api · $0
- Open Source POS — `Apache-2.0` · web-app · $0
- NexoPOS — `GPL-3.0` · web-app · $0

#### `contracts-documents` — 17 rows · **FREEZE (§4a)**

- ★ Documenso — `AGPL-3.0` · priority now · web-app · $0
- OpenSign — `unverified` *(no family on file)* · web-app · $0
- LibreSign — `unverified` *(no family on file)* · web-app · $0
- Docassemble — `MIT` · http-api · $0
- ★ Stirling-PDF — `Apache-2.0` · priority now · http-api · $0
- Paperless-ngx — `MIT` · web-app · $0
- Mayan EDMS — `GPL-3.0` · http-api · $0
- Teedy — `unverified` *(no family on file)* · web-app · $0
- LogicalDOC Community — `GPL-3.0` · web-app · $0
- OpenKM Community — `GPL-2.0` · web-app · $0
- Alfresco Community — `LGPL-3.0` · http-api · $0
- Nextcloud Office — `AGPL-3.0` · web-app · $0
- Collabora Online — `MPL-2.0` · web-app · $0
- ONLYOFFICE Docs — `AGPL-3.0` · http-api · $0
- LibreOffice — `MPL-2.0` · desktop-app · $0
- Gotenberg — `MIT` · http-api · $0
- WeasyPrint — `BSD-3-Clause` · python-api · $0

#### `asset-library-audio` — 16 rows · **KEEP**

- Freesound — `mixed-per-asset` · http-api · $0
- Wikimedia Commons audio — `mixed-per-asset` · http-api · $0
- Internet Archive audio — `mixed-per-asset` · http-api · $0
- Musopen — `mixed-per-asset` · http-api · $0
- Open Music Archive — `mixed-per-asset` · web-app · $0
- Free Music Archive — `mixed-per-asset` · web-app · $0
- Incompetech — `CC-BY` · web-app · $0
- BBC Sound Effects — `non-commercial per-asset` · web-app · $0
- Sonniss GDC bundles — `CC0` · web-app · $0
- NASA sound libraries — `public-domain` · web-app · $0
- Zapsplat — `proprietary-service` · web-app · subscription
- SampleScience — `proprietary-service` · web-app · $0
- OpenGameArt audio — `mixed-per-asset` · web-app · $0
- Jamendo — `mixed-per-asset` · http-api · $0
- MusicBrainz — `mixed-per-asset` · http-api · $0
- Internet Archive Live Music Archive — `mixed-per-asset` · http-api · $0

#### `accessibility` — 14 rows · **FREEZE (§4a)**

- NVDA — `GPL-2.0` · desktop-app · $0
- Orca — `LGPL-2.1` · desktop-app · $0
- Speech Dispatcher — `unverified` *(no family on file)* · library · $0
- eSpeak NG — `GPL-3.0` · cli · $0
- Piper — `MIT` · cli · $0
- RHVoice — `GPL-3.0` · cli · $0
- axe-core — `MPL-2.0` · library · $0
- Pa11y — `LGPL-3.0` · cli · $0
- Lighthouse — `Apache-2.0` · cli · $0
- WAVE — `proprietary-service` · http-api · $0
- Accessibility Insights — `MIT` · desktop-app · $0
- Colour Contrast Analyser — `proprietary` · desktop-app · $0
- OpenDyslexic — `unverified` *(no family on file)* · library · $0
- ▲ WebVTT — `W3C` · protocol · $0

#### `asset-library-3d` — 14 rows · **KEEP**

- ★ Poly Haven — `CC0` · priority now · http-api · $0
- ambientCG — `CC0` · web-app · $0
- Kenney assets — `CC0` · web-app · $0
- Quaternius — `CC0` · web-app · $0
- OpenGameArt — `mixed-per-asset` · web-app · $0
- Sketchfab — `proprietary-service` · http-api · subscription
- BlenderKit — `mixed-per-asset` · plugin-or-cli · subscription
- Blend Swap — `mixed-per-asset` · web-app · $0
- CGBookcase — `mixed-per-asset` · web-app · $0
- TextureCan — `mixed-per-asset` · web-app · $0
- Poly Pizza — `mixed-per-asset` · web-app · $0
- 3D Warehouse — `proprietary-service` · web-app · $0
- NASA 3D Resources — `public-domain` · web-app · $0
- Smithsonian Open Access — `CC0` · http-api · $0

#### `robotics` — 12 rows · **FREEZE (§4a)**

- ROS 2 — `Apache-2.0` · library · $0
- Gazebo — `Apache-2.0` · desktop-app · $0
- Webots — `Apache-2.0` · desktop-app · $0
- MuJoCo — `Apache-2.0` · python-api · $0
- PyBullet — `zlib` · python-api · $0
- Open-RMF — `Apache-2.0` · protocol · $0
- MoveIt — `BSD-3-Clause` · library · $0
- Nav2 — `BSD-3-Clause` · library · $0
- PX4 — `BSD-3-Clause` · protocol · $0
- ArduPilot — `GPL-3.0` · protocol · $0
- MAVLink — `unverified` *(no family on file)* · protocol · $0
- OpenDroneMap — `AGPL-3.0` · cli · $0

#### `analytics-marketing` — 9 rows · **FREEZE (§4a)**

- ★ Matomo — `GPL-3.0` · priority now · http-api · $0
- Plausible Community Edition — `AGPL-3.0` · http-api · $0
- ★ Umami — `MIT` · priority now · http-api · $0
- PostHog — `MIT` · http-api · $0
- OpenReplay — `AGPL-3.0` · http-api · $0
- GrowthBook — `MIT` · http-api · $0
- Flagsmith — `unverified` *(no family on file)* · http-api · $0
- Postiz — `AGPL-3.0` · http-api · $0
- Mixpost — `proprietary-service` · http-api · subscription


#### `workflow-automation` — **0 rows** · the only empty category of 56 (§3.1)

---

## 3. WHAT THE REGISTRY DOES NOT COVER

Measured against row **names**, not substring noise in capability prose. `NONE` below means no row.

### 3.1 The empty category is the one the pipeline is made of
`workflow-automation` has **0 rows** (`categoriesEmpty()`) — yet the orchestrators that would run a
film exist in the table and are filed under `ai-agents`: **n8n, Temporal, Apache Airflow, Prefect,
Dagster, Kestra, Windmill, Activepieces, Node-RED, Trigger.dev** (10 rows). This is not a missing
tool, it is a missing shelf. Consequence for §5: the spine's own scheduler has no row of its own to
read, no priority, and no exit written in the automation category at all.

### 3.2 Delivery and conformance — the part a client actually receives
No row for **DCP** packaging (no DCP-o-matic, no `bmx`), **ProRes** encoding, **AS-11**, **AAF**,
**EDL/CMX3600**, **FCPXML** conversion, **timecode** utilities, **loudness/R128/ebur128**
measurement, or **automated QC**. `IMF` and `MXF` are rows only as *SMPTE standards*, not as tools
that can write them. `OpenTimelineIO` names `AAF` / `CMX3600 EDL` / `FCPXML` as its exits and none
of the three is a row (§0c) — the exchange layer of a real edit is **three dangling words**.
So: the registry can make pictures and it can transcribe speech, but **nothing in it can produce or
verify a deliverable a broadcaster or a cinema would accept**. A human with Resolve bridges this today,
at file-exchange depth, with an unverified licence.

### 3.3 Film craft that has no instrument
No **animatic** tool, no **storyboard** tool (the word appears only inside LibreOffice Draw's
capability text), no **shot-list / continuity / script-breakdown** row (that data is Film Forge's own
spec, not registry inventory), no **previz** row except the game engines borrowed for it, no
**camera tracking / match-move** row (`Natron tracker` is a dangling exit), no **denoise / degrid /
grain** row, no **rotoscoping / matte** row beyond `Natron rotoscope` (dangling).
`Face-restore` holds **2 rows** and `upscale` **5** — the thinnest categories in the kingdom that
matters most for continuity of a character across shots.

### 3.4 Voice — the stage with no driver and no resolvable exits
15 `voice` rows, **0 drivers**. `Fish Speech` exits to `F5-TTS` (no row); `RVC` exits to `Seed-VC`
(no row); `Whisper`'s diarisation need points at `pyannote.audio` (no row); `Subtitle Edit` exits to
`Gaupol` (no row). No row anywhere models **voice consent**: `TechRecord` has one free-text
`outputConditions` and one `license` string — there is **no field separating a code licence from a
weights licence, and no field for whose voice or whose likeness the weights carry**. 8 rows already
record an explicit non-commercial clause (`ChatTTS`, `MusicGen`, `AudioCraft`, `NLLB implementations`,
`MusicBrainz metadata`, `BBC Sound Effects`, `MIT OpenCourseWare`, `OpenLearn`) and 95 record
`license: "unverified"` — the two-part licence problem (§6.5) is not an edge case.

### 3.5 Reach
`economy-reach` enumerates 318 rows, but for **publication** the film has exactly two live surfaces:
YouTube at `portal-only` and PeerTube at `not-yet`. `federated-social` (30 rows) is a crowd, not a
distribution plan; there is **no row for a channel-membership or ticketing surface** the estate's own
business model (§05 payer #2) can bill through.

### 3.6 The rented-compute spine is not in the registry at all
`Replicate` is one of the six drivable tools and the only route the motion stage has to a GPU the
estate does not own (`connection.ts:25` — "the creator's own key and a verified price per model").
**There is no `Replicate` row** in any of the six catalogues (measured: `MASTER_REGISTRY` contains no
name matching `replicate`, and none matching `runpod`) — yet `Wan 2.x` lists "RunPod rented GPU" as an
exit and `replicateDriver` lists `RunPod + ComfyUI self-hosted`, `Fal.ai`, `Hugging Face Inference` as
its own. The registry catalogues **tools**, not **providers**, so the two parties the platform can
actually owe money to (and the two whose `proprietary-service` verdict §5 turns on) are outside the
contract. §1's `proprietary-service` rows (`YouTube Data API` among 16) are the only exception.
Fix belongs with §05's verified price list: add provider rows with `license: "proprietary-service"`
and a per-model `outputConditions`, or the price gate and the licence gate keep describing different
worlds.

### 3.7 Coverage vs capability
**10 of 1,109 rows have a driver — 9 of them, measured against registry names, since `Replicate` has
no row to attach to (0.8%).** 186 rows record no `sourceRepository` and 62 no
`officialUrl` — a licence read on those rows starts with a search, not a click. `hardware` is
`unverified` on 82 rows, so for 82 tools the platform does not know whether the creator's machine can
run them at all.

---

## 4. WHAT TO CUT AS NOISE

Master's instruction is the rule: **only the things that are enough for our vision.** Doctrine is
freeze-to-`_VAULT`, never silent delete, and a freeze that loses the count fails the checker (§10 §1b,
§5). Counts below are per-category and re-computable from `byCategory()`.

### 4a. Cut the whole category — 587 rows frozen
| Category | Rows | Why it is not an instrument of a film |
|---|---|---|
| `games-interactive` | 33 | engines ship playable software; Blender + Godot already cover previz |
| `robotics` | 12 | no stage of a film touches a ROS node |
| `hardware-fabrication` | 31 | KiCad-to-CNC is a maker estate, not a studio rail |
| `geospatial` | 18 | mapping is another vertical's product |
| `photography` | 12 | still-image pipeline; `design-graphics` + `image-generation` already serve plates |
| `asset-library-text` | 20 | a film needs stock media, not open textbooks |
| `digital-forensics` | 28 | that capability is the **PSI arm** at ai-governance-standard.com, not this repo |
| `cryptography-keys` | 32 | frozen-core crypto is one Owner decision (§10 §4.4), not 32 inventory rows |
| `research-compute` | 34 | scientific compute; DuckDB/Spark do not appear in any film stage |
| `knowledge-graph` | 20 | metadata standards live in `rights-licensing` already |
| `ai-retrieval-memory` | 28 | chat front-ends; `memory.ts` + `search-index` cover the spine |
| `ai-evaluation-safety` | 21 | eval harnesses; the checker (68→74 assertions) is this project's evaluation |
| `commerce-marketplace` | 17 | marketplace is `gated` after sale #1 (§10 §1a) |
| `payments-billing` | 19 | one payment account, one Owner decision; BYO key per §05 |
| `crm-operations` | 24 | inbound-only, one-shot doctrine — no outreach machine |
| `contracts-documents` | 17 | keep Documenso + Stirling-PDF as two pull-backs (§4c); the rest is an office |
| `analytics-marketing` | 9 | the ledger prints every real number; a second number-machine invites invented ones |
| `federated-social` | 30 | a crowd is not a distribution plan (§3.5) |
| `ci-cd-codehosting` | 31 | one Forgejo + one runner; 31 rows is a DevOps museum |
| `deploy-infra` | 38 | the spine is a static client + one ledger on $0 infra (§05 §2) |
| `observability` | 25 | Uptime Kuma + the ledger's own trail is enough |
| `identity-auth` | 24 | one auth surface; BYO key is the contract |
| `publishing-cms` | 30 | the estate has **two** public faces; keep Ghost and WordPress (§4c), cut 28 |
| `search-index` | 20 | keep Tesseract/PaddleOCR/Docling as pull-backs (§4c); a film index is `ledger.ts` |
| `accessibility` | 14 | screen readers and contrast checkers are product polish; the film's own caption need survives as the `WebVTT tooling` row inside `subtitle`, which is kept |
| **sum** | **587** | 1,109 − 587 = **522 rows remain in the working inventory** |

### 4b. Cut inside the kept categories — same job, many rows
Keeping a category is not keeping it. Within the surviving 522:
- **7 image WebUIs for one job** (ComfyUI ▲, AUTOMATIC1111, InvokeAI, Fooocus, SD.Next, StableSwarmUI,
  Krita AI Diffusion) → **keep ComfyUI + InvokeAI**, freeze 5. ComfyUI is the only one with a driver.
- **7 mechanical-CAD rows in a film studio** (FreeCAD, OpenSCAD, SolveSpace, BRL-CAD, LibreCAD,
  Wings 3D, MB-Lab) → freeze all 7; `three-d` keeps Blender, MakeHuman, Meshroom/COLMAP/OpenMVG
  cluster, the Gaussian-splat pair and USD/OpenVDB.
- **11 audio rows in `audio-daw`** (Ardour, LMMS, Qtractor, Rosegarden, MusE, Zrythm, Tenacity,
  Audacity, Reaper + the two analysers Sonic Visualiser/Spek) → **keep Ardour ▲ + Audacity**,
  freeze **9**. Ardour is the only one with a driver.
- **14 `subtitle` rows**: keep `Whisper ▲`, `whisper.cpp ▲`, `WhisperX`, `Subtitle Edit ▲`,
  `WebVTT tooling ▲`, `ffmpeg subtitles filter ▲` → freeze **8** (Kaldi, Coqui STT, ESPnet, NeMo,
  SpeechBrain, Vosk, Amara, Aegisub).
- **4 code hosts + 11 CI systems** — already frozen with `ci-cd`.
- **17 `video-editing` rows** → keep `FFmpeg ▲`, `Kdenlive ▲`, `Shotcut`, `Olive`, `MediaInfo`,
  `MLT Framework`; freeze **6** (OpenShot, Pitivi, Flowblade, Avidemux, LiVES, Cinelerra) and treat
  HandBrake/LosslessCut as utilities, not editors.

### 4c. Pull-backs (kept *despite* their category being frozen)
Ten of these are genuinely outside the 522 and must be carried back: `Documenso`, `Stirling-PDF`
(from `contracts-documents` — release paperwork + deliverable PDFs) · `Ghost`, `WordPress`
(from `publishing-cms` — the two public faces) · `Tesseract OCR`, `PaddleOCR`, `Docling`
(from `search-index` — burn-in and text recovery) · `Open WebUI`, `LibreChat`
(from `ai-retrieval-memory` — operator console for `Ollama †`) · `Piper` (from `accessibility` —
the $0 dialogue fallback named in §05).
Two more names sit **already inside the 522** and are listed here for emphasis, not for arithmetic:
`Jellyfin` (`video-hosting`, offline viewing room for a commission client) and `CosyVoice`
(`voice`, Tier-1 dialogue candidate).

**Net after §4: 522 − (5 + 7 + 9 + 8 + 6) + 10 = 497 working rows; 1,109 − 497 = 612 frozen.**
No row leaves the table. The checker keeps counting all 1,109; only the *working set* shrinks.

---

## 5. THE LICENCE WORK QUEUE

### 5.1 Size and shape, measured
| Question | Command | Answer |
|---|---|---|
| Rows a human must read | `reviewQueue(MASTER_REGISTRY).length` | **1,109** (100%) |
| Rows already asserted human-read | `filter(r => r.licenseVerified).length` | **0** |
| Rows with a verification date | `filter(r => r.lastVerified !== null).length` | **0** |
| Rows cleared for client work | `filter(isClearedForWork).length` | **0** |
| Rows whose licence **family** is also unknown | `filter(r => r.license === "unverified").length` | **95** |
| Rows with a non-OSI or "raced" string (custom / mixed / community / fair-code / source-available / BUSL / SSPL / FSL / trial / proprietary / mixed-per-asset) | regex over `license` | **100** |
| Rows whose recorded string names a **non-commercial** clause | `/-NC\|BY-NC\|non-commercial/i` over `license` | **8** |
| Rows asserting a permission while attribution is still unverified | checker line `no partial permission claims` | **0** — and measured, `commercialUse` is `"unverified"` on **all 1,109**, as is `redistribution` |

### 5.2 Which rows matter first
**Wave L1 — 12 rows (11 that exist + 1 that must first be added). This is the only queue that
unblocks money.**
The 10 driver records + the 2 candidates that would give `dialogue` its first driver.
`FFmpeg †` · `Blender †` · `Whisper †` · `Ollama †` · `ComfyUI †` · `Kdenlive †` ·
`DaVinci Resolve free edition †` · `Ardour †` · `YouTube Data API †` · **`Fish Speech`** ·
**`CosyVoice`** = 11 rows, plus **`Replicate`, which has no row yet** (§3.6) and whose absence means
the paid half of the motion stage cannot be gated at all.
Nine of the eleven are ordinary open-source families — copyleft on `FFmpeg` (GPL/LGPL, build-dependent),
`Blender`, `ComfyUI`, `Kdenlive`, `Ardour`; permissive on `Whisper`, `Ollama`, `CosyVoice` (MIT, MIT,
Apache-2.0) — and copyleft changes the *answer* only for `platform-bundle`, never for `client-work`
(`licenseguard.ts:96-98`). The two exceptions are rented or proprietary surfaces: `YouTube Data API`
(`proprietary-service`) and `DaVinci Resolve free edition` (`proprietary-free` in the catalogue,
`restricted` + `redistribution: no` in its driver record, §6.3), whose correct outcome is **"operator-side
tool, never bundled"** (`licenseguard.ts:78-82`), not a clear. `Fish Speech` records **share-alike on
the weights** (`CC-BY-SA-4.0 (weights) / BSD-3-Clause (code)`) — that clause reaches the finished film,
not just the code, and is the single most consequential unread string in Tier-1 (§6.5).

**Wave L2 — 41 rows.** Every film-category row at priority `now` (the `★` lines in §2): Wan 2.x, RIFE,
PySceneDetect, Auto-Editor, ComfyUI-video-workflows, ControlNet, IP-Adapter, Stable Diffusion, SDXL,
FLUX, LoRA fine-tuning, ControlNet-openpose, GFPGAN, Real-ESRGAN, USD, Natron, Blender Compositor,
OpenColorIO, Demucs, whisper.cpp, Subtitle Edit, ffmpeg subtitles filter, Fountain tooling, Pandoc,
C2PA, OpenTimestamps, Sigstore, SPDX, ScanCode Toolkit, Poly Haven, Wikimedia Commons, Openverse,
PeerTube, Owncast, WordPress, Ghost and the remainder of that printed set. The two CMS rows are read
only because §4c pulls them back; if the Owner keeps `publishing-cms` frozen whole, L2 is 39.
These are the tools a finished film leans on one stage away from a driver.

**Wave L3 — 497 − 11 − 41 = 445 rows.** The rest of the §4 working set: read only when a stage needs
the tool, in the order the pipeline reaches it.
**Wave L4 — the 612 frozen rows: never cleared, always counted** (497 + 612 = 1,109). They are read
only if the Owner re-activates them (§10 §4.10). Until then their honest state is `unverified`, and
the platform says so.

### 5.3 The procedure that turns a row into a cleared row
Binary gate; no partial credit; one physical action per row.

1. **Open the licence at its source.** The row's `sourceRepository` (186 rows have none — start from
   `officialUrl`, 62 rows have neither: those need the repo found first, and the found URL written
   back into the row before the read counts).
2. **Read the operative clauses, not the summary.** Four questions, in order: may we **sell work made
   with it**; may we **redistribute it inside a product**; may we **modify** it; what must be
   **attributed**; and what does it say about **the output** (`outputConditions`) and about
   **training data** (`trainingDataDisclosure`).
3. **Record only what the text says.** A clause that is ambiguous stays `"unverified"`. A read that
   concludes "probably fine" is not a read. **Never invent a licence**: if the family is unknown,
   `license` stays `"unverified"` — that string is a correct answer and 95 rows already hold it.
4. **Apply it through `applyHumanRead(rec, read, datedOn)` (`licenseguard.ts:124-135`)** — the only
   sanctioned writer. It sets `licenseVerified: true` **and** `lastVerified: datedOn` together, and
   `schema.ts:159` refuses the pair in the other direction: a row with `lastVerified: null`
   **cannot** assert `licenseVerified`. So a verified flag without a date is impossible by
   construction; measured, `assertedVerifiedWithoutDate()` = 0.
5. **Re-run the gate**: `guard(row, "client-work")` and, if the platform would ship it,
   `guard(row, "platform-bundle")` — bundle is a **separate verdict**, because copyleft
   (`licenseguard.ts:46, 96`) and redistribution (`:92`) attach only when it travels inside a product.
   A permissive row can clear client work and still refuse the bundle. That is not a bug.
6. **A row read and refused stays in the table.** `REJECTED_EXAMPLE` (`licenseguard.ts:138-142`) is
   the pattern: `commercialUse: "no"`, still recorded, `verdict: blocked`. Nothing is deleted for
   failing.
7. **Then, and only then, does the driver run.** `gateOnLicence()` (`drivers/contract.ts:82-101`)
   is evaluated **at the moment of use**, not in a spreadsheet — today all 10 return
   `blocked-by-licence`.
8. **Owner-only.** Marking `licenseVerified: true` is decision #3 of the owner-only list (§10 §4).
   No agent may do it. `guard()`'s `nextAction` line is the single physical step for each row.

### 5.4 Why an agent's read must be recorded separately from a human's
Because an agent's read **is a different kind of thing**, and the code already says so:

- `index.ts:3-6`: *"An agent repeating a licence claim is still a claim."* A model paraphrasing
  Apache-2.0 has produced a summary, not an attestation. Summaries hallucinate clause numbers.
- `licenseguard.ts:9-17` refuses silent conversion between eight kinds of statement: a
  **creator-claim** is not a **licence-document**; a licence is not an **agreement**; a
  **verified-signature** is not a **legal-conclusion**. `canPromote()` (`:113-121`) hard-refuses an
  assertion whose kind is `legal-conclusion` and refuses `verified-signature` unless an actual
  verification result exists. An agent read is a **creator-claim about a document**, at best; it can
  never be promoted into `licence-document`.
- `TechRecord` has exactly one boolean, `licenseVerified`, and its comment (`schema.ts:96`) is
  *"true only when a **human** has read the licence text and recorded the date."* The field is not
  "is this believed", it is "who stood behind it".
- Therefore an agent pass is written where it cannot be mistaken for a human pass: in
  `capability` / `outputConditions` prose, or as an `Assertion { kind: "creator-claim", source: … }`,
  and it **must not** touch `licenseVerified` or `lastVerified`. The checker enforces the line —
  `PASS no agent marked a licence as human-read — 0 rows claim licenseVerified` — and it is the
  assertion most worth keeping forever (§10 §5, "Licence honesty").
- Practical reason, not only epistemic: the estate sells **proof**. A buyer of a sealed minute is
  buying a manifest whose every tool row traces to a dated human act. An agent-cleared manifest has
  no author. `unverified` with a named human and a date is worth more than `cleared` with nobody.

### 5.5 The queue's honest total
12 rows read by a human in one sitting is the difference between "the platform can make a film" and
"the platform can sell one" (§05 payer #2). It is not 1,109 rows, and it is not 3,000. **Wave L1 =
12 rows, pass/fail, each with one `nextAction`.** Nothing about §4's 587 frozen rows blocks that.

---

## 6. DEFECTS THIS PASS FOUND (each is a checker candidate)

1. **`workflow-automation` empty while its 10 tools sit in `ai-agents`** (§3.1). Fix: re-file, keep
   counts, assert the category is non-empty.
2. **572 dangling exit mentions / 385 rows, 510 distinct unresolvable names** (§0c). A written exit
   that names nothing the platform holds is a written exit on paper only. Fix: `rowsWithUnresolvableExitOnly()`
   — 32 film rows today, 5 of them at priority `now` (`PySceneDetect`, `ComfyUI-video-workflows`,
   `LoRA fine-tuning`, `ControlNet-openpose`, `USD (OpenUSD)`), and add each of those names as a row
   or rewrite the exit.
3. **Two sources of truth for the same tool.** The driver record and the registry row disagree:
   `Blender` is `GPL-3.0` in the catalogue and `GPL-2.0-or-later` in `drivers/cli-drivers.ts`;
   `Kdenlive` is `GPL-3.0-or-later` vs driver `unverified`; `Ardour` `GPL-2.0-or-later` vs
   `unverified`; `DaVinci Resolve` `proprietary-free / commercialUse unverified` in the row vs
   `proprietary freemium (Resolve) / paid (Studio)` with `commercialUse: "restricted"` and
   `redistribution: "no"` in the driver. **A licence read on a row does not clear the driver.**
   Fix: drivers reference `MASTER_REGISTRY` by name instead of minting private records, and the
   checker asserts parity — this is the exact class of bug that would let an unverified string ship.
4. **Portal records bypass the exit contract** — `drivers/studio.ts:95` hard-codes
   `replacementOptions: []`; the pipeline's "an adopted row needs a written exit" check passes only
   because it looks at catalogue rows, not built drivers.
5. **No field for a two-part licence.** `Fish Speech` records `CC-BY-SA-4.0 (weights) / BSD-3-Clause
   (code)` and `MusicGen` `CC-BY-NC-4.0 / MIT (code, mixed)` **inside one string**. Share-alike on
   weights and non-commercial on weights are different problems with different fixes (a paid weights
   licence clears one, never the other). The contract cannot express them separately, and has no
   field at all for the consent of the person whose voice or face the weights carry — which is
   precisely the estate's own product claim (§05). Recommend `codeLicense` / `weightsLicense` /
   `consentBasis`, filled by a human, defaulting `unverified` exactly as the existing fields do.
6. **186 rows with no `sourceRepository`, 62 with no `officialUrl`, 82 with `hardware: "unverified"`**
   — the read cannot even start, or the machine cannot be named. Triage these inside each wave, not
   as a separate project.
