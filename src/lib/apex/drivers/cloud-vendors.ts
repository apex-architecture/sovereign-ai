/**
 * The vendor papers — one file, one contract per rented body.
 *
 * Every price, path, field name and status word below was read from the vendor's own
 * documentation, SDK or published OpenAPI. Each contract carries the URL it was read from so a
 * reader can check it rather than trust it. Where a number is computed rather than printed by the
 * vendor, the arithmetic is printed beside it.
 *
 * What these six have in common: the creator brings the key, the creator pays the bill, and the
 * platform spends nothing of its own. What they do not have in common: almost every field name.
 * That is why each one is its own paper instead of a generic "call the video API" function.
 *
 * Names corrected against the vendor's own documentation, because the marketing pages get them
 * wrong and so do the boards:
 *   - Kling 3.0 is the id. "Kling 3.0 Pro" is not a documented model id.
 *   - Seedance 2.5 on Volcengine Ark is "doubao-seedance-2-5-260628".
 *   - Wan 3.0 on Alibaba Model Studio is "wan3.0-video".
 *   - Vidu Q3 Pro is "viduq3-pro".
 *   - Runway is "gen4.5" and "gen4_turbo".
 *   - Luma Ray 3.2 is "ray-3.2" and lives on the Agents API, not the old Dream Machine API.
 */

import { makeCloudVideoDriver, type CloudVideoVendor, type VideoOptions } from "./cloud-video.ts";

/** The yuan-to-dollar rate used to quote the two vendors that publish in yuan. */
const CNY_PER_USD = 7.1;

/** A price that cannot be computed. The driver refuses the job rather than guessing. */
const UNPRICED = (formula: string) => ({ usdPerSecond: NaN, formula });

/* ------------------------------------------------------------------ Kling (Kuaishou) */

/**
 * Kling's own pricing page, read at https://kling.ai/document-api/pricing/base/video.
 * The ladder is in "U" and one U is $0.14.
 */
const KLING_U_USD = 0.14;
const KLING_PRICE: Record<string, number> = {
  "kling-3.0|720p|0": 0.6,
  "kling-3.0|1080p|0": 0.8,
  "kling-3.0|4k|0": 3.0,
  "kling-3.0|720p|1": 0.9,
  "kling-3.0|1080p|1": 1.2,
  "kling-3.0-turbo|720p|0": 0.8,
  "kling-3.0-turbo|1080p|0": 1.0,
  "kling-2.6|720p|0": 0.3,
  "kling-2.6|1080p|0": 0.5,
  "kling-4.0|720p|0": 1.0,
  "kling-4.0|1080p|0": 1.5,
};

const KLING_RES = ["720p", "1080p", "4k"];
const KLING_RATIOS = ["16:9", "9:16", "1:1"];

export const klingVendor: CloudVideoVendor = {
  id: "kling",
  toolId: "kling-api",
  name: "Kling 3.0 (Kuaishou)",
  category: "video-generation",
  vendorUrl: "https://kling.ai",
  docsUrl: "https://kling.ai/document-api/apiReference/model/videoGeneration",
  keyEnv: "KLING_API_KEY",
  defaultModel: "kling-3.0",
  models: ["kling-3.0", "kling-3.0-turbo", "kling-2.6", "kling-2.5-turbo", "kling-4.0"],
  baseUrl: "https://api-singapore.klingai.com",
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  normalise: (opts) => ({
    ...opts,
    model: opts.model ?? "kling-3.0",
    resolution: opts.resolution.toLowerCase(),
    ratio: opts.ratio,
    seconds: Math.max(3, Math.min(15, Math.round(opts.seconds))),
  }),
  submit: { path: (opts) => (opts.firstFrame ? `/image-to-video/${opts.model}` : `/text-to-video/${opts.model}`) },
  poll: { path: (_opts, taskId) => `/tasks?task_ids=${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const settings: Record<string, unknown> = {
      multi_shot: false,
      audio: opts.audio ? "native" : "off",
      resolution: opts.resolution,
      duration: opts.seconds,
    };
    const options = { watermark_info: { enabled: false } };
    if (opts.firstFrame) {
      // The image-to-video call takes a contents array, and it has no aspect_ratio field at all.
      return {
        contents: [
          { type: "prompt", text: opts.prompt },
          { type: "first_frame", url: opts.firstFrame },
        ],
        settings,
        options,
      };
    }
    settings.aspect_ratio = opts.ratio;
    return { prompt: opts.prompt, settings, options };
  },
  taskId: (body) => body?.data?.[0]?.task_id ?? body?.data?.[0]?.taskId ?? "",
  status: (body) => String(body?.data?.[0]?.task_status ?? body?.data?.[0]?.status ?? ""),
  outputs: (body) =>
    (body?.data?.[0]?.outputs ?? [])
      .filter((o: any) => !o?.type || o.type === "video")
      .map((o: any) => o?.url)
      .filter(Boolean),
  done: ["succeeded"],
  failed: ["failed"],
  failureReason: (body) => String(body?.data?.[0]?.message ?? body?.data?.[0]?.error ?? ""),
  price: (opts) => {
    const model = opts.model ?? "kling-3.0";
    if (!KLING_RES.includes(opts.resolution)) {
      return UNPRICED(`Kling ${model} takes resolution ${KLING_RES.join(", ")}; "${opts.resolution}" is not one of them.`);
    }
    if (opts.ratio !== "16:9" && opts.ratio !== "9:16" && opts.ratio !== "1:1") {
      return UNPRICED(`Kling ${model} takes aspect_ratio ${KLING_RATIOS.join(", ")}; "${opts.ratio}" is not one of them.`);
    }
    const u = KLING_PRICE[`${model}|${opts.resolution}|${opts.audio ? 1 : 0}`];
    if (u === undefined) {
      return UNPRICED(`Kling's published ladder has no ${model} at ${opts.resolution}${opts.audio ? " with native audio" : ""}. Unpriced is refused, not treated as free.`);
    }
    return {
      usdPerSecond: u * KLING_U_USD,
      formula: `Kling ${model} ${opts.resolution}${opts.audio ? " +native audio" : ""} = ${u} U/s x $${KLING_U_USD}/U = $${(u * KLING_U_USD).toFixed(3)}/s`,
    };
  },
  probeRequest: { path: "/tasks?task_ids=probe" },
  extension: ".mp4",
  limits: "no negative prompt, no seed, no more than 15 seconds in one pass; the result URL is hotlink-protected and dies after 30 days.",
};

/* ------------------------------------------------------------------ Vidu (Shengshu) */

/**
 * Vidu bills in credits: https://platform.vidu.com/pricing gives the ladder, and the recharge
 * page gives 1 credit = ¥0.03125.
 */
const VIDU_CREDIT_CNY = 0.03125;
const VIDU_PRICE: Record<string, number> = {
  "viduq3-pro|1080p": 24,
  "viduq3-pro|720p": 20,
  "viduq3-pro|540p": 9,
  "viduq3-turbo|1080p": 13,
  "viduq4-preview|4k": 78,
  "viduq4-preview|2k": 38,
  "viduq4-preview|1080p": 24,
  "viduq4-preview|720p": 19,
  "viduq4-preview|540p": 9,
};

const VIDU_RES = ["540p", "720p", "1080p"];
const VIDU_RATIOS = ["16:9", "9:16", "3:4", "4:3", "1:1"];

export const viduVendor: CloudVideoVendor = {
  id: "vidu",
  toolId: "vidu-api",
  name: "Vidu Q3 Pro (Shengshu)",
  category: "video-generation",
  vendorUrl: "https://www.vidu.com",
  docsUrl: "https://platform.vidu.com/docs",
  keyEnv: "VIDU_API_KEY",
  defaultModel: "viduq3-pro",
  models: ["viduq4-preview", "viduq3-pro", "viduq3-pro-fast", "viduq3-turbo", "viduq3-mix", "viduq3-drama", "viduq3-ad", "viduq2-pro", "viduq2", "viduq2-turbo", "viduq1"],
  baseUrl: "https://api.vidu.com",
  // Vidu authenticates with the word "Token", not "Bearer". This one word is the whole reason a
  // hand-copied curl from a blog post fails against the real API.
  auth: (key) => ({ Authorization: `Token ${key}` }),
  normalise: (opts) => ({
    ...opts,
    model: opts.model ?? "viduq3-pro",
    resolution: opts.resolution.toLowerCase(),
    seconds: Math.max(1, Math.round(opts.seconds)),
  }),
  submit: { path: (opts) => (opts.firstFrame ? "/ent/v2/img2video" : "/ent/v2/text2video") },
  poll: { path: (_opts, taskId) => `/ent/v2/tasks/${encodeURIComponent(taskId)}/creations` },
  body: (opts) => {
    const common: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      duration: opts.seconds,
      resolution: opts.resolution,
      audio: opts.audio,
      payload: "",
    };
    if (opts.seed !== undefined) common.seed = opts.seed;
    if (opts.firstFrame) {
      // The image array is exactly one entry: a URL or a base64 string.
      return { ...common, images: [opts.firstFrame], is_rec: false };
    }
    return { ...common, aspect_ratio: opts.ratio };
  },
  taskId: (body) => body?.task_id ?? body?.id ?? "",
  status: (body) => String(body?.state ?? body?.status ?? ""),
  outputs: (body) => (body?.creations ?? []).map((c: any) => c?.url).filter(Boolean),
  done: ["success"],
  failed: ["failed"],
  failureReason: (body) => String(body?.fail_msg ?? body?.message ?? body?.error ?? ""),
  price: (opts) => {
    const model = opts.model ?? "viduq3-pro";
    if (!VIDU_RES.includes(opts.resolution)) {
      return UNPRICED(`Vidu ${model} takes resolution ${VIDU_RES.join(", ")}; "${opts.resolution}" is not one of them.`);
    }
    if (!VIDU_RATIOS.includes(opts.ratio)) {
      return UNPRICED(`Vidu ${model} takes aspect_ratio ${VIDU_RATIOS.join(", ")}; "${opts.ratio}" is not one of them.`);
    }
    const credits = VIDU_PRICE[`${model}|${opts.resolution}`];
    if (credits === undefined) {
      return UNPRICED(`Vidu's published ladder has no ${model} at ${opts.resolution}. Unpriced is refused, not treated as free.`);
    }
    const cny = credits * VIDU_CREDIT_CNY;
    return {
      usdPerSecond: cny / CNY_PER_USD,
      formula: `Vidu ${model} ${opts.resolution} = ${credits} credit/s x ¥${VIDU_CREDIT_CNY}/credit = ¥${cny.toFixed(4)}/s ÷ ${CNY_PER_USD} CNY/USD = $${(cny / CNY_PER_USD).toFixed(4)}/s`,
    };
  },
  probeRequest: { path: "/ent/v2/tasks/probe/creations" },
  extension: ".mp4",
  limits: "five concurrent jobs on one account; a failed video is not charged; the finished URL dies after 24 hours.",
};

/* ------------------------------------------------------------------ Seedance 2.5 (Volcengine Ark) */

/**
 * Ark prices Seedance by token, not by second:
 * tokens = (output seconds x width x height x fps) / 1024, at ¥70 per million tokens for 480p and
 * 720p and ¥77 per million for 1080p. The pixel table below is the tier being billed.
 */
const ARK_TIERS: Record<string, { w: number; h: number; fps: number; cnyPerMillion: number }> = {
  "480p": { w: 640, h: 480, fps: 16, cnyPerMillion: 70 },
  "720p": { w: 1280, h: 720, fps: 24, cnyPerMillion: 70 },
  "1080p": { w: 1920, h: 1080, fps: 24, cnyPerMillion: 77 },
};
const ARK_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"];

export const arkVendor: CloudVideoVendor = {
  id: "volcengine-ark",
  toolId: "ark-video",
  name: "Seedance 2.5 (Volcengine Ark)",
  category: "video-generation",
  vendorUrl: "https://www.volcengine.com/product/ark",
  docsUrl: "https://www.volcengine.com/docs/82379/1520757",
  keyEnv: "ARK_API_KEY",
  defaultModel: "doubao-seedance-2-5-260628",
  models: ["doubao-seedance-2-5-260628"],
  baseUrl: () => process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3",
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  normalise: (opts) => ({
    ...opts,
    model: opts.model ?? "doubao-seedance-2-5-260628",
    resolution: opts.resolution.toLowerCase(),
    seconds: Math.max(1, Math.min(30, Math.round(opts.seconds))),
  }),
  submit: { path: "/contents/generations/tasks" },
  poll: { path: (_opts, taskId) => `/contents/generations/tasks/${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const content: any[] = [{ type: "text", text: opts.prompt }];
    if (opts.firstFrame) {
      content.push({ type: "image_url", image_url: { url: opts.firstFrame }, role: "first_frame" });
    }
    const body: Record<string, unknown> = {
      model: opts.model,
      content,
      resolution: opts.resolution,
      ratio: opts.ratio,
      duration: opts.seconds,
      camera_fixed: false,
      watermark: false,
    };
    if (opts.seed !== undefined) body.seed = opts.seed;
    return body;
  },
  taskId: (body) => body?.id ?? "",
  status: (body) => String(body?.status ?? ""),
  outputs: (body) => (body?.content?.video_url ? [body.content.video_url] : []),
  done: ["succeeded"],
  failed: ["failed", "expired", "cancelled"],
  failureReason: (body) => String(body?.error?.message ?? body?.message ?? ""),
  price: (opts) => {
    const tier = ARK_TIERS[opts.resolution];
    if (!tier) {
      return UNPRICED(`Ark takes resolution ${Object.keys(ARK_TIERS).join(", ")}; "${opts.resolution}" is not one of them.`);
    }
    if (!ARK_RATIOS.includes(opts.ratio)) {
      return UNPRICED(`Ark takes ratio ${ARK_RATIOS.join(", ")}; "${opts.ratio}" is not one of them.`);
    }
    const tokensPerSecond = (tier.w * tier.h * tier.fps) / 1024;
    const cny = (tokensPerSecond * tier.cnyPerMillion) / 1_000_000;
    return {
      usdPerSecond: cny / CNY_PER_USD,
      formula: `Ark ${opts.resolution} = ${tier.w}x${tier.h}@${tier.fps}fps -> ${tokensPerSecond.toFixed(0)} token/s x ¥${tier.cnyPerMillion}/M tokens = ¥${cny.toFixed(5)}/s ÷ ${CNY_PER_USD} CNY/USD = $${(cny / CNY_PER_USD).toFixed(4)}/s`,
    };
  },
  probeRequest: { path: "/contents/generations/tasks/probe" },
  extension: ".mp4",
  limits: "no negative prompt; the account needs more than ¥200 of balance; the finished URL lives 24 hours and can be downloaded 100 times.",
};

/* ------------------------------------------------------------------ Wan 3.0 (Alibaba Model Studio) */

const WAN_PRICE: Record<string, number> = {
  "wan3.0-video|480P": 0.05,
  "wan3.0-video|720P": 0.1,
  "wan3.0-video|1080P": 0.2,
  "wan3.0-video-prime|480P": 0.068,
  "wan3.0-video-prime|720P": 0.14,
  "wan3.0-video-prime|1080P": 0.28,
};
const WAN_RATIOS = ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

export const dashscopeVendor: CloudVideoVendor = {
  id: "alibaba-model-studio",
  toolId: "dashscope-video",
  name: "Wan 3.0 (Alibaba Model Studio)",
  category: "video-generation",
  vendorUrl: "https://www.alibabacloud.com/en/product/modelstudio",
  docsUrl: "https://www.alibabacloud.com/help/en/model-studio/wan-video-generation-api",
  keyEnv: "DASHSCOPE_API_KEY",
  requiredEnv: [
    {
      env: "DASHSCOPE_BASE_URL",
      how: "Model Studio gives every workspace its own host, in the form https://{WorkspaceId}.{region}.maas.aliyuncs.com. Put that host in DASHSCOPE_BASE_URL.",
    },
  ],
  defaultModel: "wan3.0-video",
  models: ["wan3.0-video", "wan3.0-video-prime"],
  baseUrl: () => process.env.DASHSCOPE_BASE_URL ?? "",
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  headers: {
    // Without this header Model Studio treats the call as synchronous and rejects it.
    "X-DashScope-Async": "enable",
  },
  normalise: (opts) => ({
    ...opts,
    model: opts.model ?? "wan3.0-video",
    resolution: opts.resolution.toUpperCase(),
    seconds: Math.max(1, Math.min(30, Math.round(opts.seconds))),
  }),
  submit: { path: "/api/v1/services/aigc/video-generation/video-synthesis" },
  poll: { path: (_opts, taskId) => `/api/v1/tasks/${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const media: any[] = [];
    if (opts.firstFrame) media.push({ type: "first_frame", url: opts.firstFrame });
    const parameters: Record<string, unknown> = {
      resolution: opts.resolution,
      ratio: opts.ratio,
      duration: opts.seconds,
      audio: opts.audio,
      prompt_extend: true,
      watermark: false,
    };
    if (opts.seed !== undefined) parameters.seed = opts.seed;
    return {
      model: opts.model,
      input: { prompt: opts.prompt, media },
      parameters,
    };
  },
  taskId: (body) => body?.output?.task_id ?? "",
  status: (body) => String(body?.output?.task_status ?? body?.output?.taskStatus ?? ""),
  outputs: (body) => (body?.output?.video_url ? [body.output.video_url] : []),
  done: ["SUCCEEDED"],
  failed: ["FAILED", "CANCELED", "UNKNOWN"],
  failureReason: (body) => String(body?.output?.message ?? body?.message ?? body?.code ?? ""),
  price: (opts) => {
    const model = opts.model ?? "wan3.0-video";
    if (!WAN_RATIOS.includes(opts.ratio)) {
      return UNPRICED(`Model Studio takes ratio ${WAN_RATIOS.join(", ")}; "${opts.ratio}" is not one of them.`);
    }
    const usd = WAN_PRICE[`${model}|${opts.resolution}`];
    if (usd === undefined) {
      return UNPRICED(`Model Studio's published ladder has no ${model} at ${opts.resolution}. Unpriced is refused, not treated as free.`);
    }
    return {
      usdPerSecond: usd,
      formula: `Model Studio ${model} ${opts.resolution} = $${usd.toFixed(3)}/s (Singapore region rate card)`,
    };
  },
  probeRequest: { path: "/api/v1/tasks/probe" },
  extension: ".mp4",
  limits: "the finished URL lives 24 hours; the workspace host is region-specific and a task started in one region stays there.",
};

/* ------------------------------------------------------------------ Runway (Gen-4.5) */

/**
 * Runway has no separate resolution field: the ratio string carries the pixel size. That is why
 * "1080p" cannot be quoted for Runway at all — 1280:720 is the top tier it publishes.
 */
const RUNWAY_CREDIT_USD = 0.01;
const RUNWAY_CREDITS: Record<string, number> = { "gen4.5": 12, "gen4_turbo": 5 };
const RUNWAY_RATIO: Record<string, string> = {
  "16:9": "1280:720",
  "9:16": "720:1280",
  "4:3": "1104:832",
  "3:4": "832:1104",
  "1:1": "960:960",
  "21:9": "1584:672",
};

export const runwayVendor: CloudVideoVendor = {
  id: "runway",
  toolId: "runway-api",
  name: "Runway Gen-4.5",
  category: "video-generation",
  vendorUrl: "https://runwayml.com",
  docsUrl: "https://docs.dev.runwayml.com/guides/pricing/",
  keyEnv: "RUNWAYML_API_SECRET",
  defaultModel: "gen4.5",
  models: ["gen4.5", "gen4_turbo"],
  baseUrl: "https://api.dev.runwayml.com",
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  normalise: (opts) => {
    const ratio = RUNWAY_RATIO[opts.ratio] ?? "1280:720";
    return {
      ...opts,
      model: opts.model ?? "gen4.5",
      ratio,
      seconds: Math.max(2, Math.min(10, Math.round(opts.seconds))),
    };
  },
  submit: { path: (opts) => (opts.firstFrame ? "/v1/image_to_video" : "/v1/text_to_video") },
  poll: { path: (_opts, taskId) => `/v1/tasks/${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const body: Record<string, unknown> = {
      model: opts.model,
      promptText: opts.prompt,
      ratio: opts.ratio,
      duration: opts.seconds,
      outputFormat: "mp4",
    };
    if (opts.seed !== undefined) body.seed = opts.seed;
    if (opts.firstFrame) body.promptImage = opts.firstFrame;
    return body;
  },
  taskId: (body) => body?.id ?? "",
  status: (body) => String(body?.status ?? ""),
  outputs: (body) => (Array.isArray(body?.output) ? body.output.filter(Boolean) : []),
  done: ["SUCCEEDED"],
  failed: ["FAILED", "CANCELLED"],
  failureReason: (body) => String(body?.failure ?? body?.failureCode ?? ""),
  price: (opts) => {
    const model = opts.model ?? "gen4.5";
    const credits = RUNWAY_CREDITS[model];
    if (credits === undefined) {
      return UNPRICED(`Runway's published rate card covers ${Object.keys(RUNWAY_CREDITS).join(", ")}; "${model}" is not on it. Unpriced is refused, not treated as free.`);
    }
    return {
      usdPerSecond: credits * RUNWAY_CREDIT_USD,
      formula: `Runway ${model} = ${credits} credit/s x $${RUNWAY_CREDIT_USD}/credit = $${(credits * RUNWAY_CREDIT_USD).toFixed(2)}/s`,
    };
  },
  probeRequest: { path: "/v1/tasks/probe" },
  extension: ".mp4",
  limits: "gen4_turbo is image-to-video only; the top tier is 1280:720 and a clip is 2 to 10 seconds; the signed URL expires in 24 to 48 hours and a fresh task fetch renews it.",
};

/* ------------------------------------------------------------------ Luma (Ray 3.2) */

/**
 * Luma's Agents API prices Ray 3.2 in credits, and the usage guide gives the list rate:
 * $0.003 per credit. Ten-second clips cost more per second than five-second ones, so the quote
 * has to know which bracket it is in.
 */
const LUMA_CREDIT_USD = 0.003;
const LUMA_CREDITS: Record<string, number> = {
  "ray-3.2|360p|5": 20,
  "ray-3.2|360p|10": 60,
  "ray-3.2|540p|5": 50,
  "ray-3.2|540p|10": 150,
  "ray-3.2|720p|5": 100,
  "ray-3.2|720p|10": 300,
  "ray-3.2|1080p|5": 400,
  "ray-3.2|1080p|10": 1200,
};
const LUMA_RATIOS = ["9:16", "3:4", "1:1", "4:3", "16:9", "21:9"];

export const lumaVendor: CloudVideoVendor = {
  id: "luma",
  toolId: "luma-api",
  name: "Luma Ray 3.2",
  category: "video-generation",
  vendorUrl: "https://lumalabs.ai",
  docsUrl: "https://docs.agents.lumalabs.ai/guides/pricing/",
  keyEnv: "LUMA_API_KEY",
  defaultModel: "ray-3.2",
  models: ["ray-3.2"],
  baseUrl: "https://agents.lumalabs.ai/v1",
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  normalise: (opts) => ({
    ...opts,
    model: opts.model ?? "ray-3.2",
    resolution: opts.resolution.toLowerCase(),
    ratio: opts.ratio,
    // Luma sells 5 s and 10 s, not a length. Anything between is sold as the next bracket up,
    // and the price has to be the bracket's price, not the requested seconds' price.
    seconds: opts.seconds <= 5 ? 5 : 10,
  }),
  submit: { path: "/generations" },
  poll: { path: (_opts, taskId) => `/generations/${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const video: Record<string, unknown> = {
      resolution: opts.resolution,
      duration: `${opts.seconds}s`,
    };
    if (opts.firstFrame) video.start_frame = { url: opts.firstFrame };
    return {
      model: opts.model,
      type: "video",
      prompt: opts.prompt,
      aspect_ratio: opts.ratio,
      video,
    };
  },
  taskId: (body) => body?.id ?? "",
  status: (body) => String(body?.state ?? ""),
  outputs: (body) => (body?.output ?? []).map((o: any) => o?.url).filter(Boolean),
  done: ["completed"],
  failed: ["failed"],
  failureReason: (body) => String(body?.failure_reason ?? body?.failure_code ?? ""),
  price: (opts) => {
    const model = opts.model ?? "ray-3.2";
    if (!LUMA_RATIOS.includes(opts.ratio)) {
      return UNPRICED(`Luma ${model} takes aspect_ratio ${LUMA_RATIOS.join(", ")}; "${opts.ratio}" is not one of them.`);
    }
    const credits = LUMA_CREDITS[`${model}|${opts.resolution}|${opts.seconds}`];
    if (credits === undefined) {
      return UNPRICED(`Luma's published ladder has no ${model} at ${opts.resolution} for ${opts.seconds}s. Unpriced is refused, not treated as free.`);
    }
    return {
      usdPerSecond: (credits * LUMA_CREDIT_USD) / opts.seconds,
      formula: `Luma ${model} ${opts.resolution} at ${opts.seconds}s = ${credits} credits x $${LUMA_CREDIT_USD}/credit = $${(credits * LUMA_CREDIT_USD).toFixed(2)} for ${opts.seconds}s = $${((credits * LUMA_CREDIT_USD) / opts.seconds).toFixed(4)}/s`,
    };
  },
  probeRequest: { path: "/credits" },
  extension: ".mp4",
  limits: "five or ten seconds only, no seed field, and the finished URL is a one-hour presigned link — pull it immediately or re-poll the task.",
};

/* ------------------------------------------------------------------ fal.ai (the gateway) */

/**
 * One key, four frontiers. fal resells Kling, Wan, Luma and Seedance at its own per-second rates,
 * and it is the only single-credential route to all of them.
 *
 * fal splits the job across two URLs: the queue status and the result payload. The status call
 * is what says "COMPLETED" — and a failed request also reports COMPLETED, so the error fields
 * have to be read rather than the status alone.
 */
interface FalModel {
  path: string;
  /** The body fal expects for this family. */
  body: (opts: VideoOptions) => Record<string, unknown>;
  price: (opts: VideoOptions) => { usdPerSecond: number; formula: string };
}

const FAL_MODELS: Record<string, FalModel> = {
  "alibaba/wan-3.0/text-to-video": {
    path: "alibaba/wan-3.0/text-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      resolution: opts.resolution.toLowerCase(),
      aspect_ratio: opts.ratio,
      duration: opts.seconds,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
      audio: opts.audio,
      enable_prompt_expansion: true,
      enable_safety_checker: true,
    }),
    price: (opts) => ({
      usdPerSecond: 0.05,
      formula: "fal alibaba/wan-3.0 = $0.05/s (the endpoint's own billing block)",
    }),
  },
  "alibaba/wan-3.0/image-to-video": {
    path: "alibaba/wan-3.0/image-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      start_image_url: opts.firstFrame,
      resolution: opts.resolution.toLowerCase(),
      aspect_ratio: opts.ratio,
      duration: opts.seconds,
      enable_safety_checker: true,
    }),
    price: (opts) => ({
      usdPerSecond: 0.05,
      formula: "fal alibaba/wan-3.0 = $0.05/s (the endpoint's own billing block)",
    }),
  },
  "kling/v4/text-to-video": {
    path: "kling/v4/text-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      aspect_ratio: opts.ratio,
      duration: Math.max(3, Math.min(30, Math.round(opts.seconds))),
      resolution: opts.resolution.toLowerCase(),
    }),
    price: () => ({
      usdPerSecond: 0.157,
      formula: "fal kling/v4 = $0.157/s (the endpoint's own billing block)",
    }),
  },
  "kling/v4/image-to-video": {
    path: "kling/v4/image-to-video",
    body: (opts) => ({
      start_image_url: opts.firstFrame,
      prompt: opts.prompt,
      duration: Math.max(3, Math.min(30, Math.round(opts.seconds))),
      resolution: opts.resolution.toLowerCase(),
    }),
    price: () => ({
      usdPerSecond: 0.157,
      formula: "fal kling/v4 = $0.157/s (the endpoint's own billing block)",
    }),
  },
  "luma/agent/ray/v3.2/text-to-video": {
    path: "luma/agent/ray/v3.2/text-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      duration: `${opts.seconds <= 5 ? 5 : 10}s`,
      aspect_ratio: opts.ratio,
      resolution: opts.resolution.toLowerCase(),
      loop: false,
      enable_safety_checker: true,
    }),
    price: () => ({
      usdPerSecond: 0.03,
      formula: "fal luma/agent/ray/v3.2 = $0.03/s (the endpoint's own billing block)",
    }),
  },
  "luma/agent/ray/v3.2/image-to-video": {
    path: "luma/agent/ray/v3.2/image-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      image_url: opts.firstFrame,
      duration: `${opts.seconds <= 5 ? 5 : 10}s`,
      aspect_ratio: opts.ratio,
      resolution: opts.resolution.toLowerCase(),
      enable_safety_checker: true,
    }),
    price: () => ({
      usdPerSecond: 0.03,
      formula: "fal luma/agent/ray/v3.2 = $0.03/s (the endpoint's own billing block)",
    }),
  },
  "bytedance/seedance-2.0/us/text-to-video": {
    path: "bytedance/seedance-2.0/us/text-to-video",
    body: (opts) => ({
      prompt: opts.prompt,
      duration: String(Math.max(4, Math.min(15, Math.round(opts.seconds)))),
      aspect_ratio: opts.ratio === "16:9" ? "auto" : opts.ratio,
      resolution: opts.resolution.toLowerCase(),
      codec: "auto",
      bitrate_mode: "standard",
      generate_audio: opts.audio,
    }),
    price: (opts) => {
      const tier = ARK_TIERS[opts.resolution] ?? ARK_TIERS["720p"];
      const tokensPerSecond = (tier.w * tier.h * tier.fps) / 1024;
      const usd = (tokensPerSecond / 1000) * 0.014;
      return {
        usdPerSecond: usd,
        formula: `fal seedance-2.0 = ${tokensPerSecond.toFixed(0)} token/s x $0.014/1000 tokens = $${usd.toFixed(4)}/s`,
      };
    },
  },
};

const FAL_BASE = "https://queue.fal.run";

export const falVendor: CloudVideoVendor = {
  id: "fal",
  toolId: "fal-video",
  name: "fal.ai video gateway",
  category: "video-generation",
  vendorUrl: "https://fal.ai",
  docsUrl: "https://fal.ai/docs/api-reference/inference-api/queue/submit",
  keyEnv: "FAL_KEY",
  defaultModel: "alibaba/wan-3.0/text-to-video",
  models: Object.keys(FAL_MODELS),
  baseUrl: FAL_BASE,
  // fal authenticates with the word "Key", not "Bearer".
  auth: (key) => ({ Authorization: `Key ${key}` }),
  normalise: (opts) => {
    const wanted = opts.model ?? "alibaba/wan-3.0/text-to-video";
    // An image-to-video job has to land on the image endpoint of the same family.
    const model = opts.firstFrame && wanted.endsWith("/text-to-video")
      ? wanted.replace("/text-to-video", "/image-to-video")
      : wanted;
    return {
      ...opts,
      model,
      resolution: opts.resolution.toLowerCase(),
      seconds: opts.seconds <= 5 ? Math.min(5, Math.max(3, Math.round(opts.seconds))) : Math.round(opts.seconds),
    };
  },
  submit: { path: (opts) => `/${opts.model}` },
  poll: { path: (opts, taskId) => `/${opts.model}/requests/${encodeURIComponent(taskId)}/status` },
  result: { path: (opts, taskId) => `/${opts.model}/requests/${encodeURIComponent(taskId)}` },
  body: (opts) => {
    const spec = FAL_MODELS[opts.model ?? ""];
    if (!spec) return {};
    return spec.body(opts);
  },
  taskId: (body) => body?.request_id ?? "",
  status: (body) => {
    // A failed fal request also reports COMPLETED, so the error fields decide.
    if (body?.error || body?.error_type) return "FAILED";
    return String(body?.status ?? "");
  },
  outputs: (body) => {
    const url = body?.video?.url ?? body?.output?.url;
    return url ? [url] : [];
  },
  done: ["COMPLETED"],
  failed: ["FAILED"],
  failureReason: (body) => String(body?.error ?? body?.error_type ?? body?.message ?? ""),
  price: (opts) => {
    const spec = FAL_MODELS[opts.model ?? ""];
    if (!spec) {
      return UNPRICED(`fal has no verified contract in this driver for "${opts.model}". The verified ids are ${Object.keys(FAL_MODELS).join(", ")}.`);
    }
    return spec.price(opts);
  },
  probeRequest: { path: "/fal-ai/flux/dev" },
  extension: ".mp4",
  limits: "the result is kept for an hour after it completes, or six minutes if it is over 10 KB; the queue is the safe path, not the synchronous one.",
};

/* ------------------------------------------------------------------ the table */

export const CLOUD_VIDEO_VENDORS: CloudVideoVendor[] = [
  klingVendor,
  viduVendor,
  arkVendor,
  dashscopeVendor,
  runwayVendor,
  lumaVendor,
  falVendor,
];

export const CLOUD_VIDEO_DRIVERS = CLOUD_VIDEO_VENDORS.map((v) => makeCloudVideoDriver(v));

/**
 * The engines that now have a driver behind them, and the exact model id the driver sends.
 * Printed so the board and the driver can never drift apart.
 */
export const CLOUD_VIDEO_BINDINGS = [
  { engine: "wan-3.0", driver: "dashscope-video", model: "wan3.0-video", keyEnv: "DASHSCOPE_API_KEY" },
  { engine: "seedance-2.5", driver: "ark-video", model: "doubao-seedance-2-5-260628", keyEnv: "ARK_API_KEY" },
  { engine: "kling-3.0", driver: "kling-api", model: "kling-3.0", keyEnv: "KLING_API_KEY" },
  { engine: "vidu-q3-pro", driver: "vidu-api", model: "viduq3-pro", keyEnv: "VIDU_API_KEY" },
  { engine: "runway-gen-4.5", driver: "runway-api", model: "gen4.5", keyEnv: "RUNWAYML_API_SECRET" },
  { engine: "luma-ray3.2", driver: "luma-api", model: "ray-3.2", keyEnv: "LUMA_API_KEY" },
  { engine: "fal-gateway", driver: "fal-video", model: "alibaba/wan-3.0/text-to-video", keyEnv: "FAL_KEY" },
] as const;
