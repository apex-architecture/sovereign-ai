/**
 * The switchboard — ten stages, four plugs, and an honest answer for every one.
 *
 * The platform routes; it never computes. Given what a creator has actually plugged in, this
 * resolves each stage to the best available path or reports `not connected`. It never invents a
 * result, never offers a Run action for a stage with nothing behind it, and never shows a path as
 * live because the code for it exists.
 *
 * The ten stages are the canonical pipeline. The hosted app currently displays a different
 * decomposition through `connection.ts`; aligning it is a cross-boundary request recorded in
 * docs/BUILD_SPLIT.md, not a silent rewrite of a contract four app pages already import.
 */

import { CONNECTOR_BY_PROVIDER } from "./connectors.ts";
import { classify, type Plug, type Reach } from "./plugs.ts";

export interface Stage {
  n: number;
  id: string;
  name: string;
  does: string;
  /** Connector provider names, in preference order. First available wins. */
  routes: string[];
  /** What the creator's rig must have for this stage, beyond being reachable. */
  requires?: string;
}

export const STAGES: Stage[] = [
  { n: 1, id: "script", name: "Script", does: "Idea to beat sheet, scene breakdown and dialogue", routes: ["Ollama", "DeepSeek", "Qwen"] },
  { n: 2, id: "storyboard", name: "Storyboard", does: "Camera-angled frames before any video GPU cycle is spent", routes: ["ComfyUI", "Replicate"], requires: "an image checkpoint on the rig" },
  { n: 3, id: "prompt", name: "Prompt Matrix", does: "Director language compiled to a node graph, weights and seeds", routes: ["Prompt Compiler"] },
  { n: 4, id: "generation", name: "Generation", does: "The shot itself, on the creator's rig or their own cloud key", routes: ["ComfyUI", "Replicate", "RunPod"], requires: "a video model on the rig" },
  { n: 5, id: "interpolation", name: "Interpolation", does: "Sparse keyframes stitched to fluid motion", routes: ["ComfyUI", "Replicate"], requires: "the RIFE or FILM node installed on the rig" },
  { n: 6, id: "timeline", name: "Timeline", does: "Trim, cut, reorder, crossfade and export — in the browser", routes: ["Browser NLE", "FFmpeg"] },
  { n: 7, id: "audio", name: "Audio & Speech", does: "Dialogue, transcription and sound beds", routes: ["Piper", "Whisper"], requires: "a voice model whose licence has been read" },
  { n: 8, id: "color", name: "Colour", does: "One grade across disparate generations, LUT and grain", routes: ["Browser Grade", "FFmpeg"] },
  { n: 9, id: "upscale", name: "Upscale", does: "Latent output to exhibition master", routes: ["ComfyUI", "Replicate"], requires: "an upscaler model on the rig" },
  { n: 10, id: "seal", name: "PSI Seal", does: "The receipt: hash, signature, timestamp, passport", routes: ["PSI Device Seal", "OpenTimestamps"] },
];

export const STAGE_BY_ID: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/**
 * What the creator has plugged in. Held in their own browser; the platform never stores a key.
 * A field left undefined means that path is not connected, and the stages that need it say so.
 */
export interface Plugged {
  /** Their own ComfyUI or Ollama endpoint, with CORS enabled for this origin. */
  rig?: string;
  /** Their local bridge, which turns local processes and non-CORS APIs into reachable endpoints. */
  bridge?: string;
  /** They hold a cloud provider key in their own browser storage. The value is never read here. */
  cloud?: boolean;
  /** A public endpoint that accepts a POST and calls back. */
  webhook?: string;
}

export interface Route {
  provider: string;
  plug: Plug;
  reach: Reach;
  available: boolean;
  /** Why it is not available, in words a creator can act on. */
  needs: string;
}

export interface ResolvedStage {
  stage: Stage;
  routes: Route[];
  /** The first available route, or null when the stage has nothing behind it. */
  chosen: Route | null;
  connected: boolean;
  /** The sentence the interface shows. Never optimistic. */
  says: string;
}

function reachAvailable(reach: Reach, plug: Plug, p: Plugged): { available: boolean; needs: string } {
  switch (reach) {
    case "device":
      return { available: true, needs: "" };
    case "direct":
      return p.rig
        ? { available: true, needs: "" }
        : { available: false, needs: "plug in your own rig endpoint with CORS enabled for this origin" };
    case "bridge":
      if (p.bridge) return { available: true, needs: "" };
      if (plug === "byok" && p.cloud) return { available: true, needs: "" };
      return {
        available: false,
        needs: plug === "byok" ? "add your own cloud key, or run the creator bridge" : "run the creator bridge on your machine",
      };
    case "server":
      return { available: false, needs: "this path needs the hosted platform; it is not reachable from the open rail" };
  }
}

export function resolveStage(stage: Stage, p: Plugged): ResolvedStage {
  const routes: Route[] = stage.routes.flatMap((provider) => {
    const c = CONNECTOR_BY_PROVIDER[provider];
    if (!c) return [];
    const { plug, reach } = classify(c);
    const { available, needs } = reachAvailable(reach, plug, p);
    return [{ provider, plug, reach, available, needs }];
  });
  const chosen = routes.find((r) => r.available) ?? null;
  // A rig-side requirement is only true of a route that lands on the rig. A cloud key hosts the
  // model itself, so telling a cloud-only creator to put a checkpoint on a rig they do not have is a lie.
  const about = chosen ?? routes[0] ?? null;
  const extra = stage.requires && about?.plug === "remote-rig" ? ` Your rig also needs ${stage.requires}.` : "";
  const need = routes[0]?.needs ?? "No route is declared for this stage.";
  return {
    stage,
    routes,
    chosen,
    connected: chosen !== null,
    says: chosen
      ? `Runs on ${chosen.provider} through the ${chosen.plug} plug.${extra}`
      : `Not connected. ${need.charAt(0).toUpperCase()}${need.slice(1)}.${extra}`,
  };
}

export function resolveAll(p: Plugged): ResolvedStage[] {
  return STAGES.map((s) => resolveStage(s, p));
}

/** The measured shape of the pipeline for a given set of plugs — never an estimate. */
export function pipelineCoverage(p: Plugged): { connected: number; total: number; empty: string[] } {
  const all = resolveAll(p);
  return {
    connected: all.filter((s) => s.connected).length,
    total: all.length,
    empty: all.filter((s) => !s.connected).map((s) => s.stage.id),
  };
}

/**
 * What the open rail can do with nothing plugged in at all. These stages are pure device work,
 * so a visitor on a phone can compile a prompt, cut a timeline, grade it and seal it without an
 * account, a key, a rig or a server.
 */
export function zeroPlugStages(): Stage[] {
  return STAGES.filter((s) => resolveStage(s, {}).connected);
}

/** A route that names a provider absent from the connector table is a bug, not a feature. */
export function undeclaredRoutes(): string[] {
  return STAGES.flatMap((s) => s.routes.filter((r) => !CONNECTOR_BY_PROVIDER[r]).map((r) => `${s.id}:${r}`));
}