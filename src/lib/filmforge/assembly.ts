import type { FilmPlan, ScenePlan } from "./planner.ts";

export interface ClipSource {
  sceneId: string;
  exists: boolean;
  file: string;
}

export interface CutList {
  title: string;
  concatFile: string;
  concatContents: string;
  commands: string[];
  usable: number;
  missing: string[];
}

function safeName(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildCutList(
  plan: FilmPlan,
  clips: ClipSource[],
  opts: { outDir: string },
): CutList {
  const byScene = new Map(clips.map((c) => [c.sceneId, c]));
  const ordered: ClipSource[] = [];
  const missing: string[] = [];

  for (const id of plan.order) {
    const clip = byScene.get(id);
    if (clip && clip.exists) ordered.push(clip);
    else missing.push(id);
  }

  const base = safeName(plan.title);
  const concatFile = `${opts.outDir}/${base}-concat.txt`;
  const concatContents = ordered.map((c) => `file '${c.file}'`).join("\n") + "\n";

  const commands =
    ordered.length > 0
      ? [
          `ffmpeg -y -f concat -safe 0 -i ${concatFile} -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k ${opts.outDir}/${base}-rough.mp4`,
          `ffmpeg -y -i ${opts.outDir}/${base}-rough.mp4 -af loudnorm=I=-23:TP=-2 -c:v copy ${opts.outDir}/${base}-rough-loud.mp4`,
          `ffmpeg -y -i ${opts.outDir}/${base}-rough-loud.mp4 -vf subtitles=${base}.srt ${opts.outDir}/${base}-subtitled.mp4`,
        ]
      : [];

  return { title: plan.title, concatFile, concatContents, commands, usable: ordered.length, missing };
}

export function stagesOf(plan: FilmPlan): ScenePlan[] {
  return plan.perScene;
}
