/**
 * The driver table — what APEX can actually reach today, stated per stage.
 *
 * A stage with no driver here is a gap the platform admits, which is worth more than a
 * stage that appears integrated and fails in front of a customer.
 */

import type { JobInput, ToolDriver } from "./contract.ts";
import { ffmpegDriver } from "./ffmpeg.ts";
import { makeComfyDriver, type GraphResolver } from "./comfyui.ts";
import { ollamaDriver } from "./ollama.ts";
import { makeReplicateDriver } from "./replicate.ts";
import { blenderDriver, whisperDriver } from "./cli-drivers.ts";
import { piperDriver } from "./piper.ts";
import { sapiDriver } from "./sapi.ts";
import { agentDesktopDriver } from "./agent-desktop.ts";
import { routerDriver } from "./router.ts";
import { freeBusDriver } from "./free-bus.ts";
import { scoreDriver } from "./score.ts";
import { ardourDriver, kdenliveDriver, makePortalDriver, resolveDriver } from "./studio.ts";
import { deliveryDriver } from "./delivery.ts";
import { CLOUD_VIDEO_DRIVERS } from "./cloud-vendors.ts";

export interface DriverConfig {
  /** Per-stage ComfyUI graphs, loaded from the project, not hard-coded here. */
  comfyGraphs: GraphResolver;
  /** Which hosted model serves a stage, and what one job costs. */
  replicate: {
    modelFor: (input: JobInput) => string;
    usdPerJob: (model: string) => number;
  };
}

export function buildDrivers(config: DriverConfig): ToolDriver[] {
  const youtube = makePortalDriver("youtube", "YouTube Studio", "https://studio.youtube.com", (input) => `https://studio.youtube.com/?project=${input.projectId}`);
  return [ffmpegDriver, deliveryDriver, blenderDriver, whisperDriver, piperDriver, sapiDriver, agentDesktopDriver, routerDriver, freeBusDriver, scoreDriver, ollamaDriver, makeComfyDriver(config.comfyGraphs), makeReplicateDriver(config.replicate.modelFor, config.replicate.usdPerJob), kdenliveDriver, resolveDriver, ardourDriver, youtube, ...CLOUD_VIDEO_DRIVERS];
}

/** Preference order per film stage. Only stages with a real driver appear. */
export function stageRoutes(drivers: ToolDriver[]): Record<string, ToolDriver[]> {
  const by = (id: string) => drivers.find((d) => d.toolId === id);
  const pick = (...ids: string[]) => ids.map(by).filter((d): d is ToolDriver => Boolean(d));
  return {
    // The writing stages run on a local model first (Ollama, nothing leaves the machine), then on
    // whatever bus the creator has credentials for. A stage with no reachable writer stays a gap.
    story: pick("ollama", "router", "free_bus"),
    script: pick("ollama", "router", "free_bus"),
    shotlist: pick("ollama", "router", "free_bus"),
    storyboard: pick("comfyui", "blender"),
    character_lock: pick("comfyui"),
    /**
     * Hosted models first, then local generation, then the plate itself: a still pushed through
     * ffmpeg's move-and-grade still becomes a shot, which is the difference between a pipeline
     * that stalls when a provider is down and one that ships something you can watch.
     *
     * The seven rented bodies sit behind Replicate because each one needs the creator's own key.
     * A vendor with no key fails its probe and the route falls through to the next one, so an
     * uncredentialed account costs nothing and blocks nothing.
     */
    motion: pick("replicate", "kling-api", "vidu-api", "ark-video", "dashscope-video", "runway-api", "luma-api", "fal-video", "comfyui", "blender", "ffmpeg"),
    /**
     * The voice runs on the creator's own CPU: no key, no account, and the line comes back as a wav
     * whose length is measured from the file, so dialogue can be cut to it rather than guessed at.
     * Piper first when a voice pack exists; the operating system's own voice when it does not,
     * because a stage that waits for a download is a stage that produces nothing today.
     */
    dialogue: pick("piper", "windows_sapi"),
    /**
     * The score bench comes first because it is the only music engine that exists on this machine:
     * it renders a bed offline with no key and no download, and mixes any licensed cue the film
     * already carries. Ardour stays behind it for the human stem work.
     */
    music: pick("apex_score", "ardour"),
    sound: pick("apex_score", "ffmpeg", "ardour"),
    subtitles: pick("whisper", "ffmpeg"),
    edit: pick("ffmpeg", "kdenlive", "davinci_resolve"),
    finish: pick("ffmpeg", "davinci_resolve", "blender"),
    publish: pick("ffmpeg-delivery", "youtube"),
  };
}

/** Stages the film pipeline expects but nothing is wired to yet. */
export const STAGES_THE_PIPELINE_NAMES = [
  "story",
  "script",
  "shotlist",
  "storyboard",
  "character_lock",
  "motion",
  "dialogue",
  "music",
  "sound",
  "subtitles",
  "edit",
  "finish",
  "publish",
];
