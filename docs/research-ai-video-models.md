# State of the art in AI-generated video — verified as of 2026-11-03

Research memo for Sovereign AI Film Verse (repo `D:\ApexEmpire\films\lllppp`).
Purpose: replace marketing-level vagueness with citable ground truth so a measurable build target can be set.

**Method.** All specs below were read from live pages on 2026-11-03 using web search + page fetch
(26 distinct queries/fetches). Vendor announcement pages, official API docs, model cards (Hugging Face),
GitHub repos and raw `LICENSE` files were preferred over aggregators. Where a number could only be found on
a secondary source, it is labelled `[2nd]`. Where sources conflict, both are shown.
**Every number carries its source URL.** Nothing here is from model training data.

**Confidence legend:** `[P]` = primary (vendor doc / repo / model card / raw license file). `[2nd]` = reputable secondary.
`[claim]` = vendor marketing claim, not independently measured. `[3p]` = third-party measurement or blind-vote data.

---

## 1. Model table — closed / API frontier

| Model (latest gen) | Max res | Max clip | fps | Native audio | Lip-sync | Multi-shot / char consistency | Camera control | Public API price | License / terms | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| **OpenAI Sora 2** | 1080p (API examples 480p–1080p) | 20 s (app); `n_seconds` param in API | n/s | Yes — synced dialogue + SFX | Yes (`[claim]`, launched as "synchronized dialogue") | "Cameo"/remix; `n_variants` 1–4 | Remix; video→video | **Discontinued.** Was per-second billing | **No longer available.** App/web killed 2026-04-26; Videos API + `sora-2`/`sora-2-pro` removed 2026-09-24, **no successor named** | https://openai.com/index/sora-2/ `[P]`; https://developers.openai.com/api/docs/deprecations `[P]`; https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation `[P]`; https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/video-generation `[P]` |
| **Google Veo 3.1** (generate / fast / lite) | 720p, 1080p, **4K** (4K only on `generate`) | **8 s**; extend +7 s ×20 → **141 s total** (extensions capped at 720p) | **24** | Yes, **always on** | Not documented | Up to **3 reference images**; image→video | Prompt-level only | `$0.40`/s (720p,1080p), `$0.60`/s (4K); Fast `$0.10`/`$0.12`/`$0.30`/s; Lite `$0.05`/`$0.08`/s | Closed API; output rights per Google ToS (not analysed here) | https://aistudio.google.com/docs/veo `[P]`; https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate `[P]`; https://benchlm.ai/blog/posts/ai-video-generation-models `[2nd]`; https://www.cloudzero.com/blog/veo-3-pricing/ `[2nd]` |
| **Google Gemini Omni 1.1 Flash** (Veo's successor in the Gemini app; announced 2026-05-19) | 720p base; `[2nd]` 4K | 4–10 s `[2nd]`; `[2nd]` extension to 40 s | n/s | Yes | Not documented | "any input" (image/audio/video/text) editing | Conversational editing | **$17.50 per 1M output tokens = 5,792 tokens/s of 720p → ≈$0.10/s** | Closed API | https://aistudio.google.com/docs/pricing `[P]`; https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/ `[P]` (date only); https://gemini.google/overview/video-generation/ `[P]`; https://unifically.com/blogs/gemini-omni-1.1-flash `[2nd]`; https://shattered.io/gemini-omni-1-1-flash-video-2026/ `[2nd]` |
| **Kuaishou Kling 4.0** (2026-10-15; `[2nd]` article dated 10-19) | **1080p + native 4K** (HDR "coming soon"); Flash variant tops at 720p | **30 s single pass** ("native 30s … reducing style and character drift caused by multi-segment stitching"); 2 min "coming soon" | n/s | **2-channel stereo** | **Yes, >10 languages** | **10 keyframe images**, Omni Reference **15 assets** (10 img + 5 vid, 7 elements) | Camera-angle tweaking without changing clip content | Official guide: **6–8 credits/s** no-audio 720p `[P]`; Kling 3.0 **$0.07–$0.335/s** by mode+audio `[2nd]`; V3 Turbo Pro **$0.14/s @1080p** `[2nd]`; Kling 4.0 **$0.126/s std 720p, $0.189/s pro 1080p, stereo included, 30 s max** `[2nd]`; cheapest verified route fal **$0.084/s** `[2nd]` | Closed API + consumer app | https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/ `[3p]`; https://kling.ai/document-api/guides/get-started/overview `[P]`; https://evolink.ai/blog/kling-3-o3-api-official-discount-pricing-developers `[2nd]`; https://kie.ai/kling-3-0 `[2nd]`; https://fal.ai/learn/tools/fastest-ai-video-generation-models `[2nd]`; https://unifically.com/blogs/kling-4.0 `[2nd]`; https://shhots.ai/blog/kling-ai-pricing/ `[2nd]`; https://klingai.com/text-to-video/ai-avatar `[P]` (CN: native 4K, motion control, first/last frame) |
| **ByteDance Seedance 2.5** (shipped 2026-07-31) | 1080p via API hosts; **4K** claimed in Dreamina UI `[claim]` | **30 s native** | n/s | Yes (audio-video joint) | Yes (better lip-sync than peers `[3p]`) | **Up to 50 combined references**; local in-scene editing | "director-level control" over performance, lighting, shadow, camera movement `[claim]` | Runway-hosted: **30 credits/s @720p, 68 credits/s @1080p**; Dreamina: **20 credits/s @480p, 30 @720p, 68 @1080p**; ≈**$0.0068/s @720p** under the Oct-21 promo; Replicate **$0.1028/s @480p, $0.2312/s @720p**; Seedance 2.0 Mini on fal **$0.0721/s @480p, $0.1547/s @720p, audio free** | Closed API | https://www.usefastlane.ai/models/seedance-2-5 `[2nd]`; https://seed.bytedance.com/seedance2_0 `[P]`; https://dreamina.capcut.com/seedance/seedance-2-5-pricing-2026 `[P]`; https://dreamina.capcut.com/seedance/seedance-2-5 `[P]`; https://camclo3d.com/blog/seedance-pricing `[2nd]`; https://cellcog.ai/blog/seedance-2-5-pricing/ `[2nd]`; https://docs.dev.runwayml.com/api-details/api_changelog/ `[P]`; https://fal.ai/learn/tools/fastest-ai-video-generation-models `[2nd]` |
| **Alibaba Wan 3.0** (GA **2026-08-24**) | 480P / 720P / **1080P** | **30 s in one generation** | n/s | Yes — but vendor doc says "audio texture … is still maturing" | Model Studio lists audio+lip for Wan2.5+ `[claim]` | **Omni-reference across nine file types**; consistency across characters, props, spaces, style | Prompt-level "how the camera should behave" | **$0.05/s (480P), $0.10/s (720P), $0.20/s (1080P)** — transparent per-second at GA | **API-only.** No `Wan2.5` or `Wan3.0` repo exists in the Wan-Video GitHub org; no weights published as of 2026-09-01 `[2nd]` | https://www.alibabacloud.com/blog/603505 `[P]`; https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ `[P]`; https://docs.dev.runwayml.com/api-details/api_changelog/ `[P]` (30 s + native audio, hosted 2026-08-26); https://github.com/Wan-Video (org repo list, checked 2026-11-03) `[P]`; https://wan27.org/blog/wan-2-5-open-source-guide `[2nd]`; https://www.seedance.tv/blog/wan-3-0-open-source-model `[2nd]` |
| **MiniMax Hailuo / H3** (API 2026-07-31; weights 2026-08-03) | **2K** (short edge 1440 px) via `H3-Regenerate-2K`; 768p native; 480p/768p/1080p tiers | **15 s** (output enum 4–15 s) | **24** | **Native stereo, 32 kHz** (dialogue, SFX, room tone in one pass) | **Yes — stable in 11 languages** | Ref2VA: up to **9 images + 3 video + 3 audio** references; instruction-based editing | Aspect ratios incl. 21:9 … 9:16; no explicit camera verbs | **$0.13/s @2K ≈ $7.80/min** (2.5–3× cheaper than rivals); H3 Max **$0.05/$0.08/$0.16 per s** at 480/768/1080; H3 Max **Turbo $0.025/$0.04/$0.08 per s**; Hailuo 2.3 **$0.025/s** (6 s @768p/1080p or 10 s @768p) | Closed API **and** open weights (see §2) | https://www.minimax.io/blog/minimax-h3 `[P]`; https://huggingface.co/MiniMaxAI/MiniMax-H3 `[P]`; https://hailuoai.video/tools/minimax-h3 `[P]`; https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0 `[2nd]`; https://fal.ai/learn/tools/fastest-ai-video-generation-models `[2nd]`; https://minimax-ai.chat/models/minimax-hailuo-23/ `[2nd]`; https://apimart.ai/blog/top-ai-video-models-2026-pricing-api-comparison `[2nd]`; https://miraflow.ai/blog/minimax-h3-open-weight-omni-modal-architecture-explained-2026 `[2nd]` |
| **Luma Ray3.2** (announced 2026-06-09) | 540p / 720p / **1080p** API; **4K** billed at 261 credits/s; **HDR + EXR output** | **20 s** clips; max V2V 20 s | n/s | **Not offered** on the API pricing page | No | **Up to 16 keyframes**; tracks **8 faces simultaneously** | Frame-by-frame directing (keyframes), Reframe | **$0.15–$1.20 per 5 s** (540p→1080p); **$0.45–$3.60 per 10 s**; V2V $0.72–$4.32; **HDR = 2× SDR, EXR = 3× SDR**; web credits: 24/s @480p, 51/s @720p, **126/s @1080p**, 261/s @4K (1080p 10 s = 1,200 credits) | Closed API | https://lumalabs.ai/news/introducing-ray-3-2 `[P]`; https://lumalabs.ai/api `[P]`; https://lumalabs.ai/pricing `[P]`; https://www.hooked.so/compare/luma-ai-pricing `[2nd]` |
| **Runway Gen-4.5** (released 2025-12-01) | **720p** | **2–10 s** | n/s | **No — picture only** | No | Accepts a first frame only; no last-frame or character references | Camera control (Runway's historical strength) | **12 credits/s = $0.12/s** ($0.60/5 s, $1.20/10 s); Gen-4 Turbo $0.05/s | Closed API | https://www.trezalabs.com/blog/runway-gen-4-5-api-pricing-through-a-pipeline `[2nd]`; https://apiframe.ai/guides/runway-api-guide `[2nd]`; https://camclo3d.com/blog/runway-pricing `[2nd]`; https://www.activepieces.com/blog/runway-api-pricing-per-second-for-every-video-model `[2nd]`; https://memu.pro/blog/runway-gen-4-5-creative-memory `[2nd]`; https://sharkfoto.com/ai/models/runway-gen-4.5/ `[2nd]` ("as of Aug 2026 no Gen-5 announced") |
| **Black Forest Labs FLUX 3 / FLUX 3 Max** (announced 2026-07-23) | **HD 720p → Full HD 1080p via upscaling** | **20 s** | n/s | Yes — audio created **alongside** the video | **"Precise lip-syncing"** | **"Multiple shots"**; also image + audio + **action-prediction** in one multimodal model | Prompt-level | Not published on the blog post (BFL API pricing not captured in this pass) | Closed API (weights **not** released for FLUX 3 Video) | https://bfl.ai/blog/flux-3 `[P]`; https://bfl.ai/blog/flux-3-video `[P]`; https://bfl.ai/models/flux-3-video `[P]`; https://rits.shanghai.nyu.edu/ai/black-forest-labs-unveils-flux-3-a-multimodal-image-video-audio-and-action-model `[2nd]` (date) |
| **xAI Grok Imagine Video 1.5 / 1.5 Lite** (2026-06-16) | 480p / 720p / **1080p** (Lite) | **1–15 s** (Lite); 6 s in ~25 s wall-clock (Fast) | n/s | Yes (synchronised) | Not documented | image→video primary | Not documented | Lite **$0.02 / $0.04 / $0.17 per clip**; `[2nd]` $0.02/s @480p; reseller $0.25/s | Closed API | https://x.ai/news/grok-imagine-video-1-5 `[P]`; https://venice.ai/models/grok-imagine-1-5-lite `[2nd]`; https://miraflow.ai/blog/grok-imagine-video-1-5-lite-explained-pricing-benchmarks-api-2026 `[2nd]`; https://www.edenai.co/expert-models/xai-grok-imagine-video-1-5 `[2nd]` |
| **Mistral** | — | — | — | — | — | — | — | — | **No video-generation model.** Mistral pricing is tokens only | https://mistral.ai/pricing/ `[P]` |
| **Other significant entrants (blind-vote ranked, Oct 2026)** | — | — | — | — | — | — | — | — | **Utopai X** (film-focused, built on MiniMax H3) `[P/P]`; **HeyGen Video 1** (avatar/talking-head); **P-Video-2-Pro**; **Agnes-Video-2.5**; **HappyHorse-1.1** (Alibaba Model Studio, 1080p/15 s/audio) | https://artificialanalysis.ai/video/leaderboard/text-to-video `[3p]`; https://www.utopaistudios.com/en/blog/utopai-x-ai-video-model-filmmaking `[P]`; https://x.com/ArtificialAnlys/status/2105343643251032304 `[P]`; https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ `[P]` |

### Model table — open-weight models (license is the load-bearing column)

| Model | Weights actually public? | License — exact terms | Res / dur / fps | Audio | Params | Real VRAM | Quality vs closed frontier | Source |
|---|---|---|---|---|---|---|---|---|
| **Wan 2.2** (Alibaba) | **Yes** — GitHub + HF, actively maintained (`Wan2.2` repo pushed 2026-09-21) | **Apache 2.0.** Repo `LICENSE.txt` is verbatim Apache 2.0; HF cards tag `license:apache-2.0`. **No revenue/MAU clause, no territory exclusion, no attribution-in-UI clause. Cleanest commercial license in the category.** | TI2V-5B: 720p (1280×704) @ **24 fps**; A14B: 480p & 720p; ~5 s clips | **No** | 5B dense (TI2V) / 14B MoE pairs (A14B) | TI2V-5B: **24 GB** officially (RTX 4090) using `--t5_cpu`, `--offload_model True`, `--convert_model_dtype`; ≥80 GB to run without offload. A14B: **"at least 80GB VRAM"** | Well below the 2026 frontier (top open models are ~2 generations behind Wan 3.0 / H3) — but still the default Apache-2.0 choice | https://github.com/Wan-Video/Wan2.2 `[P]`; https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/LICENSE.txt `[P]`; https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B `[P]`; https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B `[P]` |
| **Wan 2.1** | Yes (legacy) | Apache 2.0 (1.3B / 14B) | 480p/720p | No | 1.3B / 14B | 1.3B runs on **8 GB+**; GGUF lower | Obsolete vs 2026 frontier | https://github.com/Wan-Video/Wan2.1 `[P]`; https://willitrunai.com/blog/best-ai-video-generation-models-local `[2nd]` |
| **Wan 2.5** | **No weights.** Not in the org; only commercial API/Model Studio | n/a (hosted only) | 1080p, audio + lip-sync | Yes | n/a | n/a | Hosted only | https://wan27.org/blog/wan-2-5-open-source-guide `[2nd]`; https://www.glbgpt.com/hub/wan-2-5/ `[2nd]`; https://github.com/Wan-Video `[P]` (no 2.5 repo) |
| **Wan 3.0** | **No weights as of 2026-09-01**; pre-announced as Apache 2.0 but unconfirmed | Claimed Apache 2.0 `[2nd]`, **not yet verifiable** | 1080p, 30 s | Yes | n/a | "the real local ceiling right now is Wan2.2 TI2V-5B on 24GB, or 6GB with community quantization" `[2nd]` | **#1 on the Oct-2026 blind-vote T2V-with-audio board (Elo 1174)** — i.e. the current best model in the world is API-only | https://www.alibabacloud.com/blog/603505 `[P]`; https://www.seedance.tv/blog/wan-3-0-open-source-model `[2nd]`; https://www.atlascloud.ai/blog/tips/wan-3.0-vram-requirements `[2nd]`; https://artificialanalysis.ai/video/leaderboard/text-to-video `[3p]` |
| **MiniMax H3** | **Yes — 2026-08-03**, HF `MiniMaxAI/MiniMax-H3`. Only **H3-Base** is open; **`H3-Regenerate-2K` (2K refiner), `H3-Context-IR` (preprocessing/orchestration) and the sparse-attention implementation are NOT released** | **MiniMax H3 Community License.** Text verified from raw LICENSE: *"Applicable Territory means worldwide, excluding the Excluded Territories"*; *"Excluded Territories means the **European Union, the United Kingdom, the Republic of Korea and the United States of America**"*. Royalty-free inside the permitted territory; **separate written authorization required above $20M yearly revenue**; must **prominently display "MiniMax H3"** in the product UI; may not use outputs to train other models; patent litigation terminates the license. MiniMax's own FAQ: "not yet, not ever" on the territory ban; API is global. | 768p native → 2K via closed refiner; **4–15 s**; **24 fps**; stereo 32 kHz audio | **Yes, native stereo, jointly generated; lip-sync in 11 languages** | **33.1B dense** (≈13B sits in AdaLN branches, cacheable); text encoder is **Qwen3-VL-32B** | **INT8 pruned: 1 × 80 GB GPU. Full BF16: 4 × H100 (66.04 GB peak) or 4 × H200 (94.3 GB peak).** SGLang example uses `--num-gpus 4` | **#3 T2V (1162) and #4 I2V (1131) in Oct 2026** — the highest-ranked genuinely open-weight video model | https://huggingface.co/MiniMaxAI/MiniMax-H3 `[P]`; https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE `[P]`; https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/QA-about-License.md `[P]`; https://www.spheron.network/blog/deploy-minimax-h3-gpu-cloud/ `[2nd]`; https://www.runpod.io/blog/minimax-h3-the-open-weight-omni-modal-video-model-and-what-it-takes-to-run-it `[2nd]`; https://artificialanalysis.ai/video/leaderboard/text-to-video `[3p]` |
| **Lightricks LTX-2.5** | **Yes** — 22B distilled checkpoints on HF | **LTX-2.x Community License:** free commercial/production use **under $10M annual revenue**; **paid Commercial Use Agreement above that**; transfer of fine-tunes may require a paid license | 720p/1080p locally (W,H divisible by 32); **up to 20 s**; **4K via spatial+temporal upscalers**; `num_frames % 8 == 1`; **24 fps** | **Yes — synchronised audio (separate audio VAE)** | **22B** | Vendor system page asks **32 GB+ VRAM**; **16 GB minimum** for quantized distilled checkpoints. Variants: bf16, **fp8-cast + CPU offload**, **NVFP4** (Blackwell), **int8+convrot (ComfyUI only)** | Fast: 10 s i2v in **6.8 s** on 2× GB200. Ranked below H3/Wan 3.0 in blind votes; strong on camera moves | https://huggingface.co/Lightricks/LTX-2.5 `[P]`; https://github.com/Lightricks/LTX-2 `[P]`; https://www.dreampixelforge.com/blog/ltx-2-5 `[2nd]`; https://www.therundown.ai/tools/ltx-2 `[2nd]` |
| **Tencent HunyuanVideo 1.5** (2025-11-21) | Yes | **Tencent Hunyuan Community License Agreement** — raw LICENSE states *"THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"* | **480p–720p, 5–10 s, 24 fps**; **1080p via built-in super-resolution** | No (video only) | **8.3B** | **Peak memory 13.6 GB → single-GPU inference**; **14 GB minimum with model offloading**; FP8 GEMM supported | Lightweight open baseline; not in the Oct-2026 audio top-15 | https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5 `[P]`; https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-1.5/main/LICENSE `[P]`; https://arxiv.org/html/2511.18870 `[P]` |
| **Sand AI MAGI-2 Preview** | Yes — Apache 2.0 | **Apache 2.0** (HF tag `apache-2.0`), no added restriction surfaced on the card | Preview 512×896 → refiner **1088×1920**, rescalable to exactly 1080×1920; **10 s is the only supported duration** | **Yes — sound generated alongside video and muxed into the file** | **114B MoE, 6B active/token** | **8 × NVIDIA Hopper GPUs**; at 1080p the stages "don't fit on an 80GB card next to each other's activations" | **#15 T2V (1044)** — open-weight and top-15, but datacenter-only | https://huggingface.co/sand-ai/MAGI-2-preview `[P]`; https://www.modelscope.cn/models/sand-ai/MAGI-2-preview `[P]`; https://artificialanalysis.ai/video/leaderboard/text-to-video `[3p]` |
| **Utopai X / Hyperflow H3** | `Hyperflow H3` is flagged **"Open Weights"** on the I2V board; Utopai X is *"based on MiniMax H3"* | Not verified in this pass — check before depending on it | — | Yes | — | — | **Utopai X: #2 T2V (1168)**, I2V #2 (1147) | https://artificialanalysis.ai/video/leaderboard/image-to-video `[3p]`; https://x.com/ArtificialAnlys/status/2105343643251032304 `[P]`; https://www.utopaistudios.com/en/blog/introducing-the-all-new-pai-and-utopai-x `[P]` |

**Text-encoder footprint (the specific question):** the Wan stack uses **umt5-xxl**. Its **bf16 encoder weights alone are ~11.4 GB on disk**, which is why the official Wan launch code defaults to `--t5_cpu` (keep the encoder in system RAM). An **FP8 umt5-xxl is 6.3 GB** (`umt5-xxl-fp8.safetensors`), and FP8 encoders cut VRAM by **~4–6 GB vs FP16**; the maintained FP8 set states **16 GB minimum VRAM** with encoders + base model and **24 GB+ recommended** for higher res / longer clips.
Sources: https://medium.com/@hathibel/using-the-umt5-llm-8c5dde67f720 `[2nd]`; https://huggingface.co/wangkanai/wan22-fp8-encoders `[P]`; https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B `[P]`.
Note for context: MiniMax H3 swapped umt5 for a **Qwen3-VL-32B** text encoder — i.e. encoder cost, not the diffusion trunk, is now the main memory problem in open video. https://huggingface.co/MiniMaxAI/MiniMax-H3 `[P]`

---

## 2. What the frontier actually is (Nov 2026)

**2.1 The frontier is audio-video joint generation in a single pass, at 24 fps, in 15–30 s takes.**
Every model now ranked at the top of the independent blind-vote board is audio-native
(https://artificialanalysis.ai/video/leaderboard/text-to-video `[3p]` — "With Audio" category):
Wan 3.0 **1174**, Utopai X **1168**, MiniMax H3 768p **1162**, FLUX 3 Max **1157**, Seedance 2.5 **1156**,
HeyGen Video 1 **1156**, H3 Max **1148**, FLUX 3 **1143**, Seedance 2.0 **1139**, Gemini Omni Flash 1.1 **1130**,
P-Video-2-Pro **1127**, then a cliff to 1067/1060/1050/1044. Image-to-video (same board version, Oct 2026):
Seedance 2.5 **1157**, Utopai X **1147**, Seedance 2.0 **1137**, H3 **1131** (open weights), Hyperflow H3 **1124**
(Open Weights), HeyGen **1122**, P-Video-2-Pro **1119**, Wan 3.0 **1111**.
(https://artificialanalysis.ai/video/leaderboard/image-to-video `[3p]`)

**2.2 Single-pass take length has jumped from 8 s to 30 s — specifically to kill stitching.**
Veo 3.1 is still **8 s** (extendable +7 s ×20 to 141 s, but extensions only at 720p)
(https://aistudio.google.com/docs/veo `[P]`). Kling's own API doc sells **30 s in a single run** as the fix for
"style and character drift caused by multi-segment stitching" (https://kling.ai/document-api/guides/get-started/overview `[P]`),
and Kling 4.0 / Wan 3.0 / Seedance 2.5 all now ship **30 s single-pass**
(https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/ `[3p]`;
https://www.alibabacloud.com/blog/603505 `[P]`; https://www.usefastlane.ai/models/seedance-2-5 `[2nd]`).
2-minute extension is "coming soon" on Kling 4.0; HDR is also "coming soon" there.

**2.3 Clips are still assembled, not filmed.** Independent testing says coherence "degrades after 10 seconds"
for all models, with drifting lighting and textures, so real projects "require stitching multiple generated
segments" (https://www.aimagicx.com/blog/veo-3-vs-sora-2-vs-seedance-video-comparison-2026 `[3p]`).
The vendors' answer is references, not longer single shots: Kling 4.0 **10 keyframes / 15 reference assets**
(`[3p]` same URL), Seedance 2.5 **up to 50 references** (https://www.usefastlane.ai/models/seedance-2-5 `[2nd]`),
Wan 3.0 **omni-reference across nine file types** (https://www.alibabacloud.com/blog/603505 `[P]`),
Luma Ray3.2 **16 keyframes + 8 simultaneous face tracks** (https://lumalabs.ai/news/introducing-ray-3-2 `[P]`).

**2.4 Audio is generated with the picture — and lip-sync is now a spec line, not a research problem.**
Sora 2 launched on "synchronized dialogue and sound effects" (2025-09-30, https://openai.com/index/sora-2/ `[P]`) and is
now dead. Current: Veo 3.1 audio "always on" (`[P]` aistudio docs); Kling 4.0 **two-channel stereo + lip-sync in >10
languages**; MiniMax H3 **native stereo at 32 kHz, dialogue in 11 languages, generated in one pass**
(https://huggingface.co/MiniMaxAI/MiniMax-H3 `[P]`); FLUX 3 "native audio created alongside the video" with
"precise lip-syncing" (https://bfl.ai/blog/flux-3-video `[P]`); Wan 3.0 ships audio but its own doc admits
"audio texture … is still maturing" (https://www.alibabacloud.com/blog/603505 `[P]`).
Counterweight from third-party testing: Veo's sync is "only approximate … dialogue does not perfectly match lip
movements, and sound effects may be slightly early or late"; Seedance 2 better but "not broadcast-quality"
(https://www.aimagicx.com/blog/veo-3-vs-sora-2-vs-seedance-video-comparison-2026 `[3p]`).

**2.5 Objective numbers: blind votes are the only current, comparable metric. VBench and FVD are effectively stale.**
- Human-preference Elo: the Artificial Analysis AA-Video-T2V/I2V **v2.1** boards (Oct 2026) are the live numbers
  quoted above (`[3p]`).
- **VBench:** the maintained leaderboard/README still describes ~40 T2V models with its long-video board dated
  **09/2024**, and publishes **no scores for Wan 3.0, H3, Seedance 2.5 or FLUX 3**
  (https://github.com/Vchitect/VBench `[P]`; https://vchitect.github.io/VBench-project/ `[P]`).
  A CVPR-2026 workshop survey reports a "VBench leaderboard as of April 2026" and notes top models already sit at
  the ceiling on motion quality, i.e. the benchmark no longer discriminates
  (https://openaccess.thecvf.com/content/CVPR2026W/VGBE/papers/Safavigerdini_Generative_AI_Video_Evaluation_Survey_of_Metrics_Benchmarks_and_Trustworthiness_CVPRW_2026_paper.pdf `[P]` — PDF text not machine-extractable in this pass, so numbers are unverified here).
- **FVD:** no vendor in §1 publishes FVD; the only hard physics numbers found are from
  **PhyWorldBench v3** (2026-05-26), where the best of 12 models — Pika 2.0 — scores **0.262** overall on physical-law
  adherence, and the best open-source model (Wanx) scores **0.189**, with the authors concluding
  "substantial progress remains necessary". (https://arxiv.org/html/2507.13428v3 `[3p]`)
  Read that as: **even the frontier passes roughly a quarter of a physics test suite.**
- Vendor claims vs third-party: Seedance 2.0's "leading position" is measured on ByteDance's own
  **SeedVideoBench-2.0** (https://seed.bytedance.com/seedance2_0 `[P]/[claim]`). Kuaishou's native-4K/30 s claims are
  corroborated by Kling's own API doc, but an independent review of **Kling 4.0 vs Wan 3.0 vs Seedance 2.5** found it
  "holds its own but doesn't pull ahead", specifically weaker on **logical shot sequencing, physics and
  natural-sounding dialogue** (https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/ `[3p]`).
  Runway's "#1" claim for Gen-4.5 (Elo **1247**) was on the **Nov 30, 2025 no-audio** board; Gen-4.5 (720p, silent,
  2–10 s, first-frame only) is absent from the 2026 with-audio top 15
  (https://memu.pro/blog/runway-gen-4-5-creative-memory `[2nd]`; https://www.trezalabs.com/blog/runway-gen-4-5-api-pricing-through-a-pipeline `[2nd]`).
- Persistent failure modes (independent): hands — "in ten clips of a person gesturing, at least three will have a
  moment where fingers merge"; **on-screen text is unreliable — composite titles in post**; complex fluid/cloth
  physics and interpenetration still fail; medium shots are the facial "danger zone"
  (https://www.aimagicx.com/blog/veo-3-vs-sora-2-vs-seedance-video-comparison-2026 `[3p]`).

**2.6 The structural fact that matters most for us: OpenAI has left the market.** Sora's app died 2026-04-26 and the
Videos API + `sora-2`/`sora-2-pro` were removed 2026-09-24 with **no successor listed**
(https://developers.openai.com/api/docs/deprecations `[P]`; https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation `[P]`;
https://en.wikipedia.org/wiki/Sora_(text-to-video_model) `[2nd]`). Azure OpenAI's `sora-2` preview reportedly retires
2026-10-15 (https://benchlm.ai/blog/posts/ai-video-generation-models `[2nd]`), yet the Azure docs page still described
`sora-2` as an available preview model as of 2026-10-29 (https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/video-generation `[P]`)
— so treat any "Sora" reference in our own site copy as a dead dependency.

**2.7 Price reality at the frontier (per finished second).** Cheapest usable-with-audio tiers found:
Grok Imagine 1.5 Lite **$0.02/clip @480p**; H3 Max Turbo **$0.025/s @480p**, **$0.04/s @768p**;
Wan 3.0 **$0.10/s @720p, $0.20/s @1080p**; MiniMax H3 **$0.13/s @2K ≈ $7.80/min**;
Veo 3.1 Lite **$0.05–0.08/s**; Seedance 2.5 **$0.10/s @720p** (30 credits) rising to **$0.227/s @1080p** (68 credits);
Kling 4.0 **$0.126–$0.189/s**; Gemini Omni Flash **≈$0.10/s @720p**; Luma Ray3.2 **$0.15–$1.20 per 5 s**;
Runway Gen-4.5 **$0.12/s (silent)**. Third-party cost efficiency: H3 2K **$7.80/min** vs Kling 3.0 1080p
**$20.16/min** vs Seedance 2.0 1080p **$22.45/min** (https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0 `[2nd]`).
For an 8-second shot the spread is **$0.40 (Veo Lite 720p) → $4.80 (Veo 3.1 4K)**.

---

## 3. Deliverability: what a 2026 AI shot needs to survive a real film pipeline

| Need | Current best tool | Price | License | Source |
|---|---|---|---|---|
| **Native HDR / log-ish output from the generator** | **Luma Ray3.2**: HDR and **EXR** are first-class outputs | HDR **2× SDR**, HDR+EXR **3× SDR**; 1080p 10 s = 1,200 credits; 4K 261 credits/s | Closed API | https://lumalabs.ai/api `[P]`; https://lumalabs.ai/pricing `[P]`; https://www.hooked.so/compare/luma-ai-pricing `[2nd]` |
| **4K upscaling (local, pro)** | **Topaz Video** (Starlight/Proteus), up to 4K/8K, plus interpolation to 120 fps | **$299/yr Personal, $699/yr Pro**; **subscription-only since Oct 2025, no perpetual licenses for new users**; `[2nd]` desktop $59/mo, API credits $0.08–$0.10; cloud rendering costs extra credits | Commercial, proprietary; local render needs **RTX 30/40-series, 8 GB+ VRAM** for smooth 4K (Mac/AMD supported with model limits) | https://unifab.ai/resource/topaz-video-ai-review `[2nd]`; https://www.topazlabs.com/topaz-video `[P]`; https://www.forasoft.com/blog/article/ai-video-enhancement-tools `[2nd]`; https://morphed.app/blog/ai-video-upscaler `[2nd]` |
| **4K upscaling + frame-rate multiplication, free, local** | **NVIDIA Broadcast 2.3.0** — RTX Video upscaling to **4K** and **RTX Video Frame Generation to 4× fps**, now working on **video files**, not just webcams | **Free app** | Proprietary NVIDIA app; needs **RTX 3060 or better** | https://www.thefpsreview.com/2026-10-15/nvidia-broadcast-2-3-can-now-upscale-your-videos-to-4k-and-quadruple-their-frame-rate-if-you-have-the-right-rtx-card/ `[2nd]`; https://www.tweaktown.com/news/114077/nvidia-broadcast-2-3-0-adds-rtx-video-upscaling-and-frame-generation-to-video-files-and-webcams/index.html `[2nd]`; https://www.nxrte.com/zixun/72577.html `[2nd]` |
| **Programmatic upscale / realtime SR in a pipeline** | **NVIDIA RTX Video SDK / Maxine VFX SDK** (720p→1440p realtime SR; used as a post step after LTX) | **Free SDK download; production terms negotiated with NVIDIA** | Proprietary SDK; Turing-or-newer Tensor Cores; L40-class recommended for frame gen | https://developer.nvidia.com/rtx-video-sdk `[P]`; https://www.forasoft.com/blog/article/ai-video-enhancement-tools `[2nd]`; https://forums.developer.nvidia.com/t/nvvideoeffects-maxine-upscale-fully-occupies-my-rtx-gpu-during-video-upscaling-expected-behavior/371271 `[2nd]` |
| **Open-source upscale + de-noise + interpolation** | **Real-ESRGAN** (upscale), **RIFE** (24→48/60 fps interpolation), **Video2X** as a packaged pipeline; research-grade **SeedVR2 / FlashVSR** | Free | Real-ESRGAN **Apache 2.0** (per review; upstream is BSD-3); **RIFE MIT/BSD-3**; SeedVR2/FlashVSR **Apache-2.0 but need H100/A100-class GPUs for useful speed**; practical floor **8 GB VRAM** for a Real-ESRGAN+RIFE chain, and quality "lags commercial tools on tough footage" | https://www.promptquorum.com/power-local-llm/real-esrgan-ai-image-upscaler-review `[2nd]`; https://github.com/ishandutta2007/Awesome-AI-Video-Enhancement `[P]`; https://vanceai.com/video-upscaler/video2x-review/ `[2nd]`; https://unifab.ai/resource/open-source-video-upscaler `[2nd]`; https://morphed.app/blog/ai-video-upscaler `[2nd]`; https://www.forasoft.com/blog/article/ai-video-enhancement-tools `[2nd]` |
| **Per-shot grading, HDR mastering, grain management** | **DaVinci Resolve Studio** (HDR10+/Dolby Vision, temporal NR) | **$295 one-time perpetual** | Commercial per-seat | https://www.forasoft.com/blog/article/ai-video-enhancement-tools `[2nd]` |
| **Lab-grade de-noise / restore, billed per shot** | **Pixop** (SaaS "FILE" or self-hosted "Prime") | **≈$0.079 per gigapixel** (Super Resolution), UHD/HDR supported | Commercial | https://www.forasoft.com/blog/article/ai-video-enhancement-tools `[2nd]` |
| **Shutter / motion-blur realism (the 180° rule)** | Add real directional motion blur in post; **at 24 fps a 180° shutter = ~20.83 ms exposure** (1/48 s); at 25 fps, 180° = 1/50 s | ffmpeg `minterpolate`+`tblend`, or Boris BCC+ Motion Blur (commercial) | ffmpeg LGPL/GPL per build | https://detectvideo.ai/shutter-angle/ `[2nd]`; https://borisfx.com/videos/continuum-realistic-motion-blur-ai/ `[P]`; our own driver already emits `minterpolate=fps=48:mi_mode=mci… ,tblend=all_mode=average,fps=24000/1001` (`D:\ApexEmpire\films\lllppp\src\lib\apex\drivers\ffmpeg.ts:157`) |
| **Detection resistance caveat** | Blur/motion-blur is a **visual property, not a certificate** — it neither proves nor disproves synthetic origin | — | — | https://detectvideo.ai/shutter-angle/ `[2nd]` |

**Bottom line on deliverability.** Nobody in §1 ships a 4K HDR, 24 fps, shutter-correct, grain-matched master.
The two models with documented HDR/EXR paths are Luma Ray3.2 (native, surcharged) and Kling 4.0 ("HDR coming soon").
Everything else is: generate ≤1080p (or 2K) → AI-upscale to 4K → de-noise/de-block → add real motion blur →
grade → grain-match → master in an NLE. Also note 4K is often a **locked premium tier**: Veo 3.1 offers 4K only on
`generate` at $0.60/s and never on Lite; Kling Flash tops out at 720p; Wan 3.0's published ladder stops at 1080p.

---

## 4. What is reachable for a solo operator with 6 GB VRAM and no paid API budget

Verified, license-clean options at 6 GB, in order of usefulness:

1. **Wan 2.2 via community quantization.** The official 5B TI2V path wants **24 GB** (`--t5_cpu` + model offload +
   dtype conversion), and the 14B MoE variants want **80 GB+** (https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B `[P]`;
   https://github.com/Wan-Video/Wan2.2 `[P]`). But **WanGP** runs Wan 2.1/2.2 with GGUF quantization and states it runs
   select models on **4 GB of VRAM**, free for local use (https://github.com/deepbeepmeep/WanGP `[P]`), and a 2026
   vendor-independent survey states the practical local ceiling is "Wan2.2 TI2V-5B on 24GB, **or 6GB with community
   quantization**" (https://www.atlascloud.ai/blog/tips/wan-3.0-vram-requirements `[2nd]`).
   Expect **480p–720p, ~5 s, 24 fps, silent**. **License: Apache 2.0** — commercial use unrestricted, no attribution,
   no revenue cap, no territory ban (`LICENSE.txt` is verbatim Apache 2.0; HF `license:apache-2.0`)
   (https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/LICENSE.txt `[P]`).
2. **Wan 2.1 1.3B at 480p** — 8 GB+ officially, GGUF lower; same Apache 2.0 posture. Quality is two-plus generations
   behind (https://willitrunai.com/blog/best-ai-video-generation-models-local `[2nd]`; https://github.com/Wan-Video/Wan2.1 `[P]`).
3. **Realistic 2026-11 honest ceiling for a 6 GB card:** *silent, 480p–720p, 4–6 s, 24 fps, single-subject shots with
   genuine subject motion*, plus ffmpeg/Real-ESRGAN/RIFE to reach 1080p/24→48 fps. The umt5-xxl encoder is the reason:
   **11.4 GB bf16 / 6.3 GB fp8** — at 6 GB VRAM it **must** live in system RAM (`--t5_cpu`) or live on as a GGUF/CPU
   encoder (https://medium.com/@hathibel/using-the-umt5-llm-8c5dde67f720 `[2nd]`;
   https://huggingface.co/wangkanai/wan22-fp8-encoders `[P]`; https://www.modelscope.cn/models/chatpig/umt5xxl-encoder-gguf `[P]`).
4. **Not reachable at 6 GB, on evidence:** HunyuanVideo 1.5 (**13.6 GB peak**, 14 GB min with offload),
   LTX-2.5 (**16 GB min quantized, 32 GB asked**), MiniMax H3 (**1×80 GB INT8 / 4×H100 BF16**),
   MAGI-2 (8× Hopper). Sources as in §1 table.
5. **License landmines for the "free open model" pitch:** **MiniMax H3 weights are illegal to run in the EU, UK,
   Republic of Korea and the USA** (raw LICENSE, verbatim) regardless of their Apache-like permissiveness elsewhere, and
   require a visible "MiniMax H3" UI credit plus separate authorization above $20M revenue
   (https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE `[P]`). **HunyuanVideo 1.5 does not apply in the EU, UK
   or South Korea** (https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-1.5/main/LICENSE `[P]`).
   **LTX-2.5 is free only under $10M annual revenue** (https://huggingface.co/Lightricks/LTX-2.5 `[P]`).
   **Wan 2.2 (Apache 2.0) and MAGI-2 (Apache 2.0) are the only clean-unrestricted picks.**
6. **Zero-API-cost hybrid worth pricing:** LTX-2.5's API at **$0.09/s (720p) incl. audio** (open weights + open API),
   or Wan 3.0 at **$0.10/s (720p)**, buy a genuinely audio-native frontier shot for **~$0.50–0.80 per 5–8 s shot**
   (https://fal.ai/learn/tools/fastest-ai-video-generation-models `[2nd]`; https://www.alibabacloud.com/blog/603505 `[P]`).
   That is the cheapest honest path to a frontier-grade shot today; the "no paid API budget" constraint is what forces
   the silent-480p local tier.

---

## 5. Gap vs our pipeline (for the marketing claim, not for the reader)

Our current renderer is a **still-image Ken-Burns zoom-pan**: `scale=1920:1080` →
`zoompan=z='min(zoom+0.0012,1.12)':d=seconds*24:s=1920x1080:fps=24000/1001`, `libx264 -crf 20`, with an optional
`minterpolate`→48 fps + `tblend` shutter path (`D:\ApexEmpire\films\lllppp\src\lib\apex\drivers\ffmpeg.ts:105-160`).
Measured against §2:

| Axis | Frontier (Nov 2026) | Us today | Delta |
|---|---|---|---|
| Subject motion | Generated per-frame; multi-subject physics | **None** — camera moves, world does not | Existential |
| Duration | 15–30 s single pass | 24-frame-per-second zoom at ≤1.12×, arbitrary length | n/a (not a take) |
| Resolution | 1080p/2K/4K native | 1080p **upscaled from a still** | 1–2 tiers |
| fps | 24 native | 24000/1001 (NTSC 23.976) | minor, but 23.976 ≠ 24 for DCI |
| Audio | Native stereo, joint generation, 11+ language lip-sync | Silent (audio is a separate tool in our catalog) | Existential |
| Character continuity | 10–50 references, face tracking | Per-shot, no identity carry | 1 tier of craft |
| License/price per shot | $0.02–$0.23/s closed; Apache-2.0 local possible | ffmpeg, free | — |

**Biggest single gap:** we are not generating video at all. The frontier in Nov 2026 is a
**30-second, 24 fps, single-pass clip with synchronised stereo audio and lip-synced dialogue, conditioned on 10–50
reference images for identity/prop/style continuity**; we emit a **1080p camera move over a JPEG**.
Second-biggest: the word "frontier" is currently unfalsifiable in our copy while `Sora` references in it point to a
model that was removed from OpenAI's API on **2026-09-24**.

**Suggested measurable target (all achievable per §1/§4 evidence):**
- **T0 (this month, 6 GB, $0):** 720p, 24 fps, 4–6 s clips with real subject motion, silent, Wan 2.2 GGUF/Apache-2.0,
  umt5 in system RAM; acceptance test = 10 consecutive shots with no freeze-frame fallback and a labelled
  "motion present" metric on ≥8/10.
- **T1 (paid second at $0.10/s):** 5 s audio-native shot (Wan 3.0 720p = $0.50/shot; LTX-2.5 Fast 720p = $0.45/shot),
  delivered with generated dialogue, no separate audio pass.
- **T2 (deliverable master):** 1080p→4K upscaled + real 180° motion blur (~20.83 ms at 24 fps) + grain match +
  no on-screen text generated by the model (composite titles in post — the documented failure mode).
- Marketing language to retire: any "frontier"/"Sora-class"/"4K HDR native" phrasing until T2 is met, and all Sora
  references.

---

## 6. Sources index

Primary: https://aistudio.google.com/docs/veo · https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate ·
https://aistudio.google.com/docs/pricing · https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/ ·
https://gemini.google/overview/video-generation/ · https://developers.openai.com/api/docs/deprecations ·
https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation · https://openai.com/index/sora-2/ ·
https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/video-generation ·
https://kling.ai/document-api/guides/get-started/overview · https://kling.ai/document-api/pricing/base/video (JS-only, unreadable) ·
https://klingai.com/text-to-video/ai-avatar · https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/ ·
https://seed.bytedance.com/seedance2_0 · https://dreamina.capcut.com/seedance/seedance-2-5 ·
https://dreamina.capcut.com/seedance/seedance-2-5-pricing-2026 · https://www.alibabacloud.com/blog/603505 ·
https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ · https://github.com/Wan-Video/Wan2.2 ·
https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/LICENSE.txt · https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B ·
https://huggingface.co/wangkanai/wan22-fp8-encoders · https://github.com/Wan-Video/Wan2.1 ·
https://github.com/deepbeepmeep/WanGP · https://huggingface.co/MiniMaxAI/MiniMax-H3 ·
https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE · https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/QA-about-License.md ·
https://www.minimax.io/blog/minimax-h3 · https://hailuoai.video/tools/minimax-h3 · https://huggingface.co/Lightricks/LTX-2.5 ·
https://github.com/Lightricks/LTX-2 · https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5 ·
https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-1.5/main/LICENSE · https://arxiv.org/html/2511.18870 ·
https://huggingface.co/sand-ai/MAGI-2-preview · https://www.modelscope.cn/models/sand-ai/MAGI-2-preview ·
https://lumalabs.ai/news/introducing-ray-3-2 · https://lumalabs.ai/api · https://lumalabs.ai/pricing · https://lumalabs.ai/ray ·
https://docs.dev.runwayml.com/api-details/api_changelog/ · https://bfl.ai/blog/flux-3 · https://bfl.ai/blog/flux-3-video ·
https://bfl.ai/models/flux-3-video · https://x.ai/news/grok-imagine-video-1-5 · https://mistral.ai/pricing/ ·
https://developer.nvidia.com/rtx-video-sdk · https://www.topazlabs.com/topaz-video · https://www.utopaistudios.com/en/blog/utopai-x-ai-video-model-filmmaking ·
https://www.utopaistudios.com/en/blog/introducing-the-all-new-pai-and-utopai-x · https://x.com/ArtificialAnlys/status/2105343643251032304

Third-party measurement / leaderboards: https://artificialanalysis.ai/video/leaderboard/text-to-video ·
https://artificialanalysis.ai/video/leaderboard/image-to-video · https://artificialanalysis.ai/video/arena ·
https://arxiv.org/html/2507.13428v3 (PhyWorldBench) · https://github.com/Vchitect/VBench ·
https://vchitect.github.io/VBench-project/ · https://arxiv.org/html/2503.21755v1 (VBench-2.0) ·
https://openaccess.thecvf.com/content/CVPR2026W/VGBE/papers/Safavigerdini_Generative_AI_Video_Evaluation_Survey_of_Metrics_Benchmarks_and_Trustworthiness_CVPRW_2026_paper.pdf ·
https://www.aimagicx.com/blog/veo-3-vs-sora-2-vs-seedance-video-comparison-2026 · https://detectvideo.ai/shutter-angle/ ·
https://fal.ai/learn/tools/fastest-ai-video-generation-models · https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0 ·
https://fal.ai/pricing · https://kie.ai/kling-3-0 · https://kie.ai/blog/seedance-2-5-pricing

Secondary pricing/VRAM corroboration: https://benchlm.ai/blog/posts/ai-video-generation-models ·
https://www.cloudzero.com/blog/veo-3-pricing/ · https://camclo3d.com/blog/seedance-pricing · https://camclo3d.com/blog/runway-pricing ·
https://cellcog.ai/blog/seedance-2-5-pricing/ · https://unifically.com/blogs/kling-4.0 · https://unifically.com/blogs/gemini-omni-1.1-flash ·
https://apiframe.ai/guides/runway-api-guide · https://apiframe.ai/guides/luma-api-guide ·
https://www.trezalabs.com/blog/runway-gen-4-5-api-pricing-through-a-pipeline · https://www.activepieces.com/blog/runway-api-pricing-per-second-for-every-video-model ·
https://sharkfoto.com/ai/models/runway-gen-4.5/ · https://memu.pro/blog/runway-gen-4-5-creative-memory ·
https://www.rizzgen.ai/blogs/runway-kling-veo-ltx-wan-seedance-comparison · https://shhots.ai/blog/kling-ai-pricing/ ·
https://evolink.ai/blog/kling-3-o3-api-official-discount-pricing-developers · https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0 ·
https://www.spheron.network/blog/deploy-minimax-h3-gpu-cloud/ · https://www.runpod.io/blog/minimax-h3-the-open-weight-omni-modal-video-model-and-what-it-takes-to-run-it ·
https://miraflow.ai/blog/minimax-h3-open-weight-omni-modal-architecture-explained-2026 · https://minimax-ai.chat/models/minimax-hailuo-23/ ·
https://apimart.ai/blog/top-ai-video-models-2026-pricing-api-comparison · https://www.usefastlane.ai/models/seedance-2-5 ·
https://www.usefastlane.ai/models/kling-4-0 · https://wan27.org/blog/wan-2-5-open-source-guide ·
https://www.seedance.tv/blog/wan-3-0-open-source-model · https://www.atlascloud.ai/blog/tips/wan-3.0-vram-requirements ·
https://willitrunai.com/blog/wan-2-2-vram-requirements · https://willitrunai.com/blog/best-ai-video-generation-models-local ·
https://www.dreampixelforge.com/blog/ltx-2-5 · https://www.therundown.ai/tools/ltx-2 · https://venice.ai/models/grok-imagine-1-5-lite ·
https://www.hooked.so/compare/luma-ai-pricing · https://unifab.ai/resource/topaz-video-ai-review ·
https://www.forasoft.com/blog/article/ai-video-enhancement-tools · https://morphed.app/blog/ai-video-upscaler ·
https://vanceai.com/video-upscaler/video2x-review/ · https://www.promptquorum.com/power-local-llm/real-esrgan-ai-image-upscaler-review ·
https://github.com/ishandutta2007/Awesome-AI-Video-Enhancement · https://medium.com/@hathibel/using-the-umt5-llm-8c5dde67f720 ·
https://www.modelscope.cn/models/chatpig/umt5xxl-encoder-gguf · https://www.thefpsreview.com/2026-10-15/nvidia-broadcast-2-3-can-now-upscale-your-videos-to-4k-and-quadruple-their-frame-rate-if-you-have-the-right-rtx-card/ ·
https://www.tweaktown.com/news/114077/nvidia-broadcast-2-3-0-adds-rtx-video-upscaling-and-frame-generation-to-video-files-and-webcams/index.html ·
https://www.nxrte.com/zixun/72577.html · https://borisfx.com/videos/continuum-realistic-motion-blur-ai/ ·
https://en.wikipedia.org/wiki/Sora_(text-to-video_model) · https://www.hivenet.com/post/wan-2-2-cloud-gpu-comfyui ·
https://localaimaster.com/blog/wan-vram-requirements-by-gpu · https://localaimaster.com/blog/hunyuan-video-guide ·
https://fuser.studio/articles/best-open-source-video-models · https://ltx.io/blog/open-source-video-generation-models-guide ·
https://www.turingpost.com/p/6-opensource-video-generation-models · https://lumalabs.ai/news/introducing-ray-3-2 ·
https://www.usefastlane.ai/models/kling-4-0 · https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/

**Known gaps in this research pass (unverified, do not cite in marketing):** Kling's official API pricing pages are
JS-rendered and returned no text (https://kling.ai/document-api/pricing/base/video); Runway does not publish an fps or
4K number for Gen-4.5; BFL publishes no per-second price for FLUX 3 Video on the launch post; no vendor publishes FVD,
and VBench has no 2026-frontier entries; Utopai/Hyperflow/Agnes/P-Video licenses were not read.
