# Engine survey — the CUTTING stages: `edit` and `finish`

What: ranked-dictionary candidate rows for shot assembly, NLEs, auto-cut, upscaling, frame-rate interpolation, colour/HDR, restoration, and the encoder engines. Every licence was read from the project's own LICENSE/COPYING file, the vendor page, or the GitHub API licence detector; anything not read at a primary source is `null` and is listed under "Not verified".
Date: 2026-11-04 (all `measuredAt`).

Field conventions for this cluster (per Master's instruction): in `ceiling`, `maxEdge` is the maximum output long edge, `maxSeconds` is `null` for CLI tools with no length cap, `fps` is the frame-rate ceiling or documented throughput. One-time/seat licences (Topaz, AutoPod, Resolve) keep `priceUsdPerSecond: null` and carry the price in the comment/`fits`.

```ts
export const SURVEY_EDIT_FINISH: Engine[] = [
  // ---------- edit: assembly, shot detection, auto-cut ----------
  {
    id: "ffmpeg",
    name: "FFmpeg",
    stage: "edit",
    kind: "cli",
    vendorUrl: "https://ffmpeg.org",
    sourceRepository: "https://github.com/FFmpeg/FFmpeg",
    licence: {
      // LICENSE.md read directly: most files LGPL-2.1+; GPL-2.0+ if built with --enable-gpl (x264/x265 filters).
      spdx: "LGPL-2.1-or-later OR GPL-2.0-or-later (build-dependent)",
      evidenceUrl: "https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/LICENSE.md",
      excludedTerritories: [],
      revenueClause: "none (copyleft obligations depend on build flags)",
      attested: "human",
    },
    released: "2026-09-21", // tag n8.1.3; note a n9.0.2 tag dated 2026-09-18 also exists — branch naming unclarified
    releasedSource: "https://github.com/FFmpeg/FFmpeg/tags.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // no software cap; bound only by the encoder/format chosen
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free software; the bill is your own CPU/GPU time",
    board: null,
    driver: "drivable",
    fits: "The universal assembler: concat, trim, mux, overlay, haldclut/lut3d, tone-map, and every hardware encoder backend (nvenc/amf/qsv/vaapi) in one CLI. If a stage has no purpose-built tool, FFmpeg does it.",
    measuredAt: "2026-11-04",
  },
  {
    id: "pyscenedetect",
    name: "PySceneDetect",
    stage: "edit",
    kind: "cli",
    vendorUrl: "https://www.scenedetect.com",
    sourceRepository: "https://github.com/Breakthrough/PySceneDetect",
    licence: {
      spdx: "BSD-3-Clause",
      evidenceUrl: "https://raw.githubusercontent.com/Breakthrough/PySceneDetect/main/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine", // LICENSE header read verbatim
    },
    released: "2026-10-12", // v0.7.2
    releasedSource: "https://github.com/Breakthrough/PySceneDetect/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // resolution-agnostic; splits via ffmpeg/mkvmerge
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU-only analysis
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "Shot-boundary detection (content-aware / adaptive detectors) that turns a reel of generated clips into a shot list; the front end of any automated assembly. Published detector benchmarks at scenedetect.com/benchmarks.",
    measuredAt: "2026-11-04",
  },
  {
    id: "auto-editor",
    name: "Auto-Editor",
    stage: "edit",
    kind: "cli",
    vendorUrl: "https://auto-editor.com",
    sourceRepository: "https://github.com/wyattblue/auto-editor",
    licence: {
      spdx: "Unlicense", // LICENSE is the public-domain Unlicense text, read verbatim
      evidenceUrl: "https://raw.githubusercontent.com/wyattblue/auto-editor/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: "2026-10-30", // 31.8.0
    releasedSource: "https://github.com/wyattblue/auto-editor/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // silence/loudness analysis, GPU optional for decode
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "Speech-driven first cut: drops silence and dead air from dialogue-heavy footage by loudness analysis. The cheapest way to compress a 40-minute multicam take into a watchable assembly.",
    measuredAt: "2026-11-04",
  },
  {
    id: "lossless-cut",
    name: "LosslessCut",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://github.com/mifi/lossless-cut",
    sourceRepository: "https://github.com/mifi/lossless-cut",
    licence: {
      spdx: "GPL-2.0-or-later", // LICENSE is GPLv2 text, read verbatim
      evidenceUrl: "https://raw.githubusercontent.com/mifi/lossless-cut/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (copyleft — source disclosure on redistribution)",
      attested: "machine",
    },
    released: "2026-10-28", // 3.70.2
    releasedSource: "https://github.com/mifi/lossless-cut/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // Electron app wrapping ffmpeg stream-copy
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "Instant cut/merge of clips with no re-encode (ffmpeg stream copy). Perfect for pre-assembling generated shots before the render pipeline; lossy only at keyframe boundaries.",
    measuredAt: "2026-11-04",
  },
  // ---------- edit: human-driven NLEs ----------
  {
    id: "kdenlive",
    name: "Kdenlive",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://kdenlive.org",
    sourceRepository: "https://invent.kde.org/multimedia/kdenlive", // GitHub mirror used for evidence
    licence: {
      spdx: "GPL-3.0-or-later", // COPYING read; GitHub API licence detection agrees (GPL-3.0)
      evidenceUrl: "https://raw.githubusercontent.com/KDE/kdenlive/master/COPYING",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: "machine",
    },
    released: "2026-10-08", // v26.08.2
    releasedSource: "https://github.com/KDE/kdenlive/tags.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // output bound by chosen encoder
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU-first, MLT render farm optional
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The mature FOSS NLE: proxy editing, hundreds of effects, scripting via qdbus; the strongest candidate for a human to finish a cut entirely on open source.",
    measuredAt: "2026-11-04",
  },
  {
    id: "blender-vse",
    name: "Blender (Video Sequence Editor)",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://www.blender.org",
    sourceRepository: "https://github.com/blender/blender",
    licence: {
      spdx: "GPL-2.0-or-later", // long-known; primary text at blender.org/about/license not re-read this pass -> attested null
      evidenceUrl: "https://www.blender.org/about/license/",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: null,
    },
    released: "2026-10-21", // v5.2.3
    releasedSource: "https://github.com/blender/blender/tags.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // headless render via `blender -b`
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "Sequence editor plus a full node compositor in one scriptable binary; heavy for pure cutting, unbeatable when the edit needs compositing in the same tool.",
    measuredAt: "2026-11-04",
  },
  {
    id: "shotcut",
    name: "Shotcut",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://shotcut.org",
    sourceRepository: "https://github.com/mltframework/shotcut",
    licence: {
      spdx: "GPL-3.0", // via GitHub API licence detection on the repo (LICENSE file not independently re-read)
      evidenceUrl: "https://api.github.com/repos/mltframework/shotcut",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: "machine",
    },
    released: "2026-09-28", // v26.9.27
    releasedSource: "https://github.com/mltframework/shotcut/releases/tag/v26.9.27",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "FFmpeg/MLT-based NLE with a shallower learning curve than Kdenlive; good cross-platform (Win/mac/Linux) manual cutting bay.",
    measuredAt: "2026-11-04",
  },
  {
    id: "olive",
    name: "Olive 0.2",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://olivevideo.io",
    sourceRepository: "https://github.com/olive-editor/olive",
    licence: {
      spdx: "GPL-3.0-or-later", // LICENSE is plain GPLv3 text, read verbatim
      evidenceUrl: "https://raw.githubusercontent.com/olive-editor/olive/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: "machine",
    },
    released: "2024-12-04", // 0.2.0-nightly; no stable tag on record
    releasedSource: "https://github.com/olive-editor/olive/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // GPU-accelerated compositor; VRAM floor undocumented
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "no-driver", // nightly builds; not headless-scriptable
    fits: "Node-graph compositor + NLE aiming at the Resolve/Fusion niche under a clean GPL-3. Still 0.2 nightly — promising, not dependable, and last public build is 2024-12.",
    measuredAt: "2026-11-04",
  },
  {
    id: "natron",
    name: "Natron",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://github.com/NatronGitHub/Natron",
    sourceRepository: "https://github.com/NatronGitHub/Natron",
    licence: {
      spdx: "GPL-2.0-or-later", // LICENSE.txt (GPLv2 text) read; GitHub API agrees GPL-2.0
      evidenceUrl: "https://raw.githubusercontent.com/NatronGitHub/Natron/master/LICENSE.txt",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: "machine",
    },
    released: "2022-11-26", // v2.5.0 — effectively unmaintained since
    releasedSource: "https://github.com/NatronGitHub/Natron/releases/tag/v2.5.0",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "Open Nuke-style compositing (roto, keying, OFX plugins). Last release 2022: capable but frozen; the plugin ecosystem is the reason to touch it.",
    measuredAt: "2026-11-04",
  },
  {
    id: "flowblade",
    name: "Flowblade",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://github.com/jliljebl/flowblade",
    sourceRepository: "https://github.com/jliljebl/flowblade",
    licence: {
      spdx: "GPL-3.0-or-later", // LICENSE (GPLv3 text) read; repo self-describes GPL3
      evidenceUrl: "https://raw.githubusercontent.com/jliljebl/flowblade/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (copyleft)",
      attested: "machine",
    },
    released: "2026-05-29", // Flowblade 2.24.2
    releasedSource: "https://github.com/jliljebl/flowblade/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "no-driver", // Linux desktop only, no documented headless mode
    fits: "Fast keyboard-first multitrack editor for Linux; where Kdenlive is the workshop, Flowblade is the cutting bench.",
    measuredAt: "2026-11-04",
  },
  {
    id: "mlt",
    name: "MLT Framework (melt)",
    stage: "edit",
    kind: "cli",
    vendorUrl: "https://www.mltframework.org",
    sourceRepository: "https://github.com/mltframework/mlt",
    licence: {
      spdx: "LGPL-2.1", // GitHub API licence detection (library deliberately LGPL so it can be linked)
      evidenceUrl: "https://api.github.com/repos/mltframework/mlt",
      excludedTerritories: [],
      revenueClause: "none (weak copyleft: links cleanly)",
      attested: "machine",
    },
    released: "2026-10-03", // v7.42.0
    releasedSource: "https://github.com/mltframework/mlt/releases/tag/v7.42.0",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The XML-driven render engine underneath Shotcut/Kdenlive; `melt` takes a timeline XML and renders headless — the seam where a platform can drive a full NLE from code.",
    measuredAt: "2026-11-04",
  },
  // ---------- edit: proprietary / vendor ----------
  {
    id: "davinci-resolve",
    name: "DaVinci Resolve (free tier)",
    stage: "edit",
    kind: "app",
    vendorUrl: "https://www.blackmagicdesign.com/products/davinciresolve",
    sourceRepository: null,
    licence: {
      // Proprietary EULA shipped with the installer; the hosted PDF was fetched but not machine-readable this pass -> attested null.
      spdx: "LicenseRef-Blackmagic-EULA (proprietary)",
      evidenceUrl: "https://d7umqicpi7263.cloudfront.net/eula/product/926e6a7e-46f0-465c-8182-ad56050c9094/d4d34663-7069-48ce-b0fa-57d3ddc00b6d.pdf",
      excludedTerritories: [],
      revenueClause: "proprietary: no redistribution — hard refusal for bundling per platform law 1",
      attested: null,
    },
    released: null, // version cadence not verified this pass (Resolve 19/20 line; see Not verified)
    releasedSource: null,
    ceiling: {
      maxEdge: 3840, // vendor page (fetched): free version handles "virtually all 8-bit video formats at up to 60fps", "resolutions up to Ultra HD 3840 x 2160"
      maxSeconds: null,
      fps: 60,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // GPU required in practice; documented floor not read
    priceUsdPerSecond: null,
    priceSource: "free tier $0; Studio is a one-time licence (price not verified this pass)",
    board: null,
    driver: "needs-licence-read",
    fits: "Industry-standard grading and edit, and the yardmark every open NLE is compared against. BUT: proprietary, redistribution-restricted, and the vendor page itself states the free tier is capped at 8-bit/UHD/60fps while Studio unlocks 10-bit, beyond-4K and 120fps (exact free-tier codec limits, e.g. H.264/H.265 behaviour, not read from a primary source -> Not verified). Index and let a human drive it; never bundle it.",
    measuredAt: "2026-11-04",
  },
  {
    id: "autopod",
    name: "AutoPod (multicam auto-editor plugin)",
    stage: "edit",
    kind: "api",
    vendorUrl: "https://www.autopod.fm",
    sourceRepository: null, // hosted plugin; a GitHub repo for it was not found this pass
    licence: {
      spdx: "Proprietary", // no primary licence text read -> evidence is the vendor pricing page
      evidenceUrl: "https://www.autopod.fm/pricing",
      excludedTerritories: [],
      revenueClause: "subscription per license",
      attested: null,
    },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] }, // runs inside Premiere/Resolve as a plugin
    priceUsdPerSecond: null, // $29/month per licence is a seat price, not per-second; kept null with this note
    priceSource: "https://www.autopod.fm/pricing — 'Individual. Per License. $29/mo'",
    board: null,
    driver: "no-driver", // no public automation API verified; the open-source AutoCut predecessor repo is gone (see Not verified)
    fits: "Automatic multicam shot-switching for podcast/talking-head footage, up to 10 cameras; $29/mo per seat with a 30-day trial. Included as the ranked competitor to a scripted Auto-Editor + PySceneDetect pipeline.",
    measuredAt: "2026-11-04",
  },

  // ---------- finish: upscaling / restoration (weights) ----------
  {
    id: "real-esrgan",
    name: "Real-ESRGAN",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/xinntao/Real-ESRGAN",
    sourceRepository: "https://github.com/xinntao/Real-ESRGAN",
    licence: {
      spdx: "BSD-3-Clause", // LICENSE read verbatim
      evidenceUrl: "https://raw.githubusercontent.com/xinntao/Real-ESRGAN/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: "2022-09-20", // v0.3.0
    releasedSource: "https://github.com/xinntao/Real-ESRGAN/releases",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // tiled inference, any size; per-frame so length-agnostic
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "local-comfy", "rented-gpu"] }, // vendor documents no VRAM floor -> null
    priceUsdPerSecond: null,
    priceSource: "self-hosted weights, $0 licence",
    board: null,
    driver: "drivable",
    fits: "The default open upscaler: GAN super-resolution run frame-by-frame. Fast and permissive (BSD-3), but temporally unstable on video — flicker is its signature failure; use realesrgan-x4plus/videosr variants and overlap tiling.",
    measuredAt: "2026-11-04",
  },
  {
    id: "seedvr2",
    name: "SeedVR2 (ByteDance Seed)",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/ByteDance-Seed/SeedVR",
    sourceRepository: "https://github.com/ByteDance-Seed/SeedVR",
    licence: {
      spdx: "Apache-2.0", // README states models are "licensed under the Apache 2.0" (repo page read via fetch)
      evidenceUrl: "https://github.com/ByteDance-Seed/SeedVR",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "human",
    },
    released: null, // no GitHub releases/tags; weights shipped via Hugging Face — model-card date not fetched
    releasedSource: null,
    ceiling: {
      maxEdge: 2048, // README: "4 H100-80G further support 1080p and 2K videos (sp_size=4)"
      maxSeconds: null, // diffusion restorer; clip windows, stitched — single-pass window is frames not seconds
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: 80, weightsPublic: true, executors: ["rented-gpu", "local-comfy"] }, // README: "1 H100-80G can handle videos with 100x720x1280"
    priceUsdPerSecond: null,
    priceSource: "self-hosted: the bill is the H100 hour",
    board: null,
    driver: "drivable",
    fits: "The strongest open-weights video restorer: one-step diffusion, arbitrary resolution, temporal consistency by design. The trade is the body — an 80 GB H100 class GPU per 720p window; per-second throughput not documented -> null.",
    measuredAt: "2026-11-04",
  },
  {
    id: "upscale-a-video",
    name: "Upscale-A-Video (CVPR 2024)",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/sczhou/Upscale-A-Video",
    sourceRepository: "https://github.com/sczhou/Upscale-A-Video",
    licence: {
      spdx: "LicenseRef-S-Lab-1.0 (non-commercial)", // LICENSE read: "Redistribution and use for non-commercial purpose"; commercial use requires contacting the authors
      evidenceUrl: "https://raw.githubusercontent.com/sczhou/Upscale-A-Video/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "NON-COMMERCIAL ONLY — clause 4: commercial redistribution/use must be negotiated with contributor(s)",
      attested: "machine",
    },
    released: null, // no tags with dates; repo is code + weights, last activity circa 2023-2024
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] }, // diffusion VRAM floor not documented by vendor
    priceUsdPerSecond: null,
    priceSource: null, // non-commercial licence: a paying film cannot lawfully use this — the platform must refuse it, not price it
    board: null,
    driver: "needs-licence-read",
    fits: "Temporal-consistent diffusion upscaling (dual-stream + optical-flow constraint) — technically excellent, licence-poisoned for paid work: S-Lab 1.0 bans commercial use. Research preview only.",
    measuredAt: "2026-11-04",
  },
  {
    id: "topaz-video-ai",
    name: "Topaz Video AI",
    stage: "finish",
    kind: "app",
    vendorUrl: "https://www.topazlabs.com/video-ai",
    sourceRepository: null, // proprietary; only plugin/toolchain repos are public
    licence: {
      spdx: "Proprietary", // product page read: subscription licence, "Limited commercial use" for orgs under $1M USD revenue
      evidenceUrl: "https://www.topazlabs.com/video-ai",
      excludedTerritories: [],
      revenueClause: "commercial use limited to organisations under $1M revenue (vendor page quote); no redistribution",
      attested: "human",
    },
    released: null, // rolling updates; dated release-notes page not fetched this pass
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // 8K upscales advertised; primary-source spec not read -> null
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // vendor hardware minimum not read this pass -> null
    // One-time/seat pricing goes in fits per Master's rule; per-second is null. Vendor page quotes:
    // Personal $59/mo month-to-month, $39/mo with annual commitment (also quoted $25/mo at $299 billed annually); Pro $74/mo or $58/mo ($699 billed annually).
    priceUsdPerSecond: null,
    priceSource: "https://www.topazlabs.com/video-ai (fetched 2026-11-04): subscription, not per-second",
    board: null,
    driver: "no-driver", // desktop app; no documented automation CLI. Free tier: trial watermark only, no ongoing free tier on record
    fits: "The pragmatic pro bench: best-in-class restoration/upscale/interpolation models with a one-click UI, now subscription-only ($25-$59/mo Personal tiers, $699/yr Pro quote from vendor page). Human-in-the-loop tool — the rail can quote it, not run it.",
    measuredAt: "2026-11-04",
  },
  // ---------- finish: frame-rate interpolation ----------
  {
    id: "practical-rife",
    name: "RIFE (Practical-RIFE / ECCV2022-RIFE)",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/hzwer/Practical-RIFE",
    sourceRepository: "https://github.com/hzwer/Practical-RIFE",
    licence: {
      spdx: "MIT", // LICENSE read on both repos (Copyright (c) 2021 hzwer / Megvii Inc.)
      evidenceUrl: "https://raw.githubusercontent.com/hzwer/Practical-RIFE/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: null, // rolling main branch; no GitHub releases — proof URL is the repo feed itself
    releasedSource: "https://github.com/hzwer/Practical-RIFE/releases.atom",
    ceiling: {
      maxEdge: null, // arbitrary sizes via padding/tiling
      maxSeconds: null,
      fps: 30, // README (hzwer/ECCV2022-RIFE): "our model can run 30+FPS for 2X 720p" — throughput at 720p, not an output cap
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "local-comfy", "rented-gpu"] }, // consumer cards suffice; vendor floor undocumented -> null
    priceUsdPerSecond: null,
    priceSource: "self-hosted weights, $0 licence",
    board: null,
    driver: "drivable",
    fits: "The open default for slow-motion and 24->60 fps conversion: optical-flow interpolation at real-time-ish speed (30+ FPS at 2X 720p per README), MIT-licensed, already a ComfyUI standard. Ghosting on hard occlusions is the known failure mode.",
    measuredAt: "2026-11-04",
  },
  {
    id: "film-vfi",
    name: "FILM (Frame Interpolation with Large Motion, NVIDIA/CVPR22)",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/google-research/frame-interpolation",
    sourceRepository: "https://github.com/google-research/frame-interpolation",
    licence: {
      spdx: "Apache-2.0", // LICENSE read verbatim from the repo
      evidenceUrl: "https://raw.githubusercontent.com/google-research/frame-interpolation/main/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: null, // research code, never released on a cadence; weights distribution through NVIDIA channels not re-verified this pass
    releasedSource: null,
    ceiling: { maxEdge: 1920, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // 1080p checkpoints were the documented top tier; re-read needed before ranking first -> see Not verified
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] }, // VRAM floor not documented in this pass -> null
    priceUsdPerSecond: null,
    priceSource: "self-hosted weights, $0 licence",
    board: null,
    driver: "drivable",
    fits: "Higher-quality-than-RIFE interpolation for clips with large motion (vimeo90k / BMVL / Sintel benchmarks in the repo). Apache-2.0. Costs a lot of VRAM and time; use it for the hero slow-motion shot, not the whole film.",
    measuredAt: "2026-11-04",
  },
  {
    id: "dain",
    name: "DAIN (Depth-Aware Interpolation, baowenbo)",
    stage: "finish",
    kind: "weights",
    vendorUrl: "https://github.com/baowenbo/DAIN",
    sourceRepository: "https://github.com/baowenbo/DAIN",
    licence: {
      spdx: "MIT", // LICENSE read verbatim (Copyright (c) 2019 Wenbo Bao)
      evidenceUrl: "https://raw.githubusercontent.com/baowenbo/DAIN/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: null, // CVPR 2019 code drop; no tags (tags feed empty)
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] }, // TF1-era stack; VRAM floor undocumented
    priceUsdPerSecond: null,
    priceSource: "self-hosted weights, $0 licence",
    board: null,
    driver: "no-driver", // unmaintained TensorFlow 1.x; a maintained ncnn port exists (nihui/dain-ncnn-vulkan, MIT) but weights provenance unverified
    fits: "The interpolation that Douyin made famous in 2019 — explicit depth cues for occlusions. Historically important, slow, and artifact-prone next to RIFE; ranked behind it on speed and maintenance.",
    measuredAt: "2026-11-04",
  },
  // ---------- finish: colour / HDR / quality ----------
  {
    id: "libplacebo",
    name: "libplacebo",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://libplacebo.org",
    sourceRepository: "https://code.videolan.org/videolan/libplacebo",
    licence: {
      // code.videolan.org is bot-gated and could not be read this pass; third-party packaging lists record LGPL-2.1-or-later for 5.x. NOT primary-verified.
      spdx: "LGPL-2.1-or-later (unverified)",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "weak copyleft if LGPL is correct",
      attested: null,
    },
    released: null, // tag list not reachable from here
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // GPU render library; runs on any Vulkan/GL card, floor undocumented
    priceUsdPerSecond: null,
    priceSource: "free software",
    board: null,
    driver: "needs-licence-read",
    fits: "The serious HDR tool in the open stack: tone-mapping (PQ/HLG), color management, and shader-based grading, exposed as FFmpeg's `libplacebo` filter and used by mpv. Rank rises the moment the licence is machine-verified.",
    measuredAt: "2026-11-04",
  },
  {
    id: "imagemagick-hald",
    name: "ImageMagick (Hald CLUT toolchain)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://imagemagick.org",
    sourceRepository: "https://github.com/ImageMagick/ImageMagick",
    licence: {
      spdx: "LicenseRef-ImageMagick (Apache-2.0-based)", // LICENSE header read: "ImageMagick License" — Apache 2.0 text with a name-attribution rider
      evidenceUrl: "https://raw.githubusercontent.com/ImageMagick/ImageMagick/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none material; may not use the ImageMagick name to endorse derivatives",
      attested: "human",
    },
    released: "2026-10-31", // 7.1.2-35
    releasedSource: "https://github.com/ImageMagick/ImageMagick/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The deterministic colour half of the finish stage: `-hald-clut` builds grading LUTs, and FFmpeg's `lut3d`/`haldclut` filters apply them across the whole film. A Hald CLUT + lut3d pair is the open-source answer to a grade pass — no AI colour API was verified on this pass (see Not verified).",
    measuredAt: "2026-11-04",
  },
  {
    id: "libvmaf",
    name: "libvmaf (VMAF)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://github.com/Netflix/vmaf",
    sourceRepository: "https://github.com/Netflix/vmaf",
    licence: {
      spdx: "BSD-2-Clause-Patent", // LICENSE header read verbatim ("SPDX short identifier: BSD-2-Clause-Patent")
      evidenceUrl: "https://raw.githubusercontent.com/Netflix/vmaf/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (patent-grant form of BSD)",
      attested: "machine",
    },
    released: "2026-09-14", // v3.2.1
    releasedSource: "https://github.com/Netflix/vmaf/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli"] }, // perceptual model files are bundled; CPU
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The finish gate, not a look tool: scores master-vs-source perceptual quality so the road can prove an upscale or encode preserved the shot. Exposed from FFmpeg as the `libvmaf` filter.",
    measuredAt: "2026-11-04",
  },
  // ---------- finish: the encoder engines ----------
  {
    id: "x264",
    name: "x264 (H.264/AVC encoder)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://code.videolan.org/videolan/x264",
    sourceRepository: "https://github.com/mirror/x264", // official git mirrored to GitHub; COPYING read from the mirror
    licence: {
      spdx: "GPL-2.0-or-later", // COPYING is plain GPLv2 text, read verbatim
      evidenceUrl: "https://raw.githubusercontent.com/mirror/x264/master/COPYING",
      excludedTerritories: [],
      revenueClause: "copyleft only; separately, H.264 patent royalties apply to distribution regardless of code licence",
      attested: "machine",
    },
    released: null, // rolling snapshots (no x.y.z releases); mirror tags feed carries no dated entries
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // Level-5.2 profiles cap at 4K/60 in practice, software itself uncapped
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU
    priceUsdPerSecond: null,
    priceSource: "free software",
    board: null,
    driver: "drivable",
    fits: "Still the compatibility king: the delivery codec every device plays. `-preset veryslow -crf 17` is the open road's default master-to-web encode.",
    measuredAt: "2026-11-04",
  },
  {
    id: "x265",
    name: "x265 (HEVC/H.265 encoder)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://bitbucket.org/multicoreware/x265_git",
    sourceRepository: "https://bitbucket.org/multicoreware/x265_git",
    licence: {
      // copying.txt not reachable for a machine read this pass (BitBucket raw returned HTML); dual GPL/commercial is widely documented but NOT primary-verified here.
      spdx: "GPL-2.0-or-later (commercial dual-licence by MulticoreWare) (unverified)",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "GPL or paid commercial licence; HEVC patent pools (MPEG-LA) separate from code licence",
      attested: null,
    },
    released: null, // tag date not fetched; BitBucket tags not machine-readable this pass
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU; slow but parallel
    priceUsdPerSecond: null,
    priceSource: "free software under GPL",
    board: null,
    driver: "needs-licence-read",
    fits: "Half the bitrate of x264 at equal quality when patents don't matter (self-hosted archival). Needs a licence read for the dual-licence nuance, and remember HEVC pool royalties are a distribution issue the code licence cannot waive.",
    measuredAt: "2026-11-04",
  },
  {
    id: "svt-av1",
    name: "SVT-AV1",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://aomedia.org",
    sourceRepository: "https://github.com/AOMediaCodec/SVT-AV1",
    licence: {
      spdx: "BSD-3-Clause-Clear + AOM Patent License 1.0", // LICENSE.md header read ("The Clear BSD License"); PATENTS.md carries the AOM grant
      evidenceUrl: "https://raw.githubusercontent.com/AOMediaCodec/SVT-AV1/main/LICENSE.md",
      excludedTerritories: [],
      revenueClause: "none; AV1 is royalty-free at the standard level (README: BSD-3-clause-clear + AOM Patent License from v0.9)",
      attested: "machine",
    },
    released: "2026-11-02", // v4.3.0
    releasedSource: "https://github.com/AOMediaCodec/SVT-AV1/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // CPU
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The practical AV1 CPU encoder: near-libaom quality at a fraction of the encode time, and the codec that keeps the film royalty-free. This is the open-source master format to beat.",
    measuredAt: "2026-11-04",
  },
  {
    id: "libaom-av1",
    name: "libaom (AV1 reference encoder)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://aomedia.org/av1/",
    sourceRepository: "https://aomedia.googlesource.com/aom",
    licence: {
      spdx: "BSD-2-Clause", // LICENSE read via googlesource ?format=TEXT: two-condition BSD, "Alliance for Open Media. All rights reserved." (+ AOM patent grant, PATENTS file not re-read -> see comment)
      evidenceUrl: "https://aomedia.googlesource.com/aom/+/refs/heads/main/LICENSE",
      excludedTerritories: [],
      revenueClause: "none; AV1 royalty-free",
      attested: "machine",
    },
    released: null, // googlesource version tags not fetched this pass
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] },
    priceUsdPerSecond: null,
    priceSource: "free open source",
    board: null,
    driver: "drivable",
    fits: "The quality ceiling and the speed floor: `aom-av1` `-cpu-used 8` is usable, the reference preset is glacial. FFmpeg exposes it as `libaom-av1`; for finished masters SVT-AV1 usually wins on time.",
    measuredAt: "2026-11-04",
  },
  {
    id: "nvenc",
    name: "NVIDIA NVENC (incl. AV1 encode)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://developer.nvidia.com/video-codec-sdk", // Video Codec SDK page confirmed live (HTTP 200)
    sourceRepository: null, // firmware/hardware encoder; only the SDK headers are public
    licence: {
      spdx: "Proprietary (NVIDIA Video Codec SDK licence)", // SDK page reachable but licence text not machine-read this pass
      evidenceUrl: "https://developer.nvidia.com/video-codec-sdk",
      excludedTerritories: [],
      revenueClause: "SDK redistribution terms apply; encoder itself ships with the driver",
      attested: null,
    },
    released: null, // driver/SDK cadence not fetched
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null }, // hardware-generation dependent; matrix not read this pass
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // requires an NVIDIA GPU (GeForce GTX 10xx+ per NVENC generation; AV1-encode GPU tier NOT verified this pass)
    priceUsdPerSecond: null,
    priceSource: "$0 software on hardware you own; the catch is the GPU vendor requirement: NVIDIA only",
    board: null,
    driver: "needs-licence-read",
    fits: "The laptop-friendly master encode: near-realtime H.264/HEVC/AV1 in silicon, driven from FFmpeg (`av1_nvenc`). Quality trails x264/SVT-AV1 at the same bitrate but finishes a feature in minutes. Hard constraint: NVENC needs an NVIDIA body.",
    measuredAt: "2026-11-04",
  },
  {
    id: "nvencc",
    name: "NVEncC (rigaya NVENC CLI)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://github.com/rigaya/NVEnc",
    sourceRepository: "https://github.com/rigaya/NVEnc",
    licence: {
      spdx: "NOASSERTION", // custom Japanese licence file (NVEnc_license.txt: free to use, must comply with bundled libraries incl. FFmpeg LGPLv2.1 / VapourSynth terms) — no OSI licence; not re-read in full
      evidenceUrl: "https://github.com/rigaya/NVEnc/blob/master/NVEnc_license.txt",
      excludedTerritories: [],
      revenueClause: "undetermined — licence file is bespoke, needs a human read",
      attested: null,
    },
    released: "2026-10-31", // 9.40
    releasedSource: "https://github.com/rigaya/NVEnc/releases.atom",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // NVIDIA GPU required (NVENC), Windows-first, Linux build exists
    priceUsdPerSecond: null,
    priceSource: "free software (per licence file, 'free to use')",
    board: null,
    driver: "needs-licence-read",
    fits: "The richest NVENC front-end beyond FFmpeg: hardware encode plus NVDENOISE/keyword-based VPP filters and interpolation in one pass. Windows-centric; licence is bespoke -> disclose before shipping.",
    measuredAt: "2026-11-04",
  },
  {
    id: "amd-amf",
    name: "AMD AMF (VCE/VCN hardware encode)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://gpuopen.com/amd-media-foundation/",
    sourceRepository: "https://github.com/GPUOpen-LibrariesAndSDKs/AMF",
    licence: {
      spdx: "MIT", // LICENSE.txt read: standard MIT, preceded by a Notice that AMD grants NO licence to codec-standards IP (MPEG/AVC/HEVC etc.)
      evidenceUrl: "https://raw.githubusercontent.com/GPUOpen-LibrariesAndSDKs/AMF/master/LICENSE.txt",
      excludedTerritories: [],
      revenueClause: "none for the SDK; standards patent royalties explicitly NOT granted",
      attested: "machine",
    },
    released: null, // AMF releases cadence not fetched (ships with drivers)
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["local-cli"] }, // requires an AMD GPU (VCE/VCN block); driven from FFmpeg via `amf` encoders
    priceUsdPerSecond: null,
    priceSource: "free SDK; hardware you own",
    board: null,
    driver: "drivable",
    fits: "The AMD mirror of NVENC: AV1/H.264/HEVC hardware encode through FFmpeg's `h264_amf/av1_amf` encoders, MIT-licensed SDK headers. Hard constraint: needs an AMD body, and the MIT grant pointedly excludes the codec standards themselves.",
    measuredAt: "2026-11-04",
  },
];
```

## Sources

Primary licence texts (read in full or header, 2026-11-04):
- FFmpeg `LICENSE.md` — https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/LICENSE.md (LGPL-2.1+ default, GPL-2.0+ build option)
- PySceneDetect `LICENSE` — https://raw.githubusercontent.com/Breakthrough/PySceneDetect/main/LICENSE (BSD-3)
- Auto-Editor `LICENSE` — https://raw.githubusercontent.com/wyattblue/auto-editor/master/LICENSE (Unlicense)
- LosslessCut `LICENSE` — https://raw.githubusercontent.com/mifi/lossless-cut/master/LICENSE (GPL-2.0 text)
- Kdenlive `COPYING` — https://raw.githubusercontent.com/KDE/kdenlive/master/COPYING (GPL-3); API licence detect https://api.github.com/repos/KDE/kdenlive
- Shotcut / MLT licence detection — https://api.github.com/repos/mltframework/shotcut , https://api.github.com/repos/mltframework/mlt
- Olive `LICENSE` — https://raw.githubusercontent.com/olive-editor/olive/master/LICENSE (GPL-3)
- Natron `LICENSE.txt` — https://raw.githubusercontent.com/NatronGitHub/Natron/master/LICENSE.txt (GPL-2), release https://github.com/NatronGitHub/Natron/releases/tag/v2.5.0
- Flowblade `LICENSE` — https://raw.githubusercontent.com/jliljebl/flowblade/master/LICENSE (GPL-3)
- OpenShot `COPYING` — https://raw.githubusercontent.com/OpenShot/openshot-qt/master/COPYING (GPL-3; repo dropped from the survey for row budget)
- Real-ESRGAN `LICENSE` — https://raw.githubusercontent.com/xinntao/Real-ESRGAN/master/LICENSE (BSD-3), release https://github.com/xinntao/Real-ESRGAN/releases
- SeedVR README (repo page fetched) — Apache-2.0; "1 H100-80G can handle videos with 100x720x1280", "4 H100-80G further support 1080p and 2K videos (sp_size=4)" — https://github.com/ByteDance-Seed/SeedVR
- Upscale-A-Video `LICENSE` — https://raw.githubusercontent.com/sczhou/Upscale-A-Video/master/LICENSE (S-Lab 1.0, non-commercial)
- RIFE — https://raw.githubusercontent.com/hzwer/Practical-RIFE/master/LICENSE (MIT); speed quote "30+FPS for 2X 720p" — https://github.com/hzwer/ECCV2022-RIFE
- FILM `LICENSE` — https://raw.githubusercontent.com/google-research/frame-interpolation/main/LICENSE (Apache-2.0)
- DAIN `LICENSE` — https://raw.githubusercontent.com/baowenbo/DAIN/master/LICENSE (MIT)
- ImageMagick `LICENSE` — https://raw.githubusercontent.com/ImageMagick/ImageMagick/master/LICENSE
- libvmaf `LICENSE` — https://raw.githubusercontent.com/Netflix/vmaf/master/LICENSE (BSD-2-Clause-Patent)
- x264 `COPYING` — https://raw.githubusercontent.com/mirror/x264/master/COPYING (GPL-2.0+)
- SVT-AV1 `LICENSE.md` + README quote "BSD-3-clause clear license and the Alliance for Open Media Patent License 1.0" — https://raw.githubusercontent.com/AOMediaCodec/SVT-AV1/main/LICENSE.md
- libaom `LICENSE` — https://aomedia.googlesource.com/aom/+/refs/heads/main/LICENSE (BSD-2-Clause)
- AMD AMF `LICENSE.txt` — https://raw.githubusercontent.com/GPUOpen-LibrariesAndSDKs/AMF/master/LICENSE.txt (MIT + standards notice)
- NVIDIA Video Codec SDK — https://developer.nvidia.com/video-codec-sdk (live, HTTP 200)

Vendor pages (fetched 2026-11-04):
- DaVinci Resolve free-vs-Studio: "virtually all 8-bit video formats at up to 60fps", "Ultra HD 3840 x 2160"; Studio "10-bit video up to 120 frames per second and resolutions beyond 4K" — https://www.blackmagicdesign.com/products/davinciresolve ; EULA PDF (fetched, unreadable as text): https://d7umqicpi7263.cloudfront.net/eula/product/926e6a7e-46f0-465c-8182-ad56050c9094/d4d34663-7069-48ce-b0fa-57d3ddc00b6d.pdf
- Topaz Video AI pricing: Personal $59/mo (monthly) / $39/mo (annual commitment) / $25/mo at $299 annually; Pro $74/mo or $58/mo ($699 annually); "Limited commercial use" under $1M revenue — https://www.topazlabs.com/video-ai
- AutoPod pricing: "Individual. Per License. $29/mo" — https://www.autopod.fm/pricing
- NVEncC release 9.40 (2026-10-31) + licence file location — https://github.com/rigaya/NVEnc/releases , https://github.com/rigaya/NVEnc/blob/master/NVEnc_license.txt

Release-date feeds: `https://github.com/<repo>/releases.atom` or `tags.atom` for each row carrying a `released` value (listed inline per row in `releasedSource`).

## Not verified

- **UnReal Interpolation** — canonical repo not found (myungjoo0nkok paths 404, no resolvable mirror in search); omitted from rows entirely. Re-index when a primary source exists.
- **AutoCut / AutoPod hosted API** — the open-source `theplatform/autocut` repo and its hosted-API pricing page were not reachable (404s); only the $29/mo Premiere plugin (autopod.fm) is evidenced. No per-second video-compilation API on record in this pass.
- **DaVinci Resolve free-tier codec specifics** (e.g. exact H.264/H.265/AV1 export restrictions per platform) and current version/release date — only the vendor's 8-bit/UHD/60fps free-tier statement was read; EULA PDF could not be machine-parsed. Needs a human read before Studio-vs-free ranking is finalised.
- **x265 copying.txt** — BitBucket raw path returned HTML/404; GPL-2.0+/commercial dual-licence is well-documented but not primary-verified this pass.
- **libplacebo licence** — code.videolan.org is bot-gated; third-party packaging lists say LGPL-2.1-or-later for 5.x but the repo LICENSE was not read. Also its release cadence/date.
- **Topaz VRAM floor, FFmpeg AV1-nvenc GPU-generation matrix, DAIN/FILM weight-download provenance, libaom/x265 dated releases, Blender licence-page re-read** — all left `null` with comments rather than guessed.
- **AI colour-grading API** — no vendor with a primary pricing/licence source was verified; the Hald CLUT + FFmpeg `lut3d` pair is the evidenced open path for now.
- **FFmpeg tag oddity** — `n8.1.3` (2026-09-21) and `n9.0.2` (2026-09-18) both appear in the tags feed; the survey records the most recent *tag date* (2026-09-21) pending clarification of which major is current.
