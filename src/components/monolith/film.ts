// The film being made on the Monolith: one idea, a handful of scenes, each scene carrying its
// storyboard frame and, once the owner renders it, its clip. Kept in the visitor's own browser.
import type { ScriptScene } from "@/lib/preproduction.functions";

export type Step = "script" | "board" | "render" | "cut";

export type Clip = {
  jobId: string;
  predictionId: string;
  status: "rendering" | "done" | "failed";
  url?: string;
  error?: string;
};

export type Scene = ScriptScene & { id: string; frame?: string; clip?: Clip };

export type Film = {
  title: string;
  logline: string;
  idea: string;
  style: string;
  scenes: Scene[];
};

export const STORE_KEY = "filmverse.monolith.v1";

export const EMPTY_FILM: Film = { title: "", logline: "", idea: "", style: "cinematic", scenes: [] };

export const STYLES = [
  { id: "cinematic", label: "Cinematic", suffix: "cinematic, 35mm film grain, dramatic lighting, anamorphic, shallow depth of field" },
  { id: "anime", label: "Anime", suffix: "anime film style, painterly cel shading, expressive lighting" },
  { id: "noir", label: "Noir", suffix: "black and white film noir, hard side light, venetian blind shadows, smoke, high contrast" },
  { id: "doc", label: "Documentary", suffix: "handheld documentary realism, natural colors, candid framing" },
  { id: "cyberpunk", label: "Cyberpunk", suffix: "cyberpunk, neon, rain, atmospheric haze, volumetric lighting" },
  { id: "dream", label: "Dreamlike", suffix: "ethereal surreal, soft focus, pastel, slow drifting motion" },
];

export const EXAMPLES = [
  "A girl in Mumbai finds a glowing egg in a flooded alley during the monsoon, and what hatches changes her street forever.",
  "An old lighthouse keeper receives a radio message from a ship that sank forty years ago.",
  "A street painter in Lagos discovers that whatever she paints on a wall comes alive at night.",
  "Two rival chefs on a night market street must cook together when a storm traps them under one roof.",
  "A lone astronaut walks an abandoned space station and finds a garden still growing inside.",
];

export const STEPS: { id: Step; n: string; label: string; sub: string; cost: "free" | "owner" }[] = [
  { id: "script", n: "01", label: "Script", sub: "Write the story", cost: "free" },
  { id: "board", n: "02", label: "Board", sub: "Draw every shot", cost: "free" },
  { id: "render", n: "03", label: "Render", sub: "Put it in motion", cost: "owner" },
  { id: "cut", n: "04", label: "Cut", sub: "Watch and export", cost: "free" },
];

export function newScene(): Scene {
  return { id: crypto.randomUUID(), heading: "EXT. NEW SCENE - DAY", action: "", shot: "", seconds: 5 };
}

export function runtime(scenes: Scene[]): number {
  return scenes.reduce((t, s) => t + (s.seconds || 0), 0);
}

export function screenplay(f: Film): string {
  const lines = [
    (f.title || "UNTITLED").toUpperCase(),
    f.logline,
    "",
    "Written on Sovereign AI Filmverse",
    "",
  ];
  f.scenes.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.heading.toUpperCase()}`, "", s.action, "", `SHOT (${s.seconds}s): ${s.shot}`, "", "");
  });
  return lines.join("\n");
}

export function download(name: string, body: string, type = "text/plain") {
  const blob = new Blob([body], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function slug(s: string) {
  return (s || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "untitled";
}

export async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
