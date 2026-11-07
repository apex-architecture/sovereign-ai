/**
 * The connection table — client-safe, so the browser can show what is truly wired
 * without importing a single driver that touches node:child_process or fetches a GPU box.
 *
 * Keep this in step with drivers/index.ts; the self-check compares them.
 */

export type ConnectionDepth = "drivable" | "file-exchange" | "portal-only" | "not-yet";

export interface ConnectionRow {
  toolId: string;
  name: string;
  depth: ConnectionDepth;
  where: "your machine" | "your account" | "their website" | "your server";
  does: string;
  needs: string;
}

export const CONNECTIONS: ConnectionRow[] = [
  { toolId: "ffmpeg", name: "FFmpeg", depth: "drivable", where: "your machine", does: "concat, loudness normalise, burn subtitles, re-encode", needs: "the local runner with ffmpeg on PATH" },
  { toolId: "blender", name: "Blender", depth: "drivable", where: "your machine", does: "headless renders from a stored scene and script", needs: "blender on PATH, a render script per set" },
  { toolId: "whisper", name: "Whisper", depth: "drivable", where: "your machine", does: "offline transcription to SRT", needs: "whisper CLI plus a model file" },
  { toolId: "ollama", name: "Ollama", depth: "drivable", where: "your machine", does: "script passes, shot notes, licence-text summaries", needs: "a pulled model" },
  { toolId: "comfyui", name: "ComfyUI", depth: "drivable", where: "your machine", does: "storyboard stills, identity locks, controlnet passes", needs: "a saved graph per stage — none stored yet" },
  { toolId: "replicate", name: "Replicate", depth: "drivable", where: "your account", does: "hosted video/voice models billed to the creator, not to us", needs: "the creator's own key and a verified price per model" },
  { toolId: "kdenlive", name: "Kdenlive", depth: "file-exchange", where: "your machine", does: "APEX builds the cut list and project, a human confirms the timing", needs: "nothing — works today" },
  { toolId: "ardour", name: "Ardour", depth: "file-exchange", where: "your machine", does: "APEX hands over a session; a human balances and exports stems", needs: "nothing — works today" },
  { toolId: "davinci_resolve", name: "DaVinci Resolve", depth: "file-exchange", where: "your machine", does: "grade and deliverables; APEX verifies the delivered hash", needs: "Studio edition for scripting — not assumed" },
  { toolId: "youtube", name: "YouTube", depth: "portal-only", where: "their website", does: "APEX records the published URL; it does not publish", needs: "a human click, or the API quota you own" },
  { toolId: "peertube", name: "PeerTube", depth: "not-yet", where: "your server", does: "self-hosted publication with a real API", needs: "a server and an API driver" },
  { toolId: "fish_speech", name: "Fish Speech", depth: "not-yet", where: "your machine", does: "voice lines for dialogue — the one stage with no driver at all", needs: "weights, a local runner, and a voice licence read" },
];

/** Which stages of the film have a tool behind them, per the driver table. */
export const STAGE_CONNECTION: Record<string, string[]> = {
  storyboard: ["comfyui", "blender"],
  character_lock: ["comfyui"],
  motion: ["replicate", "comfyui", "blender"],
  dialogue: [],
  music: ["ardour"],
  sound: ["ffmpeg", "ardour"],
  subtitles: ["whisper", "ffmpeg"],
  edit: ["ffmpeg", "kdenlive", "davinci_resolve"],
  finish: ["ffmpeg", "davinci_resolve", "blender"],
  publish: ["youtube"],
};

export function depthCount(): Record<ConnectionDepth, number> {
  const c: Record<ConnectionDepth, number> = { drivable: 0, "file-exchange": 0, "portal-only": 0, "not-yet": 0 };
  for (const r of CONNECTIONS) c[r.depth]++;
  return c;
}

export function stageCoverage(): { wired: number; total: number; empty: string[] } {
  const entries = Object.entries(STAGE_CONNECTION);
  return {
    wired: entries.filter(([, t]) => t.length > 0).length,
    total: entries.length,
    empty: entries.filter(([, t]) => t.length === 0).map(([s]) => s),
  };
}
