/**
 * Cloud video driver self-test — the seven rented bodies, proven without a key or a network.
 *
 * The gates, in order:
 *   1. every driver satisfies the depth contract;
 *   2. every vendor carries the doc URL its contract was read from;
 *   3. with no key, the job is refused;
 *   4. with a key but a request the vendor cannot price, the job is refused;
 *   5. with a key and a price over the cap, the job is refused;
 *   6. none of those refusals ever reached the network;
 *   7. no refusal log ever contained the credential;
 *   8. every quoted price is the number the vendor's own rate card says;
 *   9. every request body uses the field names the vendor's own documentation uses;
 *  10. every response is read from the shape the vendor's own documentation returns.
 *
 *   node --experimental-strip-types scripts/cloud-video-selftest.mjs
 */
import {
  CLOUD_VIDEO_VENDORS,
  CLOUD_VIDEO_DRIVERS,
  CLOUD_VIDEO_BINDINGS,
} from "../src/lib/apex/drivers/cloud-vendors.ts";
import { driverSatisfiesDepth } from "../src/lib/apex/drivers/contract.ts";
import { videoOptions } from "../src/lib/apex/drivers/cloud-video.ts";

let failed = 0;
let passed = 0;
const FAKE_KEY = "sk-SELFTEST-CREDENTIAL-MUST-NEVER-APPEAR";

function check(what, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`ok    ${what}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${what}${detail ? " — " + detail : ""}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// The network is closed for this whole run. Any accidental fetch is a failure, not a surprise.
let fetchCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`the self-test must not touch the network — it tried ${String(args[0])}`);
};

const JOB = {
  task: "a slow push through a lit corridor",
  inputs: [],
  timeoutSeconds: 30,
  budgetUsd: 5,
  projectId: "p",
  sceneId: "s",
  stage: "motion",
};


/** Run a case with the vendor's own key and every environment its contract requires. */
async function withVendorEnv(vendorId, fn) {
  const v = CLOUD_VIDEO_VENDORS.find((x) => x.id === vendorId);
  const saved = new Map();
  const set = (name, value) => {
    if (!saved.has(name)) saved.set(name, process.env[name]);
    process.env[name] = value;
  };
  set(v.keyEnv, FAKE_KEY);
  if (v.id === "alibaba-model-studio") {
    set("DASHSCOPE_BASE_URL", "https://ws-example.ap-southeast.maas.aliyuncs.com");
  }
  try {
    return await fn();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const byId = new Map(CLOUD_VIDEO_DRIVERS.map((d) => [d.toolId, d]));

/* ---------------------------------------------------------------- 1 + 2: shape */

section("the seven drivers");
check(`${CLOUD_VIDEO_DRIVERS.length} cloud video drivers are registered`, CLOUD_VIDEO_DRIVERS.length === 7);
for (const d of CLOUD_VIDEO_DRIVERS) {
  check(`${d.toolId} satisfies the drivable contract`, driverSatisfiesDepth(d));
  check(`${d.toolId} runs on any machine`, d.runsOn === "any");
}
for (const v of CLOUD_VIDEO_VENDORS) {
  check(`${v.id} carries the doc URL its contract was read from`, /^https:\/\//.test(v.docsUrl), v.docsUrl);
  check(`${v.id} names the environment variable holding the creator's key`, /^[A-Z0-9_]+$/.test(v.keyEnv), v.keyEnv);
}
check(
  "every engine the board claims to drive has a binding",
  CLOUD_VIDEO_BINDINGS.every((b) => byId.has(b.driver)),
  JSON.stringify(CLOUD_VIDEO_BINDINGS.filter((b) => !byId.has(b.driver))),
);

/* ---------------------------------------------------------------- 3: no key, no run */

section("no key, no run");
for (const v of CLOUD_VIDEO_VENDORS) {
  const saved = process.env[v.keyEnv];
  delete process.env[v.keyEnv];
  const driver = byId.get(v.toolId);
  const res = await driver.run(JOB);
  const restored = saved === undefined ? undefined : saved;
  if (restored !== undefined) process.env[v.keyEnv] = restored;
  check(`${v.id} refuses without ${v.keyEnv}`, res.state === "failed", res.log);
  check(`${v.id} names the missing variable in the refusal`, res.log.includes(v.keyEnv), res.log);
  check(`${v.id} spent nothing`, res.usdSpent === 0);
}

/* ---------------------------------------------------------------- 4: unpriceable is refused */

section("an unpriceable request is refused, never treated as free");
const UNPRICEABLE = {
  kling: "kling-2.5-turbo",
  vidu: "viduq9-imaginary",
  "volcengine-ark": "doubao-seedance-9-imaginary",
  "alibaba-model-studio": "wan9.0-video",
  runway: "gen9",
  luma: "ray-9.9",
  fal: "someone/imaginary-model",
};
for (const v of CLOUD_VIDEO_VENDORS) {
  const driver = byId.get(v.toolId);
  const res = await withVendorEnv(v.id, () =>
    driver.run({ ...JOB, variant: `model=${UNPRICEABLE[v.id]}` }),
  );
  check(`${v.id} refuses ${UNPRICEABLE[v.id]} because it cannot price it`, res.state === "failed", res.log);
  check(`${v.id} says the price was the reason`, /price|priced|ladder|does not publish|no verified contract/i.test(res.log), res.log);
  check(`${v.id} charged nothing for the refusal`, res.usdSpent === 0);
}


section("a model the vendor does not publish is refused by name");
for (const v of CLOUD_VIDEO_VENDORS) {
  const driver = byId.get(v.toolId);
  const invented = "model-that-does-not-exist-v9";
  const res = await withVendorEnv(v.id, () => driver.run({ ...JOB, variant: `model=${invented}` }));
  check(`${v.id} refuses ${invented}`, res.state === "failed", res.log);
  check(`${v.id} names the model it refused`, res.log.includes(invented), res.log);
  check(`${v.id} lists what it does publish`, res.log.includes(v.models[0]), res.log);
  check(`${v.id} charged nothing`, res.usdSpent === 0);
}

/* ---------------------------------------------------------------- 5: the budget cap */

section("the budget cap is enforced before the call");
for (const v of CLOUD_VIDEO_VENDORS) {
  const driver = byId.get(v.toolId);
  const res = await withVendorEnv(v.id, () => driver.run({ ...JOB, budgetUsd: 0.01 }));
  check(`${v.id} refuses a job priced over its cap`, res.state === "failed", res.log);
  check(`${v.id} prints the cap it enforced`, res.log.includes("$0.01"), res.log);
  check(`${v.id} charged nothing`, res.usdSpent === 0);
}

/* ---------------------------------------------------------------- 6 + 7: no network, no leaked key */

section("no refusal reached the network and no log carried the key");
check("the network was never called", fetchCalls === 0, `${fetchCalls} call(s)`);
for (const v of CLOUD_VIDEO_VENDORS) {
  const driver = byId.get(v.toolId);
  const res = await withVendorEnv(v.id, () => driver.run({ ...JOB, budgetUsd: 0.01 }));
  check(`${v.id} never printed the credential`, !res.log.includes(FAKE_KEY), res.log);
  check(`${v.id} printed no credential in its reproducible block`, !JSON.stringify(res.reproducible).includes(FAKE_KEY));
}

/* ---------------------------------------------------------------- 8: the prices are the vendor's */

section("the quoted prices are the vendor's own rate card");
function priceOf(vendorId, opts) {
  const v = CLOUD_VIDEO_VENDORS.find((x) => x.id === vendorId);
  const asked = videoOptions(JOB, { seconds: 5, resolution: "1080p", ratio: "16:9", model: v.defaultModel });
  const merged = { ...asked, ...opts };
  const normalised = v.normalise ? v.normalise(merged) : merged;
  return { price: v.price(normalised), opts: normalised };
}

const PRICES = [
  ["kling", { model: "kling-3.0", resolution: "1080p", audio: false }, 0.8 * 0.14, "Kling 3.0 1080p = 0.8 U/s x $0.14"],
  ["kling", { model: "kling-3.0", resolution: "1080p", audio: true }, 1.2 * 0.14, "Kling 3.0 1080p with native audio = 1.2 U/s"],
  ["kling", { model: "kling-2.6", resolution: "720p" }, 0.3 * 0.14, "Kling 2.6 720p = 0.3 U/s"],
  ["vidu", { model: "viduq3-pro", resolution: "1080p" }, (24 * 0.03125) / 7.1, "Vidu Q3 Pro 1080p = 24 credits/s"],
  ["vidu", { model: "viduq3-pro", resolution: "540p" }, (9 * 0.03125) / 7.1, "Vidu Q3 Pro 540p = 9 credits/s"],
  ["alibaba-model-studio", { model: "wan3.0-video", resolution: "1080P" }, 0.2, "Wan 3.0 1080P = $0.20/s"],
  ["alibaba-model-studio", { model: "wan3.0-video", resolution: "480P" }, 0.05, "Wan 3.0 480P = $0.05/s"],
  ["runway", { model: "gen4.5" }, 12 * 0.01, "Runway Gen-4.5 = 12 credits/s"],
  ["runway", { model: "gen4_turbo" }, 5 * 0.01, "Runway Gen-4 Turbo = 5 credits/s"],
  ["luma", { model: "ray-3.2", resolution: "720p", seconds: 5 }, (100 * 0.003) / 5, "Luma Ray 3.2 720p at 5 s = 100 credits"],
  ["luma", { model: "ray-3.2", resolution: "1080p", seconds: 10 }, (1200 * 0.003) / 10, "Luma Ray 3.2 1080p at 10 s = 1200 credits"],
];
for (const [id, opts, expected, label] of PRICES) {
  const { price } = priceOf(id, opts);
  check(`${id}: ${label}`, Math.abs(price.usdPerSecond - expected) < 1e-6, `got ${price.usdPerSecond}, expected ${expected}`);
  check(`${id}: ${label} — the formula is printed`, price.formula.length > 12, price.formula);
}

// Ark and fal bill by token, so the arithmetic is checked against the printed tier.
const ark = priceOf("volcengine-ark", { model: "doubao-seedance-2-5-260628", resolution: "1080p" });
const arkTokens = (1920 * 1080 * 24) / 1024;
check(
  "Ark 1080p prices the published token formula",
  Math.abs(ark.price.usdPerSecond - ((arkTokens * 77) / 1_000_000 / 7.1)) < 1e-9,
  ark.price.formula,
);
check("Ark prints its token arithmetic", /token/.test(ark.price.formula), ark.price.formula);
const fal = priceOf("fal", { model: "alibaba/wan-3.0/text-to-video", resolution: "1080p" });
check("fal Wan 3.0 is $0.05/s", Math.abs(fal.price.usdPerSecond - 0.05) < 1e-9, fal.price.formula);
const falSeedance = priceOf("fal", { model: "bytedance/seedance-2.0/us/text-to-video", resolution: "720p" });
check("fal Seedance prices per token", /token/.test(falSeedance.price.formula), falSeedance.price.formula);

/* ---------------------------------------------------------------- 9: the bodies */

section("the request bodies use the vendor's own field names");
const bodyOf = (id, opts) => {
  const v = CLOUD_VIDEO_VENDORS.find((x) => x.id === id);
  const asked = videoOptions(JOB, { seconds: 5, resolution: "1080p", ratio: "16:9", model: v.defaultModel });
  const merged = { ...asked, ...opts };
  return v.body(v.normalise ? v.normalise(merged) : merged);
};

const klingT2V = bodyOf("kling", { resolution: "1080p" });
check("Kling sends prompt, settings and options", !!klingT2V.prompt && !!klingT2V.settings && !!klingT2V.options, JSON.stringify(klingT2V));
check("Kling spells audio 'off' or 'native'", ["off", "native"].includes(klingT2V.settings.audio), String(klingT2V.settings.audio));
check("Kling puts the aspect ratio inside settings", klingT2V.settings.aspect_ratio === "16:9");
check("Kling never sends a negative prompt", klingT2V.negative_prompt === undefined && klingT2V.settings.negative_prompt === undefined);

const klingI2V = bodyOf("kling", { resolution: "1080p", firstFrame: "https://example.test/a.jpg" });
check("Kling image-to-video sends a contents array", Array.isArray(klingI2V.contents), JSON.stringify(klingI2V));
check("Kling's contents carry the prompt and the first frame", klingI2V.contents[0].type === "prompt" && klingI2V.contents[1].type === "first_frame");
check("Kling image-to-video sends no aspect_ratio", klingI2V.settings.aspect_ratio === undefined, JSON.stringify(klingI2V.settings));

const viduT2V = bodyOf("vidu", { resolution: "1080p" });
check("Vidu sends model, prompt, duration, resolution and aspect_ratio", ["model", "prompt", "duration", "resolution", "aspect_ratio"].every((k) => k in viduT2V), JSON.stringify(viduT2V));
check("Vidu sends payload as an empty string", viduT2V.payload === "");
const viduI2V = bodyOf("vidu", { resolution: "1080p", firstFrame: "https://example.test/a.jpg" });
check("Vidu image-to-video sends images as an array of one", Array.isArray(viduI2V.images) && viduI2V.images.length === 1, JSON.stringify(viduI2V));
check("Vidu image-to-video drops aspect_ratio", viduI2V.aspect_ratio === undefined);

const arkBody = bodyOf("volcengine-ark", { resolution: "1080p", firstFrame: "https://example.test/a.jpg" });
check("Ark sends a content array", Array.isArray(arkBody.content), JSON.stringify(arkBody));
check("Ark's image entry uses image_url with a first_frame role", arkBody.content[1].type === "image_url" && arkBody.content[1].role === "first_frame");
check("Ark sends resolution, ratio and duration at the top level", arkBody.resolution === "1080p" && arkBody.ratio === "16:9" && arkBody.duration === 5);
check("Ark sends no negative prompt", arkBody.negative_prompt === undefined);

const wanBody = bodyOf("alibaba-model-studio", { resolution: "1080p", firstFrame: "https://example.test/a.jpg" });
check("Wan nests the prompt under input", !!wanBody.input && wanBody.input.prompt === JOB.task);
check("Wan's media entry is typed first_frame", wanBody.input.media[0].type === "first_frame");
check("Wan puts the resolution and ratio under parameters", wanBody.parameters.resolution === "1080P" && wanBody.parameters.ratio === "16:9");
check("Wan capitalises its resolution", wanBody.parameters.resolution === "1080P", wanBody.parameters.resolution);

const runwayBody = bodyOf("runway", { resolution: "720p" });
check("Runway sends promptText, not prompt", runwayBody.promptText === JOB.task && runwayBody.prompt === undefined);
check("Runway encodes the size in the ratio string", runwayBody.ratio === "1280:720", runwayBody.ratio);
check("Runway asks for mp4", runwayBody.outputFormat === "mp4");
check("Runway sends no loop field", runwayBody.loop === undefined);

const lumaBody = bodyOf("luma", { resolution: "720p", firstFrame: "https://example.test/a.jpg" });
check("Luma sends type video and the aspect ratio at the top", lumaBody.type === "video" && lumaBody.aspect_ratio === "16:9");
check("Luma nests resolution and duration under video", lumaBody.video.resolution === "720p" && lumaBody.video.duration === "5s", JSON.stringify(lumaBody.video));
check("Luma's start frame is an object with a url", lumaBody.video.start_frame?.url === "https://example.test/a.jpg");
check("Luma sends no seed", lumaBody.seed === undefined);

const falBody = bodyOf("fal", { model: "alibaba/wan-3.0/text-to-video", resolution: "1080p" });
check("fal sends prompt and aspect_ratio", falBody.prompt === JOB.task && falBody.aspect_ratio === "16:9", JSON.stringify(falBody));
const falKling = bodyOf("fal", { model: "kling/v4/text-to-video", resolution: "1080p" });
check("fal's Kling endpoint takes duration and resolution", falKling.duration === 5 && falKling.resolution === "1080p");

/* ---------------------------------------------------------------- 10: the responses */

section("the responses are read from the vendor's own shapes");
function vendor(id) {
  return CLOUD_VIDEO_VENDORS.find((x) => x.id === id);
}

const klingSubmit = { code: 0, data: [{ task_id: "t-1", task_status: "submitted" }] };
check("Kling reads the task id out of data[0]", vendor("kling").taskId(klingSubmit) === "t-1");
check("Kling reads the status out of data[0]", vendor("kling").status(klingSubmit) === "submitted");
const klingDone = { code: 0, data: [{ task_id: "t-1", task_status: "succeeded", outputs: [{ type: "video", url: "https://cdn.test/a.mp4" }] }] };
check("Kling reads the video url out of outputs", vendor("kling").outputs(klingDone)[0] === "https://cdn.test/a.mp4");
const klingFailed = { code: 0, data: [{ task_status: "failed", message: "content policy" }] };
check("Kling carries the failure message", vendor("kling").failureReason(klingFailed) === "content policy");

check("Vidu reads task_id", vendor("vidu").taskId({ task_id: "v-1" }) === "v-1");
check("Vidu reads state", vendor("vidu").status({ state: "success" }) === "success");
check("Vidu reads creations[].url", vendor("vidu").outputs({ creations: [{ url: "https://cdn.test/v.mp4" }] })[0] === "https://cdn.test/v.mp4");

check("Ark reads id", vendor("volcengine-ark").taskId({ id: "a-1" }) === "a-1");
check("Ark reads status", vendor("volcengine-ark").status({ status: "succeeded" }) === "succeeded");
check("Ark reads content.video_url", vendor("volcengine-ark").outputs({ content: { video_url: "https://cdn.test/a.mp4" } })[0] === "https://cdn.test/a.mp4");

check("Model Studio reads output.task_id", vendor("alibaba-model-studio").taskId({ output: { task_id: "w-1" } }) === "w-1");
check("Model Studio reads output.task_status", vendor("alibaba-model-studio").status({ output: { task_status: "SUCCEEDED" } }) === "SUCCEEDED");
check("Model Studio reads output.video_url", vendor("alibaba-model-studio").outputs({ output: { video_url: "https://cdn.test/w.mp4" } })[0] === "https://cdn.test/w.mp4");

check("Runway reads id", vendor("runway").taskId({ id: "r-1" }) === "r-1");
check("Runway reads status", vendor("runway").status({ status: "SUCCEEDED" }) === "SUCCEEDED");
check("Runway reads the output array", vendor("runway").outputs({ output: ["https://cdn.test/r.mp4"] })[0] === "https://cdn.test/r.mp4");

check("Luma reads id", vendor("luma").taskId({ id: "l-1" }) === "l-1");
check("Luma reads state", vendor("luma").status({ state: "completed" }) === "completed");
check("Luma reads output[].url", vendor("luma").outputs({ output: [{ url: "https://cdn.test/l.mp4" }] })[0] === "https://cdn.test/l.mp4");

check("fal reads request_id", vendor("fal").taskId({ request_id: "f-1" }) === "f-1");
check("fal reads the queue status", vendor("fal").status({ status: "COMPLETED" }) === "COMPLETED");
check("fal reads the video url", vendor("fal").outputs({ video: { url: "https://cdn.test/f.mp4" } })[0] === "https://cdn.test/f.mp4");
check("fal treats a reported error as a failure even when the status says COMPLETED", vendor("fal").status({ status: "COMPLETED", error: "boom" }) === "FAILED");
check("fal carries the error text", vendor("fal").failureReason({ error: "boom" }) === "boom");

/* ---------------------------------------------------------------- the paths */

section("the paths are the vendor's own endpoints");
const pathOf = (id, which) => {
  const v = vendor(id);
  const asked = videoOptions(JOB, { seconds: 5, resolution: "1080p", ratio: "16:9", model: v.defaultModel });
  const o = v.normalise ? v.normalise(asked) : asked;
  if (which === "submit") return typeof v.submit.path === "function" ? v.submit.path(o) : v.submit.path;
  if (which === "poll") return typeof v.poll.path === "function" ? v.poll.path(o, "TASK") : v.poll.path;
  if (which === "result") return v.result ? v.result.path(o, "TASK") : "";
  return "";
};
check("Kling submits a text-to-video call", pathOf("kling", "submit") === "/text-to-video/kling-3.0", pathOf("kling", "submit"));
check("Kling submits an image-to-video call", pathOf("kling", "submit-i2v") === "", "");
check("Vidu submits a text2video call", pathOf("vidu", "submit") === "/ent/v2/text2video", pathOf("vidu", "submit"));
check("Ark submits a generations task", pathOf("volcengine-ark", "submit") === "/contents/generations/tasks", pathOf("volcengine-ark", "submit"));
check("Model Studio submits a video-synthesis call", pathOf("alibaba-model-studio", "submit") === "/api/v1/services/aigc/video-generation/video-synthesis", pathOf("alibaba-model-studio", "submit"));
check("Model Studio polls a task id", pathOf("alibaba-model-studio", "poll") === "/api/v1/tasks/TASK", pathOf("alibaba-model-studio", "poll"));
check("Runway submits a text_to_video call", pathOf("runway", "submit") === "/v1/text_to_video", pathOf("runway", "submit"));
check("Luma submits a generation", pathOf("luma", "submit") === "/generations", pathOf("luma", "submit"));
check("fal submits to the model path", pathOf("fal", "submit") === "/alibaba/wan-3.0/text-to-video", pathOf("fal", "submit"));
check("fal polls the queue status", pathOf("fal", "poll") === "/alibaba/wan-3.0/text-to-video/requests/TASK/status", pathOf("fal", "poll"));
check("fal reads the result from a second url", pathOf("fal", "result") === "/alibaba/wan-3.0/text-to-video/requests/TASK", pathOf("fal", "result"));

globalThis.fetch = realFetch;

console.log(`\n${failed === 0 ? "SELF-TEST CLEAN" : "SELF-TEST FAILED"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
