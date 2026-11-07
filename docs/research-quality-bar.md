# Quality bar — testable acceptance rules for AI video

Goal: convert "AI slop vs. professional film" into rules the pipeline can actually
measure. Every rule is `rule — how to measure — pass/fail threshold — source`.
Commands assume Windows `ffmpeg`/`ffprobe` on PATH, no GPU. Verify dates: research run 2026-11-03.

## 0. Baseline — what our pipeline measures TODAY
From `scripts/dailies-site.mjs` + `scripts/apex-check.mjs` and `verse-site/dailies.data.js`, the only
image facts produced per artefact are:
- `signalstats` → `YAVG` (mean luma 0-255) and `SATAVG` (mean saturation 0-~181), averaged over all frames.
- `dLuma` / `dSat` — percent change across the `finish` pass (e.g. last run: luma -6.51%, sat -9.64%).
- `ffprobe` — `codec_name`, `width`, `height`, `duration`, `bytes`.
- Master: `film01-finish-scene01.mp4`, h264 1920×1080, ~49.6 Mbps, aac. Web preview: scale 1280 wide, `libx264 crf=23`, `aac 128k`, `+faststart`.

There is **no** temporal-flicker gate, focus/sharpness gate, loudness (LUFS) gate, colour-space tag
gate, continuity check, A/V-sync check, or banding/blocking check. "succeeded" currently means
"ffmpeg produced a decodable file whose mean luma/sat moved" — not "looks real" and not "meets a
delivery spec". That gap is what this doc closes.

---

## 1. Named, observable AI defects → testable rules

Sources on the defect taxonomy: Nemo "7 artifacts" (https://www.nemovideo.com/blog/why-ai-videos-look-fake-how-to-fix),
Memeburn 2026 (https://memeburn.com/why-ai-videos-look-fake-in-2026-and-how-to-fix-them/),
InVideo plastic-skin cause (https://invideo.io/faq/why-do-ai-generated-videos-look-plasticky-and-fake-and/),
Kling drift causes — stateless generation, no persistent scene model, latent fluctuation, temporal
overfitting (https://kling.ai/blog/fix-ai-video-drift-consistency-guide),
VBench temporal-flicker = normalized mean absolute inter-frame error; dynamic-degree via RAFT flow;
imaging-quality via MUSIQ (https://vchitect.github.io/VBench-project/ , https://www.emergentmind.com/topics/vbench).

| # | Defect (reads as fake) | Cause | Testable rule | Measure (ffmpeg/Python, no GPU) | Pass / Fail |
|---|---|---|---|---|---|
| D1 | Temporal flicker / shimmer | frame-wise denoising without temporal coupling; lighting inconsistency per frame | shot must have low, spike-free inter-frame luma difference | `signalstats` `YDIF` (0-255) per frame, averaged; flag outliers | PASS: mean YDIF < ~8 for a static/locked shot, < ~15 with real motion, and no single frame > 3× clip mean. FAIL: sustained YDIF spikes → flicker. https://vchitect.github.io/VBench-project/ |
| D2 | Subject / identity drift (melting face, morphing earrings, rewriting logos) | model has no identity anchor / object permanence | subject appearance stays stable frame→frame | consecutive-frame SSIM, or Python `scikit-image` `structural_similarity` on down-sampled frames | PASS: median SSIM(frame_i, frame_i+1) > 0.90 in the subject region for a static shot. FAIL < 0.80 → morph. VBench "subject consistency" uses DINO (needs model, not ffmpeg). https://www.emergentmind.com/topics/vbench |
| D3 | Plastic / waxy skin, over-smoothed detail | diffusion denoises toward mean of retouched training data; pores erased | shot must retain high-frequency texture, and texture must not be zero | per-frame detail energy: `signalstats` won't do it; use Python `cv2.Laplacian(img,64).var()` (sharpness/variance-of-Laplacian) | PASS: Laplacian variance > ~15-30 on a skin/detail crop (has grain/pores). FAIL < ~5 → waxy, and add luminance grain. https://invideo.io/faq/why-do-ai-generated-videos-look-plasticky-and-fake-and/ |
| D4 | Breathing focus / soft-melt on faces | unstable denoise; no real lens | focus must be stable and subject sharp, background may be soft | `blurdetect` per-frame score (metadata `lavfi.blurdetect.blur`, higher=blurrier, 0-100) | PASS: subject region blur score low & std across frames < ~5 (no rack-breathe). FAIL: high blur score or large frame-to-frame swing. https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/blurdetect.html |
| D5 | Weightless motion / foot-slide, physics violations | models learn patterns not laws | motion is plausible: no teleport, consistent speed | optical-flow field must be coherent, not chaotic — Python `cv2.calcOpticalFlowFarneback`, compare to interpolated midpoint (VBench motion-smoothness idea) | PASS: no isolated frame with flow magnitude >> neighbours (jerk). FAIL: single-frame jump = teleport. Needs OpenCV, not ffmpeg. https://www.emergentmind.com/topics/vbench |
| D6 | Text / logo / sign corruption in frame | probabilistic sampling distorts glyphs | no on-screen text unless authored in post | manual/OCR gate (not ffmpeg) — flag any shot with legible-glyph attempts | FAIL if burned-in text is present from the generator; render all titles in the edit stage. https://www.nemovideo.com/blog/why-ai-videos-look-fake-how-to-fix |
| D7 | Inconsistent specular / shadow direction | per-frame relighting; no 3D awareness | shadow/highlight direction stable across a shot | colour-channel temporal diff: `signalstats` `UDIF`/`VDIF` alongside YDIF; spikes without motion = relight flicker | PASS: UDIF/VDIF low when YDIF low (a static frame shouldn't change colour). FAIL: chroma diff while subject still. https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/signalstats.html |
| D8 | Colour drift / auto white-balance "crawl" | denoising shifts statistics frame to frame | mean luma & mean chroma hold within a shot | `signalstats` YAVG + mean U/V (`YUAVG/YVAVG`) per frame; std over clip | PASS: YAVG std and mean-U/V std small within a locked shot. FAIL: monotonic crawl = drift. https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/signalstats.html |
| D9 | Inconsistent / absent grain, banding in gradients | over-smooth then re-encode 8-bit; flat gradients quantise | gradients must dither; no posterised bands | VMAF catches banding; 8-bit flat-field banding shows in signalstats bitdepth + Python flat-field step detector | PASS: delivered master tagged ≥10-bit pipeline for gradients, banding-free in sky. FAIL: visible contour bands. https://www.ffmpeg-micro.com/blog/check-your-encode-didn-t-wreck-the-video-vmaf-scores-with-ffmpeg |
| D10 | "Digital-only" clip — too clean / gimbal-perfect | no lens artefacts, no weave, no grain, no motion blur | graded shot carries filmic cues (see §5) | after `finish`, verify grain present (Laplacian variance up) and motion blur up (dLuma/dSat alone is NOT proof) | FAIL if finish only changed luma/sat and added no grain/blur — current pipeline's weakness. https://memeburn.com/why-ai-videos-look-fake-in-2026-and-how-to-fix-them/ |

---

## 2. Real dailies / review workflow — the actual gates

Sources: StudioBinder "Stages of Dailies" — pipeline runs **five stages**: (1) Ingest & Verify = media
copies off card **with a checksum proving every bit arrived**, corrupt clips quarantined; (2) Process =
framing/LUT extraction, split into **editorial proxies vs. creative-review packages**; (3) QC —
"someone sits in a dark room with a calibrated monitor and spot-checks": catches boom mics in frame,
crew/camera reflections, **banding**, colliding filters, sensor tearing; Netflix-branded requires ~12-hour
delivery. (https://www.studiobinder.com/blog/what-are-dailies-in-film/ ,
https://www.facebook.com/studiobinderapp/videos/dailies-qc-catches-boom-mics-in-frame-crew-reflections-banding-and-colliding-fil/1738185017268713/ ,
https://studiopartner.netflix.net/studio/branded-dailies-best-practices).
Frame.io review = time-coded **markers** on a version + approval state; role-gated sign-off
(https://frame.io/features/review-and-approval , https://workflow.frame.io/guide/).

| Gate | What it checks | Tool that carries it | Our testable rule |
|---|---|---|---|
| Ingest integrity | every bit arrived | checksum (MD5/xxHash, Silverstack/Yamani) | hash file after render; re-verify before publish. FAIL if hash mismatch or file undecodable (`ffprobe` returns error). |
| Focus / sharpness | subject in focus | calibrated monitor QC pass | `blurdetect` subject score threshold (§D4). |
| Exposure / legal levels | not crushed/clipped, in-range | scopes (waveform) | `signalstats` `stat=tout+vrep+brng`: out-of-range % (`BRNG`) ≈ 0; YMIN≥16, YMAX≤235 (limited range). |
| Continuity (cut-to-cut) | luma/colour/wardrobe matches across the cut | script supervisor notes; edit review | per-shot YAVG/mean-U/V must not jump more than a set Δ at each cut. |
| Colour | matches the approved look | colourist on Rec.709 display | master tagged bt709 (§3); grade locked version in Frame.io. |
| Sound sync | A/V aligned, present | slate/clap; sync map | audio stream present; `|video_dur − audio_dur|` < 1 frame; no total silence in a scene with dialogue. |
| Framing / lens match | same lens/height across coverage | ShotDeck / shot lists | aspect + resolution constant within a scene's coverage; letterbox/pillarbox consistent. |
| Review approval | human sign-off, not an agent verdict | Frame.io version + markers + "Approved" state | our `dailies.data.js` currently auto-marks "succeeded"; a real gate is a human/approved-state field, and `apex-check` already forbids agent-verified licences — same principle should apply to shot approval. |

---

## 3. Delivery spec — 2026 short-film / web-reel master

| Parameter | Recommended 2026 value | Why / source |
|---|---|---|
| Resolution | 1920×1080 minimum (match source AR; no up-convert lies). 4K only if source is genuinely 4K. | YouTube 1080p SDR standard (https://support.google.com/youtube/answer/1722171). |
| Frame rate | 24 fps (or 25 PAL) constant — `r_frame_rate == avg_frame_rate` (no VFR) | cinematic standard + 180° shutter basis (https://flashboards.yaroflasher.com/learn/cameras-and-capture/180-degree-shutter-rule/). |
| Colour primaries / transfer (SDR web master) | Rec.709 / BT.1886, gamma 2.4, reference white 100 nits; tags `color_primaries=bt709 transfer=bt709 matrix=bt709` | Rec.709 SDR is the only safe all-device target for a web reel (https://www.dfirentals.com/news/what-is-aces-color-management-acescct-explained). |
| HDR variant | HDR10 = SMPTE ST 2084 PQ, Rec.2020 primaries, **10-bit**, 4:2:0, static MaxCLL/MaxFALL, master 1000-4000 nits | (https://en.wikipedia.org/wiki/HDR10). |
| Working/colour mgmt | ACES with **ACEScct** as grading space, ODT to Rec.709 (and/or HDR10) — one timeline, multi-deliverable | Netflix recommends ACEScct over ACEScc generally (https://studiopartner.netflix.net/studio/branded-color-managed-workflow-in-resolve-for-aces). |
| Bit depth / chroma — master/intermediate | 10-bit, 4:2:2 (Netflix also accepts intra-frame 4:2:2+, 10-bit+) | (https://www.lensrentals.com/blog/2023/02/what-netflixs-approved-camera-attributes-mean-and-which-of-our-cameras-qualify/). |
| Bit depth / chroma — web deliver | 8-bit 4:2:0 (`pix_fmt=yuv420p`) for H.264/H.265 players | platform decode baseline (https://support.google.com/youtube/answer/1722171). |
| Codec / container | MP4 (`-movflags +faststart`), H.264 High profile (max compatibility) or H.265/HEVC (smaller). Audio AAC-LC. | YouTube upload spec. |
| Target bitrate | SDR 1080p: ~8 Mbps @24/30, 12-15 Mbps @60; 4K SDR 35-45 Mbps; HDR 1080p 10-15, 4K 44-56 (H.264)/66-85 (HEVC) Mbps | (https://swarmify.com/blog/what-you-need-to-know-about-the-video-bitrate/ , https://support.google.com/youtube/answer/1722171). |
| Loudness (integrated) | Web/streaming: **-14 LUFS** target (normalisation). Broadcast EBU R128: **-23 LUFS ±0.5**. US broadcast ATSC A/85: -24. Netflix: -27 LKFS dialogue-gated ±2 LU. | (https://en.wikipedia.org/wiki/EBU_R_128 , https://studiopartner.netflix.net/studio/branded-sound-mix-spec-and-best-practices). |
| True peak | ≤ **-2 dBTP** (Netflix/broadcast); keep ≤ -1 dBTP for web headroom | (https://production-expert.com/production-expert-1/how-to-optimise-an-audio-mix-for-delivery-to-netflix). |

ffprobe gate for the above:
`ffprobe -v error -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,color_primaries,color_transfer,color_space -show_entries format=duration,bit_rate -of json in.mp4`
PASS when tags match the row set for the chosen deliverable; FAIL on VFR (r≠avg), missing colour tags, or `pix_fmt` below 4:2:0.

---

## 4. Objective, computable metrics (ffmpeg / GStreamer / Python, NO GPU)

| Metric | Tool / command | Good range → verdict | source |
|---|---|---|---|
| Mean luma (exposure) | `ffmpeg -i in.mp4 -vf signalstats,metadata=print -f null -` → `YAVG` | 16-235 (limited, 8-bit). ~35-85 typical graded; near 0 = black/failed render. | (https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/signalstats.html) |
| Mean saturation | same, `SATAVG` (0-~181) | 20-55 for natural grade; <5 washed, >90 likely over-cooked AI. | signalstats doc |
| Clipping / out-of-range | `signalstats=stat=tout+vrep+brng` → `BRNG`, `TOUT` | out-of-range % ≈ 0. | signalstats doc |
| **Temporal flicker (GPU-free)** | `signalstats` `YDIF` (0-255), per frame | static shot mean < ~8; no frame > 3× mean. | signalstats doc / VBench (https://vchitect.github.io/VBench-project/) |
| Chroma drift | `signalstats` `UDIF`/`VDIF` | low while subject static. | signalstats doc |
| Sharpness / breathing focus | `blurdetect` → `lavfi.blurdetect.blur` (higher=blurred) | subject low; std across frames < ~5. | (https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/blurdetect.html) |
| Bit depth detected | `signalstats` `YBITDEPTH`/`VBITDEPTH` (0-16) | ≥10 for master pipeline; 8 in sky gradients → banding risk. | signalstats doc |
| Encode damage (needs ref) | `ffmpeg -i distorted.mp4 -i ref.mp4 -lavfi libvmaf=log_path=vmaf.json -f null -` | ≥90 premium; 80-93 good; 70-80 fair; <60 poor. VMAF also surfaces banding. | (https://www.forasoft.com/learn/video-quality/articles-vqm/vmaf-explained , https://www.ffmpeg-micro.com/blog/check-your-encode-didn-t-wreck-the-video-vmaf-scores-with-ffmpeg) |
| Structural fidelity (needs ref) | `-lavfi "[0][1]ssim=stats_file=s.log"` / `psnr` | SSIM >0.90 good, >0.95 excellent; PSNR >30 dB ok, >40 excellent. | (https://ffmpeg.org/ffmpeg-filters.html) |
| Loudness / true peak | `ffmpeg -i in -af loudnorm=print_format=json -f null -` → `input_i`,`input_tp`; or `-af ebur128` | input_i ≈ -14 LUFS web (-23 EBU); input_tp ≤ -1 dBTP. | (https://en.wikipedia.org/wiki/EBU_R_128) |
| Flow / motion magnitude | `mestimate=method=esa` (MV side-data) or Python `cv2.calcOpticalFlowFarneback` | coherent field; single-frame spikes = jerk/teleport. VBench dynamic-degree uses RAFT. | (https://ffmpeg.org/ffmpeg-filters.html , https://www.emergentmind.com/topics/vbench) |
| Texture retention (anti-plastic) | Python `cv2.Laplacian(g,64).var()` | >15-30 on skin crop = has detail/grain; <5 = waxy. | (https://invideo.io/faq/why-do-ai-generated-videos-look-plasticky-and-fake-and/) |
| Identity stability | Python `scikit-image structural_similarity` frame→frame, or DINO features (model) | median >0.90 static shot. | (https://vchitect.github.io/VBench-project/) |
| GStreamer equivalent | `gst-launch-1.0 decodebin ! videoconvert ! ...` — no direct VMAF/signalstats; use `qtmux`/`mpegtsmux` for mux and run ffmpeg for metrics. | treat GStreamer as transport, ffmpeg as the metric engine. | ffmpeg/VMAF docs above |

---

## 5. Finishing "film look" chain — physical meaning + defensible strength

Node order per colorists: distortion/vine → halation → grain → (grade last); analog chain is
negative-capture then print, halation & grain originate at negative stage
(https://www.strayspark.studio/blog/blender-film-look-halation-grain-gate-weave ,
https://pixeltoolspost.com/blogs/resolve/film-emulation-explained).

| Element | What it is physically | Defensible strength | Rule / how to check |
|---|---|---|---|
| Halation | light scatters in the film **base** → **red-weighted secondary exposure / red-orange glow** around and behind very bright highlights; NOT a uniform bloom filter | warm (R-biased) bleed only where luma near clip; subtle | FAIL if glow is white/grey or present in midtones; check chroma of highlight edges. (https://pixeltoolspost.com/blogs/resolve/film-emulation-explained , https://darkroom.co/blog/2025-12-08-bloom-halation) |
| Bloom | light bleeding into neighbouring pixels/lens (diffuse glow, dreamy) | low; distinct from halation (halation=red+edges, bloom=diffuse white) | keep bloom ≤ a few % so skin doesn't fog. (https://darkroom.co/blog/2025-12-08-bloom-halation) |
| Optical / film grain | silver-halide clumps; scales with exposure & density **per channel**, animated **frame to frame** (not a static overlay) | **luminance-weighted**, animated; ~ISO 200-400 equivalent for a modern negative; visible-but-not-snowy | FAIL if grain is a still overlay (temporal std ≈ 0 in dark regions) or if it adds chroma noise. Add subtle grain to fix plastic skin. (https://pixeltoolspost.com/blogs/resolve/film-emulation-explained , https://www.strayspark.studio/blog/blender-film-look-halation-grain-gate-weave , https://invideo.io/faq/why-do-ai-generated-videos-look-plasticky-and-fake-and/) |
| Gate weave / film breath | mechanical swing of strip through the gate → sub-pixel-to-few-pixel **frame translation + rotation**, plus tiny exposure/contrast/colour fluctuation | "much more delicate" than demos; Period=fluctuation speed, Translation/Rotation=amplitude, Impact=overall — keep amplitude sub-pixel | apply a couple px of drift; a totally rock-steady shot reads digital. FAIL gate if motion vector mean = 0 every frame. (https://www.dehancer.com/learn/articles/film-breath-gate-weave , https://www.holygrain.com/blog/what-is-film-gate-weave-in-cinema/) |
| Vignette / lens falloff | natural light falloff follows the **cosine-fourth (cos⁴) law**; at 15° off-axis ≈ 87% (≈ -0.2 EV), at 30° ≈ 56% (≈ -0.84 EV); optical vignetting adds more. Real cinema corners: **~0.5-1.5 EV** darker, worst wide open on fast/wide lenses. Falloff is **luminance (brightness) loss first**; strong lenses also **desaturate** toward edges — so use a luma-weighted, slightly chroma-desaturating vignette, not a flat grey multiply. AI footage is usually flat edge-to-edge → too clean reads fake | corner darkening in the **-0.5 to -1.5 EV** band (deeper for period/wide looks; never >2 EV for a normal lens) | check centre-to-corner mean-luma ratio in EV: `log2(corner_luma/center_luma)` should sit ≈ -0.5..-1.5. (https://en.wikipedia.org/wiki/Vignetting , https://www.reddigitalcinema.com/red-101/lens-vignetting , https://melies.co/cinematic-techniques/effects/vignette) |
| Highlight roll-off | negative characteristic-curve shoulder → soft knee, no hard clip | highlights compress before 235; protects skin from plastic | FAIL if clipped flat-top highlights (TOUT high with no shoulder). (https://pixeltoolspost.com/blogs/resolve/film-emulation-explained) |
| Sharpening discipline | only real detail should be crisp; sharpening is a **last, gentle** step — over-sharpen = halos, which the eye reads as "AI" | mild; no edge halos | FAIL if edge overshoot/halos. Use `blurdetect` to confirm no runaway ringing. (https://memeburn.com/why-ai-videos-look-fake-in-2026-and-how-to-fix-them/) |
| 180° shutter motion blur | exposure per frame = half the frame interval. 24 fps → 1/48 s. That is *why* film motion looks cinematic; too little blur = "video look", too much = smeary | shutter angle ≈ 180° → speed ≈ 1/(2·fps) | AI clips often have **no** true motion blur → "judder"/video look. Verify moving subjects show directional blur; the 180° rule is the acceptance basis. (https://flashboards.yaroflasher.com/learn/cameras-and-capture/180-degree-shutter-rule/ , https://www.dfirentals.com/news/what-is-shutter-angle-180-degree-rule) |

---

## 6. Claims we CANNOT yet prove (flagged for the owner)
1. **"A shot looks professional / not AI-slop"** — we only prove mean luma/sat moved (dLuma/dSat).
   No identity-consistency, hands, physics, or specular test is running. VBench-style checks (DINO,
   RAFT, MUSIQ) need a model/GPU, not ffmpeg alone.
2. **"The finish added a film look"** — a -6.5% luma / -9.6% sat delta does **not** prove halation,
   grain, vignette, or motion blur were applied. We add no grain/blur detection today, and no
   animated-grain or cos⁴-vignette measurement.
3. **Delivery spec compliance** — we never check colour tags (bt709), chroma/bit-depth
   (`pix_fmt`), constant frame-rate, loudness (LUFS/dBTP), or A/V duration match. `ffprobe` runs but
   only reads codec/W/H/duration/size.
4. **Continuity & lens/framing match across a cut** — no per-shot luma/chroma/framing comparison
   exists; the `dailies` compare is only same-second before/after finish within one scene.
5. **Sound** — `dialogue` stage is `no-driver`, `music` failed on licence; no sync or loudness gate.
   "Approved" state is currently machine-generated, not a human review marker.
6. **Text-in-frame / hand / face defects** — no automated gate; only fix guidance (avoid in generation,
   add titles in edit). Not measurable with ffmpeg alone.
