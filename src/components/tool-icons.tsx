import {
  AudioLines, Box, Brain, Cloud, Film, Mic, MonitorPlay, Music, Palette, Scissors, Share2, Workflow, Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ffmpeg: Film,
  blender: Box,
  whisper: AudioLines,
  ollama: Brain,
  comfyui: Workflow,
  replicate: Cloud,
  kdenlive: Scissors,
  ardour: Music,
  davinci_resolve: Palette,
  youtube: MonitorPlay,
  peertube: Share2,
  fish_speech: Mic,
};

export const CATEGORY: Record<string, string> = {
  ffmpeg: "Media / Codec",
  blender: "3D / Animation",
  whisper: "Audio / Speech",
  ollama: "Models / Script",
  comfyui: "Image / Video",
  replicate: "Cloud / Video",
  kdenlive: "Edit / Video",
  ardour: "Audio / DAW",
  davinci_resolve: "Edit / Color",
  youtube: "Publish",
  peertube: "Publish / Self-host",
  fish_speech: "Voice / TTS",
};

export function ToolIcon({ id, className }: { id: string; className?: string }) {
  const I = ICONS[id] ?? Wrench;
  return <I className={className} strokeWidth={1.5} aria-hidden />;
}
