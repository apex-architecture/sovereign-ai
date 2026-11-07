/**
 * Absorbed verbatim from docs/engine-survey-caption-qc-deliver.md — 26 engine rows, one per tool the survey measured.
 * Re-run: node scripts/absorb-survey.mjs caption-qc-deliver
 * Nothing in this file was written from memory; every null in it means the figure was never found.
 */

import type { Engine } from "./contract.ts";

const MEASURED = "2026-11-04";

export const SURVEY_CAPTION_QC_DELIVER: Engine[] = [
  // ==================== subtitles: open weights ====================
  {
    id: "whisper-large-v3",
    name: "OpenAI Whisper large-v3",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://github.com/openai/whisper",
    sourceRepository: "https://github.com/openai/whisper",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/openai/whisper/main/LICENSE",
      excludedTerritories: [],
      // Code is MIT; the checkpoint carries its own tag on the model card.
      revenueClause:
        "code MIT, no revenue clause; weights tagged license: apache-2.0 in the model-card metadata of https://huggingface.co/openai/whisper-large-v3 (earlier Whisper checkpoints were CC-BY-4.0)",
      attested: "machine",
    },
    released: "2025-06-26",
    releasedSource: "https://github.com/openai/whisper/releases/tag/v20250625",
    ceiling: {
      maxEdge: null, // audio only
      maxSeconds: null, // one transcribe() call takes a whole file; the model window itself is a fixed 30 s (N_SAMPLES = 480000 in whisper/audio.py)
      fps: 16000, // whisper/audio.py: SAMPLE_RATE = 16000
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: 10, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource:
      "free open-weights CLI: runs on the creator's own machine, the cost is their electricity (README table lists large at ~10 GB VRAM required)",
    board: null, // no blind-vote board for ASR found in this pass; vendor WER charts are not a board
    driver: "drivable",
    fits:
      "The reference dictation engine: 98 languages, segment-level timestamps only (no native word timing, which is why WhisperX/faster-whisper exist). Accuracy is published as per-language WER/CER charts in the README and Appendix D of the paper, not as one scalar, so it cannot be gated on a single number.",
    measuredAt: MEASURED,
  },
  {
    id: "faster-whisper",
    name: "faster-whisper (CTranslate2 Whisper)",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://github.com/SYSTRAN/faster-whisper",
    sourceRepository: "https://github.com/SYSTRAN/faster-whisper",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/SYSTRAN/faster-whisper/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (MIT); it re-uses the Whisper checkpoint licence for the weights",
      attested: "machine",
    },
    released: "2025-10-31",
    releasedSource: "https://github.com/SYSTRAN/faster-whisper/releases/tag/v1.2.1",
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // whole-file transcription with integrated Silero VAD; 30 s model window underneath
      fps: 16000, // same front-end as Whisper
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: 3, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource:
      "free CLI on the creator's machine; the repo README measures large-v2 GPU runs at 2926 MB int8 / 4525 MB fp16 on a 13-minute clip",
    board: null,
    driver: "drivable",
    fits:
      "The laptop body's default: word_timestamps=True is documented and prints [start -> end] per word, which is exactly what a burned-subtitle pass needs; same 98-language coverage as the Whisper checkpoint it loads, up to ~4x faster at equal accuracy (vendor measurement).",
    measuredAt: MEASURED,
  },
  {
    id: "whisperx",
    name: "WhisperX (aligned transcription + diarization)",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://github.com/m-bain/whisperX",
    sourceRepository: "https://github.com/m-bain/whisperX",
    licence: {
      spdx: "BSD-2-Clause",
      evidenceUrl: "https://raw.githubusercontent.com/m-bain/whisperX/main/LICENSE",
      excludedTerritories: [],
      revenueClause:
        "none for this code (BSD-2), but the diarization path pulls pyannote/speaker-diarization-community-1 (CC-BY-4.0, requires a Hugging Face token and user agreement) and the aligner pulls wav2vec2 checkpoints of their own licences",
      attested: "machine",
    },
    released: "2026-06-26",
    releasedSource: "https://github.com/m-bain/whisperX/releases/tag/3.8.7rc1", // latest tag is a release candidate; previous stable v3.8.6 2026-05-25
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // batched whole-file pipeline
      fps: 16000, // Whisper front end
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: 8, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI on the creator's machine (README states <8 GB GPU memory for large-v2 at beam_size=5)",
    board: null,
    driver: "drivable",
    fits:
      "Word-level timestamps by forced phoneme alignment, not by the ASR head — this is the row to pick when the subtitle timing itself is the deliverable. Ready-made aligners for en/fr/de/es/it (torchaudio) plus a long per-language list of wav2vec2 XLS-R checkpoints in whisperx/alignment.py; other languages need a tested phoneme model. Vendor-quoted 70x realtime with large-v2.",
    measuredAt: MEASURED,
  },
  {
    id: "whisper-cpp",
    name: "whisper.cpp (GGML Whisper, CPU/Metal)",
    stage: "subtitles",
    kind: "cli",
    vendorUrl: "https://github.com/ggml-org/whisper.cpp",
    sourceRepository: "https://github.com/ggml-org/whisper.cpp",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (MIT); quantized checkpoints inherit the Whisper weight licence",
      attested: "machine",
    },
    released: "2026-10-07",
    releasedSource: "https://github.com/ggml-org/whisper.cpp/releases/tag/v1.9.5",
    ceiling: {
      maxEdge: null,
      maxSeconds: null,
      fps: 16000, // same Whisper front end
      nativeAudio: true,
      lipSync: null,
    },
    // CPU/Metal-first build; no published VRAM floor, quantized models run in system RAM.
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI on the creator's machine; runs without a GPU, so the bill is their electricity",
    board: null,
    driver: "drivable",
    fits:
      "The no-GPU answer: one binary, quantized models, the machine that already cut the picture does the transcript. Word-level timestamp support was not re-verified from the docs in this pass (null claim rather than a guess).",
    measuredAt: MEASURED,
  },
  {
    id: "qwen3-asr-1.7b",
    name: "Qwen3-ASR-1.7B (+ Qwen3-ForcedAligner-0.6B)",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://huggingface.co/Qwen/Qwen3-ASR-1.7B",
    sourceRepository: "https://github.com/QwenLM/Qwen3-ASR",
    licence: {
      spdx: "Apache-2.0",
      evidenceUrl: "https://huggingface.co/Qwen/Qwen3-ASR-1.7B", // model-card metadata: license: apache-2.0
      excludedTerritories: [],
      revenueClause: "none found in the card's licence tag; no territory exclusion",
      attested: "machine",
    },
    released: "2026-01-30",
    releasedSource: "https://huggingface.co/Qwen/Qwen3-ASR-1.7B", // card lastModified; the GitHub repo publishes no release tags
    ceiling: {
      maxEdge: null,
      maxSeconds: 300, // the bundled forced aligner predicts timestamps inside up to 5 minutes of speech; ASR itself documents long-audio support
      fps: 16000, // README streaming demo resamples microphone audio to 16,000 Hz
      nativeAudio: true,
      lipSync: null,
    },
    // 1.7B seq2seq audio model; the card gives no VRAM floor, only RAM/vLLM guidance.
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu", "local-comfy"] },
    priceUsdPerSecond: 0,
    priceSource: "free weights; a vLLM server on a laptop GPU or a rented pod",
    board: null,
    driver: "drivable",
    fits:
      "The strongest open-weights candidate in this pass: 30 languages + 22 Chinese dialects (52 covered), language ID in the same pass, streaming or offline from one checkpoint, and — the part the subtitle stage actually needs — word/character-level timestamps from Qwen3-ForcedAligner-0.6B. Its own README table puts 1.7B at LibriSpeech 1.63/3.38 WER (clean/other) against Whisper-large-v3 at 1.51/3.97: vendor-run, so it ranks behind an independent number, not in front of one.",
    measuredAt: MEASURED,
  },
  {
    id: "nvidia-parakeet-tdt-0.6b-v3",
    name: "NVIDIA Parakeet-TDT 0.6B v3 (NeMo)",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3",
    sourceRepository: "https://github.com/NVIDIA-NeMo/Speech",
    licence: {
      spdx: "CC-BY-4.0",
      evidenceUrl: "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3", // model-card metadata: license: cc-by-4.0
      excludedTerritories: [],
      revenueClause: "attribution-only; commercially usable, no territory ban; the NeMo toolkit code is Apache-2.0 (raw.githubusercontent.com/NVIDIA/NeMo/main/LICENSE)",
      attested: "machine",
    },
    released: "2026-08-05",
    releasedSource: "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3", // card lastModified; NeMo Speech v3.0.0 tagged 2026-08-07
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // long-form supported through the NeMo inference pipeline; no published single-pass cap
      fps: 16000, // card: "Input Type(s): 16kHz Audio"
      nativeAudio: true,
      lipSync: null,
    },
    // 600M parameters; NeMo publishes no VRAM floor for this checkpoint.
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free weights, CC-BY attribution; self-hosted cost is the GPU hour",
    board: null,
    driver: "drivable",
    fits:
      "The per-language WER table on the card is the most complete in this cluster: GigaSpeech 9.59, AMI 11.31, Earnings-22 11.42, tedlium-v3 2.75, SPGI 3.97, Vox Populi 6.14, LibriSpeech entries 1.93 and 3.59, plus FLEURS per language (en 4.85, es 3.45, de 5.04, fr 5.15, it 3.00, pt 4.76, ru 3.00 as listed). 25 languages (en + 24 European). All of them vendor-run. Word-level timestamps are not claimed on the card — null, not a guess.",
    measuredAt: MEASURED,
  },
  {
    id: "moonshine",
    name: "Moonshine (Moonshine Voice)",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://github.com/moonshine-ai/moonshine",
    sourceRepository: "https://github.com/moonshine-ai/moonshine",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE",
      excludedTerritories: [],
      revenueClause:
        "code MIT and models MIT by default at every size/language, EXCEPT the legacy non-streaming non-English models, which stay under the non-commercial Moonshine Community License (enumerated in the repo LICENSE) — those fail a client/redistribute gate",
      attested: "machine",
    },
    released: "2026-10-02",
    releasedSource: "https://github.com/moonshine-ai/moonshine/releases/tag/v0.1.6",
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // streaming-by-design; no single-pass cap published in the card read here
      // Input sample rate not stated in the card/README text fetched in this pass.
      fps: null,
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free MIT weights; designed for CPU/embedded (Moonshine Micro runs in ~470 KB RAM on an RP2350)",
    board: null,
    driver: "drivable",
    fits:
      "For the machine with no GPU at all: tiny 27M / base 61M English-only checkpoints, MIT on both code and models, built for low-latency streaming (it does work while the speaker is still talking). English-only, so it is a scratch-transcript engine, not the localisation path. The card cites the HF open ASR leaderboard for its accuracy claims; that is a vendor-referenced board, not a blind vote.",
    measuredAt: MEASURED,
  },
  // ==================== subtitles: alignment, translation, caption files ====================
  {
    id: "mfa",
    name: "Montreal Forced Aligner 3.x",
    stage: "subtitles",
    kind: "cli",
    vendorUrl: "http://montreal-forced-aligner.readthedocs.io",
    sourceRepository: "https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/LICENSE",
      excludedTerritories: [],
      revenueClause:
        "none for the aligner itself (MIT); acoustic models and dictionaries are downloaded separately and carry their own terms",
      attested: "machine",
    },
    released: "2026-10-08",
    releasedSource: "https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner/releases/tag/3.4.3",
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // corpus-scale alignment job, no single-pass cap published
      fps: null, // resamples internally; no rate stated in the read
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI (Kaldi-based), CPU work on the creator's machine",
    board: null,
    driver: "drivable",
    fits:
      "Alignment as a separate, checkable step: it takes a transcript plus audio and returns time-aligned segments, so it will time a script you already approved rather than trusting what the ASR heard. That is the honest way to burn subtitles onto a fixed cut. It needs a trained acoustic model per language, so setup cost is real.",
    measuredAt: MEASURED,
  },
  {
    id: "nllb-200-distilled-600m",
    name: "Meta NLLB-200 Distilled 600M",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://huggingface.co/facebook/nllb-200-distilled-600m",
    sourceRepository: "https://github.com/facebookresearch/fairseq",
    licence: {
      spdx: "CC-BY-NC-4.0",
      evidenceUrl: "https://huggingface.co/facebook/nllb-200-distilled-600m", // card: "License: CC-BY-NC", tag license: cc-by-nc-4.0
      excludedTerritories: [],
      revenueClause:
        "NON-COMMERCIAL: CC-BY-NC-4.0 on the weights blocks any commercial or client work; the fairseq code is MIT, which does not cure the weights. The licence gate refuses this for intent=client|redistribute.",
      attested: "machine",
    },
    released: "2024-02-14",
    releasedSource: "https://huggingface.co/facebook/nllb-200-distilled-600m", // card lastModified; fairseq's last code release is v0.12.3 (2022-10-17)
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // text in, text out: no audio, no duration cap; per-request sentence length is the limit
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free for non-commercial use on the creator's machine; a paid licence path is not published on the card",
    board: null,
    driver: "needs-licence-read",
    fits:
      "200 languages of subtitle-text translation with BLEU/spBLEU/chrF++ published on the card — the widest free localisation coverage in the index, and the one the licence gate must refuse for any client or redistribution job because the weights are NC.",
    measuredAt: MEASURED,
  },
  {
    id: "subtitle-edit",
    name: "Subtitle Edit",
    stage: "subtitles",
    kind: "app",
    vendorUrl: "https://subtitleedit.github.io/subtitleedit/",
    sourceRepository: "https://github.com/SubtitleEdit/subtitleedit",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/SubtitleEdit/subtitleedit/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (MIT)",
      attested: "machine",
    },
    released: "2026-11-04",
    releasedSource: "https://github.com/SubtitleEdit/subtitleedit/releases/tag/v5.4.0-rc3", // newest tag is an RC; the 5.3.x stable line is what to ship
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free MIT app; the burn-in pass runs FFmpeg underneath, so the cost is the creator's machine",
    board: null,
    driver: "drivable",
    fits:
      "The human-in-the-loop caption tool and the format hub: the docs confirm SubRip and WebVTT support, a burn-in-subtitles feature, and a command-line converter (seconv), so the platform can run it headlessly and still let a person fix the wording before delivery. No ML weights here, so no WER and no timestamps of its own.",
    measuredAt: MEASURED,
  },
  {
    id: "ffmpeg-subtitles-libass",
    name: "FFmpeg subtitles filter (libass burn-in)",
    stage: "subtitles",
    kind: "cli",
    vendorUrl: "https://ffmpeg.org/ffmpeg-filters.html#subtitles",
    sourceRepository: "https://github.com/FFmpeg/FFmpeg",
    licence: {
      spdx: "LGPL-2.1-or-later",
      evidenceUrl: "https://git.ffmpeg.org/gitweb/ffmpeg.git/blob_plain/HEAD:/COPYING.LGPLv2.1",
      excludedTerritories: [],
      revenueClause:
        "none; the filter needs a build configured --enable-libass (libass is ISC: raw.githubusercontent.com/libass/libass/master/COPYING) and the build turns GPL-2.0-or-later if configured --enable-gpl",
      attested: "machine",
    },
    released: "2026-09-18",
    releasedSource: "https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2", // ffmpeg.org/download.html offers ffmpeg-9.0.2 as current
    ceiling: {
      maxEdge: null, // passes through whatever the decoder takes
      maxSeconds: null,
      fps: null, // frame-rate agnostic
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI; burns on the creator's machine (hardware encoders make it near real time)",
    board: null,
    driver: "drivable",
    fits:
      "The only sanctioned way to make a caption permanent: it draws subtitles with libass, converting the input file to ASS first, so WebVTT/SubRip both survive the path; font shaping beyond Latin/Thai needs libass built with HarfBuzz. Word-exact timing has to come from the ASR row above, not from here.",
    measuredAt: MEASURED,
  },
  // ==================== subtitles: vendor APIs (creator's own key) ====================
  {
    id: "deepgram-nova-3",
    name: "Deepgram Nova-3 (pre-recorded)",
    stage: "subtitles",
    kind: "api",
    vendorUrl: "https://deepgram.com/pricing",
    sourceRepository: null, // proprietary service; no public code
    licence: {
      spdx: "NOASSERTION",
      evidenceUrl: null, // SaaS terms of service were not read in this pass — no licence claim is made
      excludedTerritories: [],
      revenueClause: "vendor SaaS terms; unread, so the gate treats it as needs-licence-read",
      attested: null,
    },
    released: null, // no public release-tag surface for the hosted model
    releasedSource: null,
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // no per-request duration cap published on the pricing page read here
      fps: null,
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.0000717,
    priceSource: "$0.0043/min pre-recorded on https://deepgram.com/pricing (= 0.0043/60); streaming quoted $0.0077/min; the vendor's own Whisper Large batch rate is $0.0048/min",
    board: null,
    driver: "needs-licence-read",
    fits:
      "The cheap rented body for a long rough cut: about 7.2 cents per 1000 seconds of audio, no local GPU, no weights to move. Deepgram claims a 54.2% WER reduction for Nova-3 streaming (vendor number); the language count and word-timestamp default were not readable from the docs page fetched, so both are null here rather than inferred.",
    measuredAt: MEASURED,
  },
  {
    id: "openai-transcription-api",
    name: "OpenAI Transcriptions (gpt-transcribe / whisper-1)",
    stage: "subtitles",
    kind: "api",
    vendorUrl: "https://developers.openai.com/api/docs/guides/speech-to-text",
    sourceRepository: null,
    licence: {
      spdx: "NOASSERTION",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "vendor API terms; unread in this pass",
      attested: null,
    },
    released: null,
    releasedSource: null,
    ceiling: {
      maxEdge: null,
      maxSeconds: null, // docs state a 25 MB per-file cap (mp3/mp4/mpeg/mpga/m4a/wav/webm); duration cap not stated
      fps: null,
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.000075,
    priceSource: "$0.0045/min for gpt-transcribe on https://platform.openai.com/docs/pricing (= 0.0045/60); gpt-4o-transcribe and whisper-1 both $0.006/min = 0.0001/s; gpt-4o-mini-transcribe $0.003/min",
    board: null,
    driver: "needs-licence-read",
    fits:
      "Known-good fallback when the creator's laptop is the bottleneck: the docs say word-level timestamps come from whisper-1 with timestamp_granularities=[\"word\"] while gpt-4o-transcribe is text-first, and whisper-1 is marked deprecated — so pay for the word timing or take it from an open aligner, do not assume the newest model gives it.",
    measuredAt: MEASURED,
  },

  // ==================== finish: measurement ====================
  {
    id: "libvmaf",
    name: "libvmaf / VMAF (Netflix)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://github.com/Netflix/vmaf",
    sourceRepository: "https://github.com/Netflix/vmaf",
    licence: {
      spdx: "BSD-2-Clause-Patent",
      evidenceUrl: "https://raw.githubusercontent.com/Netflix/vmaf/master/LICENSE",
      excludedTerritories: [],
      revenueClause: "none; permissive with an express patent grant (the LICENSE file names its SPDX id as BSD-2-Clause-Patent)",
      attested: "machine",
    },
    released: "2026-09-14",
    releasedSource: "https://github.com/Netflix/vmaf/releases/tag/v3.2.1",
    ceiling: {
      maxEdge: null, // compares any two streams it can decode; a 4K model variant ships in the repo
      maxSeconds: null,
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI on the creator's machine; VMAF is CPU-bound, so long films want a rented pod for the pass",
    board: null,
    driver: "drivable",
    fits:
      "The number the delivery gate can actually hold a master to: a pooled VMAF score (0-100) per video plus per-frame scores, from a model file with a named version. FFmpeg's own docs show the professional pair — model=version=vmaf_v0.6.1 with version=vmaf_v0.6.1neg — and NEG is the one that does not reward over-sharpened grain, so gate on vmaf_neg, not plain vmaf.",
    measuredAt: MEASURED,
  },
  {
    id: "ffmpeg-measure-filters",
    name: "FFmpeg measurement filters (signalstats / blackdetect / astats / vmafmotion / ssim / psnr)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://ffmpeg.org/ffmpeg-filters.html",
    sourceRepository: "https://github.com/FFmpeg/FFmpeg",
    licence: {
      spdx: "LGPL-2.1-or-later",
      evidenceUrl: "https://git.ffmpeg.org/gitweb/ffmpeg.git/blob_plain/HEAD:/COPYING.LGPLv2.1",
      excludedTerritories: [],
      revenueClause: "none; GPL-2.0-or-later if the build is configured --enable-gpl",
      attested: "machine",
    },
    released: "2026-09-18",
    releasedSource: "https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2",
    ceiling: {
      maxEdge: null,
      maxSeconds: null,
      fps: null,
      nativeAudio: false, // astats is audio; the rest are picture — the row exists to print numbers
      lipSync: null,
    },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free; these filters decode without re-encoding (-f null), so the cost is CPU minutes on the creator's machine",
    board: null,
    driver: "drivable",
    fits:
      "Every gate in the 13-gate verdict that is a plain number: signalstats prints YMIN/YMAX/YDIF/RMS/HUE per frame (levels and flash risk), blackdetect prints black_start/black_duration (head/tail black), astats prints RMS level / peak level / noise floor (dialogue floor), vmafmotion prints a motion score per frame (the reference for a film that must not be a still), ssim and psnr print fidelity against the reference. All of them are machine-parseable, none of them needs a licence.",
    measuredAt: MEASURED,
  },
  {
    id: "ffmpeg-ebur128",
    name: "FFmpeg ebur128 / loudnorm (EBU R128 loudness)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://ffmpeg.org/ffmpeg-filters.html#ebur128",
    sourceRepository: "https://github.com/FFmpeg/FFmpeg",
    licence: {
      spdx: "LGPL-2.1-or-later",
      evidenceUrl: "https://git.ffmpeg.org/gitweb/ffmpeg.git/blob_plain/HEAD:/COPYING.LGPLv2.1",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: "2026-09-18",
    releasedSource: "https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2",
    ceiling: {
      maxEdge: null,
      maxSeconds: null,
      fps: null, // measures at the file's own sample rate
      nativeAudio: true,
      lipSync: null,
    },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free; a measurement pass, no encode",
    board: null,
    driver: "drivable",
    fits:
      "The loudness verdict a broadcaster asks for, printed as numbers: the docs list the measured values measured_I (integrated loudness), measured_LRA, measured_TP (max true peak) and measured_thresh, and loudnorm targets IL/LRA/max-true-peak in two passes. -23 LUFS EBU R128 or -24 LKFS ATSC A/85 both become a single comparison against measured_I.",
    measuredAt: MEASURED,
  },
  {
    id: "mediainfo",
    name: "MediaInfo / MediaInfoLib",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://mediaarea.net/MediaInfo",
    sourceRepository: "https://github.com/MediaArea/MediaInfo",
    licence: {
      spdx: "BSD-2-Clause",
      evidenceUrl: "https://github.com/MediaArea/MediaInfo/blob/master/License.html",
      excludedTerritories: [],
      revenueClause: "none (BSD-2); MediaInfoLib is separately reusable",
      attested: "machine",
    },
    released: "2026-10-06",
    releasedSource: "https://github.com/MediaArea/MediaInfo/releases/tag/v26.10",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI; reads the header, does not touch the frames, so it is near-instant on any master",
    board: null,
    driver: "drivable",
    fits:
      "The container truth: codec, profile, chroma subsampling, bit depth, colour primaries/transfer/matrix, frame rate, duration, track layout, as JSON. Cheap enough to run before every other gate — it catches the master that was delivered at the wrong bit depth before you spend an hour measuring it.",
    measuredAt: MEASURED,
  },
  {
    id: "mediaconch",
    name: "MediaConch (policy conformance checker)",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://mediaarea.net/MediaConch",
    sourceRepository: "https://github.com/MediaArea/MediaConch_SourceCode",
    licence: {
      spdx: "BSD-2-Clause",
      evidenceUrl: "https://raw.githubusercontent.com/MediaArea/MediaConch_SourceCode/master/LICENSE",
      excludedTerritories: [],
      revenueClause:
        "none (the source LICENSE is BSD-2 and the README states PREFORMA code is provided under BSD-2-Clause); note the MediaArea QCTools/MediaConch distribution pages describe GPLv3 binaries — read the licence of the build you ship, not the repo's",
      attested: "machine",
    },
    released: "2025-05-05",
    releasedSource: "https://github.com/MediaArea/MediaConch_SourceCode/releases/tag/v25.04",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI; batch-level conformance checking on the creator's machine",
    board: null,
    driver: "drivable",
    fits:
      "The tool that turns a delivery spec into a gate: an implementation checker, policy checker, reporter and fixer, runnable per file or in batch from the command line, with pass/fail per policy rule as the output. Its stated focus is Matroska, LPCM and FFV1 — the archival master the platform should measure before it hands over anything.",
    measuredAt: MEASURED,
  },
  {
    id: "qctools",
    name: "QCTools (per-frame video QC graphs)",
    stage: "finish",
    kind: "app",
    vendorUrl: "https://mediaarea.net/QCTools",
    sourceRepository: "https://github.com/bavc/qctools",
    licence: {
      spdx: "GPL-3.0-or-later",
      evidenceUrl: "https://github.com/MediaArea/QCTools", // repo states: deliverable GPLv3; GUI part and FFmpeg statistics filter 3-Clause BSD
      excludedTerritories: [],
      revenueClause:
        "GPLv3 on the deliverable (source-availability obligations if you ship it), BSD-3 on the GUI/statistics-filter parts",
      attested: "human",
    },
    released: "2025-01-03",
    releasedSource: "https://github.com/bavc/qctools/releases/tag/v1.4",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free app; it exports the same FFmpeg statistics the platform already computes",
    board: null,
    driver: "no-driver",
    fits:
      "Where a human looks instead of a gate: per-frame graphs and exported stats for artefact hunting (tbc dropouts, levels, motion). No batch CLI path was verified from the repository in this pass, so it ranks behind MediaConch for automated gating even though the numbers underneath are the same.",
    measuredAt: MEASURED,
  },

  // ==================== publish: packaging, storage, ingest, provenance ====================
  {
    id: "shaka-packager",
    name: "Shaka Packager (Google)",
    stage: "publish",
    kind: "cli",
    vendorUrl: "https://github.com/shaka-project/shaka-packager",
    sourceRepository: "https://github.com/shaka-project/shaka-packager",
    licence: {
      spdx: "BSD-3-Clause",
      evidenceUrl: "https://raw.githubusercontent.com/shaka-project/shaka-packager/main/LICENSE",
      excludedTerritories: [],
      revenueClause: "none (BSD-3; the endorsement clause is the only extra condition)",
      attested: "machine",
    },
    released: "2026-07-27",
    releasedSource: "https://github.com/shaka-project/shaka-packager/releases/tag/v3.9.3",
    ceiling: {
      maxEdge: null, // packages and segments; it does not encode, so the ladder it inherits is whatever the encoder produced
      maxSeconds: null,
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free CLI on the creator's machine; CPU-bound muxing, no weights",
    board: null,
    driver: "drivable",
    fits:
      "Both storefront formats from one binary: DASH and HLS (CMAF-style) packaging with Widevine, PlayReady, FairPlay and SAMPLE-AES key paths, and a documented subtitle table — Text WebVTT in and out, WebVTT-in-MP4 out, TTML out. This is the row that carries subtitles all the way to the player instead of burning them in.",
    measuredAt: MEASURED,
  },
  {
    id: "bento4",
    name: "Bento4 (mp4dump / mp4-hls-muxer / wpac)",
    stage: "publish",
    kind: "cli",
    vendorUrl: "https://www.bento4.com/",
    sourceRepository: "https://github.com/axiomatic-systems/Bento4",
    licence: {
      spdx: "GPL-2.0-or-later",
      evidenceUrl: "https://www.bento4.com/about/", // about page links the GPL-2.0 text and offers the paid alternative
      excludedTerritories: [],
      revenueClause:
        "dual-licensed: the GPL applies only if the whole application is distributable under it (no proprietary linker), otherwise a non-GPL commercial licence must be bought from Axiomatic Systems — a closed-source product needs the paid path",
      attested: "human",
    },
    released: "2023-11-25",
    releasedSource: "https://github.com/axiomatic-systems/Bento4/releases/tag/v1.6.0-641", // three years stale: rank it behind the active packagers
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free under GPL terms; $0 on the creator's machine, or a commercial licence",
    board: null,
    driver: "needs-licence-read",
    fits:
      "The MP4 surgeon rather than the packager to ship by default: excellent at inspecting and re-muxing fMP4/HLS/DASH structures, but the licence is a GPL/commercial fork in the road and the last tagged release is from 2023, so both the platform's licence gate and its staleness gate will push Shaka and GPAC ahead of it.",
    measuredAt: MEASURED,
  },
  {
    id: "gpac-mp4box",
    name: "GPAC / MP4Box",
    stage: "publish",
    kind: "cli",
    vendorUrl: "https://gpac.io/",
    sourceRepository: "https://github.com/gpac/gpac",
    licence: {
      spdx: "LGPL-2.1-or-later",
      evidenceUrl: "https://raw.githubusercontent.com/gpac/gpac/master/COPYING",
      excludedTerritories: [],
      revenueClause:
        "LGPL v2.1 or later for the library; the project README states most of it is also available under a commercial licence (motionspell.com/gpac-licensing) — LGPL compliance is required before the paid route matters",
      attested: "machine",
    },
    released: "2026-09-24",
    releasedSource: "https://github.com/gpac/gpac/releases/tag/abi-16.27",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free under LGPL; local mux/packaging cost is CPU only",
    board: null,
    driver: "drivable",
    fits:
      "The other half of the delivery ladder: MP4Box produces the ISOBMFF/CMAF fragments, the DASH and HLS manifests and the SDH text tracks, and it is the reference tool when a player rejects your segments. Actively released (monthly), unlike Bento4.",
    measuredAt: MEASURED,
  },
  {
    id: "mux",
    name: "Mux (Direct Uploads + storage/CDN)",
    stage: "publish",
    kind: "api",
    vendorUrl: "https://mux.com/pricing/video",
    sourceRepository: null,
    licence: {
      spdx: "NOASSERTION",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "vendor SaaS terms; unread in this pass",
      attested: null,
    },
    released: null,
    releasedSource: null,
    ceiling: {
      maxEdge: null, // ingest takes what the master is; the ladder it emits is vendor-controlled
      maxSeconds: null,
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    // No per-second-of-processing price published: the page prices storage and delivery per minute, not the encode.
    priceUsdPerSecond: null,
    priceSource:
      "published rates on https://mux.com/pricing/video are $0.00300/min/month storage and $0.00100/min delivery after 100,000 free minutes/month (1080p Basic input listed as Free) — no per-processed-second figure on record, so the gate refuses to quote it",
    board: null,
    driver: "needs-licence-read",
    fits:
      "One API call from 'finished master' to 'playable anywhere': upload URL, HLS/DASH ladders and a CDN in the vendor's hands while the creator's key pays for it. The honest cost is monthly storage and delivery per minute viewed, not per second processed — the platform must bill it as a subscription-shaped cost, not a per-job one.",
    measuredAt: MEASURED,
  },
  {
    id: "youtube-data-api",
    name: "YouTube Data API v3 (videos.insert ingest)",
    stage: "publish",
    kind: "api",
    vendorUrl: "https://developers.google.com/youtube/v3/docs/videos/insert",
    sourceRepository: null,
    licence: {
      spdx: "NOASSERTION",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "YouTube API Services Terms of Service; unread in this pass",
      attested: null,
    },
    released: null,
    releasedSource: null,
    ceiling: {
      maxEdge: null, // upload resolution limits are platform policy, not an encoder ceiling — not re-verified here
      maxSeconds: null,
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0,
    priceSource:
      "no USD charge published for the upload call; the limit is quota, not money — docs give videos.insert a cost of 1 unit with 100 calls/day and a 256 GB maximum file size",
    board: null,
    driver: "drivable",
    fits:
      "The zero-dollar premiere slot: 256 GB per file is more master than anyone needs, and the real constraint is 100 uploads a day per project, which is a schedule problem for a slate of films rather than a cost one. Price is recorded as $0 because the published limit is quota, and the platform should gate the plan on the daily count.",
    measuredAt: MEASURED,
  },
  {
    id: "c2pa-rs",
    name: "c2pa-rs (C2PA / Content Credentials SDK)",
    stage: "publish",
    kind: "cli",
    vendorUrl: "https://c2pa.org/",
    sourceRepository: "https://github.com/contentauth/c2pa-rs",
    licence: {
      spdx: "Apache-2.0 OR MIT",
      evidenceUrl: "https://raw.githubusercontent.com/contentauth/c2pa-rs/main/LICENSE-APACHE",
      excludedTerritories: [],
      revenueClause:
        "dual MIT-or-Apache-2.0 (both texts are in the repo: LICENSE-MIT and LICENSE-APACHE); no revenue clause, no territory ban — the signing certificates you use are a separate commercial matter",
      attested: "machine",
    },
    released: "2026-11-03",
    releasedSource: "https://github.com/contentauth/c2pa-rs/releases/tag/c2pa-v0.91.10",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "free open-source SDK (a C FFI build ships in the same release train); only the certificate chain may cost money",
    board: null,
    driver: "drivable",
    fits:
      "Provenance as a file format, not a logo: it writes and validates C2PA manifests (assertions + signed credentials) so a viewer can open the master and see who made it and with what. The technical specification is published at version 2.5 (spec.c2pa.org) and this SDK is the reference implementation — this is the genuinely open-source half of the provenance story.",
    measuredAt: MEASURED,
  },
  {
    id: "videoseal",
    name: "VideoSeal / PixelSeal (Meta invisible watermarking)",
    stage: "publish",
    kind: "weights",
    vendorUrl: "https://github.com/facebookresearch/videoseal",
    sourceRepository: "https://github.com/facebookresearch/videoseal",
    licence: {
      spdx: "MIT",
      evidenceUrl: "https://raw.githubusercontent.com/facebookresearch/videoseal/main/LICENSE",
      excludedTerritories: [],
      revenueClause:
        "none: the repo README states all models, training code and evaluation tools are released under MIT, and the facebook/video_seal checkpoint carries license:mit",
      attested: "machine",
    },
    // No GitHub release tags exist for this repo; the checkpoint page and the README changelog are the only dates on record.
    released: null,
    releasedSource: "https://huggingface.co/facebook/video_seal", // checkpoint page lastModified 2024-12-14; README changelog notes "March 2025: VideoSeal v1.0" and lists the newer 256-bit PixelSeal
    ceiling: {
      maxEdge: null, // per-frame embedding at whatever resolution the master is; no published frame-size cap
      maxSeconds: null, // long videos are processed in chunks by the library; no single-pass cap published
      fps: null,
      nativeAudio: false,
      lipSync: null,
    },
    body: { vramGb: null, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "free MIT weights, checkpoints downloadable from the repo; the GPU minute is the only cost",
    board: null,
    driver: "drivable",
    fits:
      "The invisible half of provenance, and the one that is actually free: a 256-bit payload embedded per frame with an imperceptibility/robustness trade-off you can tune (scaling_w), plus a built-in evaluation that writes metrics.csv of PSNR/robustness per attack — so the platform can gate on measured survival under re-encode rather than trusting a vendor badge. Complements c2pa-rs instead of replacing it: a manifest says what happened, a watermark survives a screen recording.",
    measuredAt: MEASURED,
  },
];
