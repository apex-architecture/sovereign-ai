/**
 * Cloud video drivers — the rented bodies, driven for real.
 *
 * Every contract in this file was read from the vendor's own documentation or its own SDK. Each
 * one carries the doc URL it came from, so a reader can check it rather than trust it. Where a
 * figure is computed rather than printed by the vendor, the formula is printed with it.
 *
 * The shape of all four APIs is the same: submit a task, poll it, take the URL of the finished
 * video. So the driver is written once and each vendor supplies its own four pieces of paper:
 * where to submit, where to poll, how to read the task id, the status and the result URL.
 *
 * Three laws, enforced in code rather than in a promise:
 *   1. No key, no run. The creator brings their own key and pays their own bill. The platform
 *      never holds a key for a paid vendor and never spends its own money.
 *   2. An unpriced model is unquotable, never free. If the price cannot be computed, the call is
 *      refused before it is made.
 *   3. A credential never reaches a log, a result or Creative Memory. Errors are redacted.
 *
 * Google's Veo and Gemini Omni are deliberately absent: the house does not route to Google.
 * The rule lives in ONE place — HOUSE_POLICY — so it can be argued with rather than guessed at.
 */

import { mkdirSync, writeFileSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";

/** Providers the house does not route to. One list, so the rule can be argued with. */
export const HOUSE_POLICY = {
  bannedProviderHosts: [/^google\./i, /^vertex\./i, /^gemini\./i, /^anthropic\./i, /^openai\./i, /^xai\./i],
  note: "Google's Veo and Gemini Omni are catalogued and priced, but the house does not route to them.",
} as const;

/* ------------------------------------------------------------------ the vendor paper */

export interface CloudVideoVendor {
  /** Short id used in the tool registry. */
  id: string;
  /** The tool id the driver is registered under. */
  toolId: string;
  name: string;
  category: string;
  vendorUrl: string;
  /** Where the contract below was read. Printed with every refusal so it can be checked. */
  docsUrl: string;
  /** The environment variable holding the creator's own key for this vendor. */
  keyEnv: string;
  /** Environment variables that must also be set before a call can be made, and how. */
  requiredEnv?: { env: string; how: string }[];
  /** The model this driver uses when the job does not name one. */
  defaultModel: string;
  /** Every model id this vendor actually publishes. A job naming anything else is refused. */
  models: string[];
  /** The host, or a function that reads it from the environment at call time. */
  baseUrl: string | (() => string);
  /** Headers carrying the credential. */
  auth: (key: string) => Record<string, string>;
  /** Headers the vendor requires that are not credentials. */
  headers?: Record<string, string>;
  /** Where a job is submitted. A text-to-video job and an image-to-video job use different paths. */
  submit: { path: string | ((opts: VideoOptions) => string); method?: string };
  /** Where a job's state is read. */
  poll: { path: string | ((opts: VideoOptions, taskId: string) => string); method?: string };
  /**
   * Where the finished payload lives, when it is not in the poll response. fal keeps the queue
   * status and the result on two different URLs; without this the driver would see "COMPLETED"
   * and no file.
   */
  result?: { path: (opts: VideoOptions, taskId: string) => string; method?: string };
  /** USD per second of finished video, and how that number was arrived at. */
  price: (opts: VideoOptions) => { usdPerSecond: number; formula: string };
  /**
   * Bring a request into the shape the vendor actually accepts: the resolution case it spells
   * differently, the duration it rounds to a bracket, the ratio it does not have. This runs before
   * the price is computed, so the quote and the body are always the same request.
   */
  normalise?: (opts: VideoOptions) => VideoOptions;
  /** The request body. */
  body: (opts: VideoOptions) => Record<string, unknown>;
  /** The task id out of a submit response. */
  taskId: (body: any) => string;
  /** The status out of a poll response. */
  status: (body: any) => string;
  /** The finished media URLs out of a poll response. */
  outputs: (body: any) => string[];
  /** Statuses that mean the job is finished. */
  done: string[];
  /** Statuses that mean the job failed. */
  failed: string[];
  /** The failure reason the vendor gave, if it gave one. */
  failureReason?: (body: any) => string;
  /** A cheap call that proves the key works without spending money. */
  probeRequest: { path: string; method?: string; okStatus?: number };
  /** How a finished video is named on disk. */
  extension?: string;
  /** What this vendor cannot do, stated honestly. */
  limits: string;
}

export interface VideoOptions {
  prompt: string;
  seconds: number;
  resolution: string;
  ratio: string;
  /** The vendor's own model id, when the job names one. */
  model?: string;
  /** A first frame as a URL or a data URI, when the job is image-to-video. */
  firstFrame?: string;
  seed?: number;
  audio: boolean;
}

/* ------------------------------------------------------------------ helpers */

/** The host, resolved late so an environment change is picked up without a restart. */
function baseOf(vendor: CloudVideoVendor): string {
  return (typeof vendor.baseUrl === "function" ? vendor.baseUrl() : vendor.baseUrl).replace(/\/+$/, "");
}

/** A path that may be fixed, chosen by the request, or built around a task id. */
function submitPath(vendor: CloudVideoVendor, opts: VideoOptions): string {
  return typeof vendor.submit.path === "function" ? vendor.submit.path(opts) : vendor.submit.path;
}

function pollPath(vendor: CloudVideoVendor, opts: VideoOptions, taskId: string): string {
  return typeof vendor.poll.path === "function"
    ? vendor.poll.path(opts, taskId)
    : vendor.poll.path.replace("{id}", encodeURIComponent(taskId));
}

function redact(text: string, key: string): string {
  if (!key) return text;
  return text.split(key).join("[redacted]");
}

/** Options come from the job: `variant` is JSON or a `k=v,k=v` list. */
export function videoOptions(input: JobInput, defaults: { seconds: number; resolution: string; ratio: string; model?: string }): VideoOptions {
  const opts: VideoOptions = {
    prompt: input.task,
    seconds: defaults.seconds,
    resolution: defaults.resolution,
    ratio: defaults.ratio,
    audio: false,
  };
  if (defaults.model) opts.model = defaults.model;
  const raw = (input.variant ?? "").trim();
  if (raw) {
    let parsed: Record<string, unknown> = {};
    if (raw.startsWith("{")) {
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    } else {
      for (const pair of raw.split(",")) {
        const i = pair.indexOf("=");
        if (i > 0) parsed[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
      }
    }
    if (typeof parsed.seconds === "number" || typeof parsed.seconds === "string") opts.seconds = Number(parsed.seconds);
    if (typeof parsed.duration === "number" || typeof parsed.duration === "string") opts.seconds = Number(parsed.duration);
    if (typeof parsed.resolution === "string") opts.resolution = parsed.resolution;
    if (typeof parsed.ratio === "string") opts.ratio = parsed.ratio;
    if (typeof parsed.aspect_ratio === "string") opts.ratio = parsed.aspect_ratio;
    if (typeof parsed.model === "string") opts.model = parsed.model;
    if (typeof parsed.seed === "number" || typeof parsed.seed === "string") opts.seed = Number(parsed.seed);
    if (parsed.audio === true || parsed.audio === "true") opts.audio = true;
  }
  return opts;
}

/**
 * A local first frame becomes a data URI, because every one of these vendors accepts base64 and
 * a private machine's file path means nothing to them.
 */
export function frameToDataUri(fileOrUrl: string): string | null {
  if (/^https?:\/\//i.test(fileOrUrl)) return fileOrUrl;
  if (/^data:/i.test(fileOrUrl)) return fileOrUrl;
  try {
    const abs = path.resolve(fileOrUrl);
    if (!statSync(abs).isFile()) return null;
    const bytes = statSync(abs).size;
    if (bytes > 20 * 1024 * 1024) return null;
    const ext = path.extname(abs).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".bmp" ? "image/bmp" : "image/jpeg";
    return `data:${mime};base64,${readFileSync(abs).toString("base64")}`;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ ok: boolean; status: number; body: any; error?: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: String(e) };
  }
}

/* ------------------------------------------------------------------ the driver */

export function makeCloudVideoDriver(vendor: CloudVideoVendor): ToolDriver {
  const record = R({
    name: vendor.name,
    category: vendor.category,
    officialUrl: vendor.vendorUrl,
    sourceRepository: "proprietary service",
    license: "proprietary SaaS; the vendor's own API terms, not an open licence",
    licenseVerified: false,
    selfHosting: false,
    localExecution: false,
    apiAvailable: true,
    hardware: "provider GPUs",
    integrationMethod: "http-api",
    cost: "per second of finished video, billed to the creator's own key",
    capability: `generates video from a prompt${vendor.limits ? " — " + vendor.limits : ""}`,
    priority: "now",
    replacementOptions: ["open weights on a rented GPU (Wan, Hunyuan, LTX)", "another vendor's API", "a local model on your own card"],
    dataPortability: "the finished file is ordinary media you keep; the task history is account-bound",
    apiTerms: "restricted",
    outputConditions: "the vendor's terms attach to the output; verify per model, not per host",
  });

  return {
    toolId: vendor.toolId,
    depth: "drivable",
    record,
    runsOn: "any",

    async probe() {
      const key = process.env[vendor.keyEnv];
      if (!key) {
        return { ok: false, why: `${vendor.keyEnv} not set — the creator connects their own ${vendor.name} account; the platform lends no key and no money` };
      }
      const method = vendor.probeRequest.method ?? "GET";
      const url = baseOf(vendor) + vendor.probeRequest.path;
      const res = await fetchJson(url, {
        method,
        headers: { ...vendor.headers, ...vendor.auth(key), "content-type": "application/json" },
        body: method === "POST" ? "{}" : undefined,
      }, 15000);
      const okStatus = vendor.probeRequest.okStatus ?? 200;
      if (res.ok || res.status === okStatus) {
        return { ok: true, why: `${vendor.name} accepted the key (HTTP ${res.status})` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, why: `${vendor.name} rejected the key (HTTP ${res.status}) — check ${vendor.keyEnv}` };
      }
      // A 404 on a probe path proves the credential was not rejected: the vendor answered with a
      // routing complaint, not an authentication complaint. It is not proof the key works.
      if (res.status === 404) {
        return { ok: true, why: `${vendor.name} answered HTTP 404 for the probe path — the credential was not rejected (no 401, no 403)` };
      }
      return { ok: false, why: `${vendor.name} probe failed: HTTP ${res.status} ${String(res.error ?? "").slice(0, 120)}` };
    },

    async run(input: JobInput): Promise<JobResult> {
      const started = Date.now();
      const key = process.env[vendor.keyEnv];
      if (!key) {
        return fail(input, started, 0, `no ${vendor.keyEnv} — bring your own key; the platform lends no key and no money. Contract: ${vendor.docsUrl}`);
      }

      for (const need of vendor.requiredEnv ?? []) {
        if (!process.env[need.env]) {
          return fail(input, started, 0, `no ${need.env} — ${need.how}. Contract: ${vendor.docsUrl}`);
        }
      }

      const asked = videoOptions(input, { seconds: 5, resolution: "1080p", ratio: "16:9", model: vendor.defaultModel });
      const opts = vendor.normalise ? vendor.normalise(asked) : asked;
      if (opts.model && !vendor.models.includes(opts.model)) {
        return fail(input, started, 0, `refused: ${vendor.name} does not publish a model called "${opts.model}". It publishes ${vendor.models.join(", ")}. Contract: ${vendor.docsUrl}`);
      }
      const price = vendor.price(opts);
      if (!Number.isFinite(price.usdPerSecond) || price.usdPerSecond < 0) {
        return fail(input, started, 0, `refused: ${vendor.name} cannot be priced for this request. An unpriced model is unquotable, never free. ${price.formula}`);
      }
      const estimate = price.usdPerSecond * opts.seconds;
      if (estimate > input.budgetUsd) {
        return fail(input, started, 0, `refused: ${opts.seconds}s of ${vendor.name} costs about $${estimate.toFixed(2)} (${price.formula}), this job is capped at $${input.budgetUsd}`);
      }

      // A first frame, if the job has one and the vendor can take it.
      let firstFrame: string | undefined;
      if (input.inputs.length) {
        const uri = frameToDataUri(input.inputs[0]);
        if (!uri) {
          return fail(input, started, 0, `refused: the first frame ${input.inputs[0]} could not be read or is larger than the 20 MB these vendors accept`);
        }
        firstFrame = uri;
      }
      opts.firstFrame = firstFrame;

      const headers = {
        ...vendor.headers,
        ...vendor.auth(key),
        "content-type": "application/json",
      };

      // ---- submit
      const submitUrl = baseOf(vendor) + submitPath(vendor, opts);
      const submit = await fetchJson(submitUrl, {
        method: vendor.submit.method ?? "POST",
        headers,
        body: JSON.stringify(vendor.body(opts)),
      }, Math.min(input.timeoutSeconds, 120) * 1000);

      if (!submit.ok) {
        const why = vendor.failureReason?.(submit.body) ?? (typeof submit.body === "string" ? submit.body : JSON.stringify(submit.body ?? {}));
        return fail(input, started, 0, `${vendor.name} refused the job: HTTP ${submit.status} ${redact(String(why), key).slice(0, 240)}`);
      }
      const taskId = vendor.taskId(submit.body);
      if (!taskId) {
        return fail(input, started, 0, `${vendor.name} accepted the job but returned no task id: ${redact(JSON.stringify(submit.body).slice(0, 200), key)}`);
      }

      // ---- poll
      const deadline = Date.now() + input.timeoutSeconds * 1000;
      let status = vendor.status(submit.body);
      let last: any = submit.body;
      while (Date.now() < deadline) {
        if (vendor.done.includes(status)) break;
        if (vendor.failed.includes(status)) {
          const why = vendor.failureReason?.(last) ?? "";
          return fail(input, started, 0, `${vendor.name} job ${taskId} ${status}${why ? ": " + redact(String(why), key).slice(0, 240) : ""}`);
        }
        await new Promise((r) => setTimeout(r, 4000));
        const pollUrl = baseOf(vendor) + pollPath(vendor, opts, taskId);
        const polled = await fetchJson(pollUrl, { method: vendor.poll.method ?? "GET", headers }, 20000);
        if (!polled.ok) {
          return fail(input, started, 0, `${vendor.name} poll failed: HTTP ${polled.status} ${redact(String(polled.error ?? ""), key).slice(0, 160)}`);
        }
        last = polled.body;
        status = vendor.status(last);
      }

      if (!vendor.done.includes(status)) {
        return {
          state: "timed-out",
          outputs: [],
          wallClockSeconds: (Date.now() - started) / 1000,
          usdSpent: 0,
          reproducible: { vendor: vendor.id, taskId, status },
          log: `${vendor.name} job ${taskId} was still ${status} when the ${input.timeoutSeconds}s ceiling hit. It keeps running at the vendor; nothing was charged by us.`,
        };
      }

      // ---- take the file
      let payload = last;
      if (vendor.result) {
        const resultUrl = baseOf(vendor) + vendor.result.path(opts, taskId);
        const got = await fetchJson(resultUrl, { method: vendor.result.method ?? "GET", headers }, 30000);
        if (!got.ok) {
          return fail(input, started, 0, `${vendor.name} job ${taskId} finished but its result could not be read: HTTP ${got.status}`);
        }
        payload = got.body;
      }
      const urls = vendor.outputs(payload);
      if (!urls.length) {
        return fail(input, started, 0, `${vendor.name} job ${taskId} finished with no output URL: ${redact(JSON.stringify(payload).slice(0, 200), key)}`);
      }
      const dir = path.resolve(OUT, "motion", input.projectId);
      mkdirSync(dir, { recursive: true });
      const ext = vendor.extension ?? ".mp4";
      const files: string[] = [];
      const remote: string[] = [];
      for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i];
        remote.push(url);
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = Buffer.from(await res.arrayBuffer());
          const file = path.join(dir, `${input.sceneId}${i > 0 ? `-${i}` : ""}${ext}`);
          writeFileSync(file, bytes);
          files.push(file);
        } catch (e) {
          // The URL is short-lived on every one of these vendors. If the fetch failed the remote
          // link is still printed so the creator can pull it by hand.
          return {
            state: "failed",
            outputs: files,
            wallClockSeconds: (Date.now() - started) / 1000,
            usdSpent: estimate,
            reproducible: { vendor: vendor.id, taskId, remoteUrls: remote, options: opts },
            log: `${vendor.name} job ${taskId} finished but the file could not be pulled: ${String(e).slice(0, 160)}. Pull it by hand before the link expires: ${remote.join(" ")}`,
          };
        }
      }

      return {
        state: "succeeded",
        outputs: files,
        wallClockSeconds: (Date.now() - started) / 1000,
        usdSpent: estimate,
        reproducible: { vendor: vendor.id, taskId, remoteUrls: remote, options: opts, priceFormula: price.formula },
        log: `${vendor.name} made ${opts.seconds}s at ${opts.resolution} in ${((Date.now() - started) / 1000).toFixed(1)}s, about $${estimate.toFixed(2)} (${price.formula}) — ${files.join(" ")}`,
      };
    },
  };
}

function fail(input: JobInput, started: number, usdSpent: number, log: string): JobResult {
  return { state: "failed", outputs: [], wallClockSeconds: (Date.now() - started) / 1000, usdSpent, reproducible: {}, log };
}
