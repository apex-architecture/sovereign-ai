// Concept stills bundled with the studio. They dress empty screens and are always
// labelled as a showreel — real renders replace them the moment they exist.
import kethra from "@/assets/still-planet-kethra.jpg";
import silence from "@/assets/still-weight-of-silence.jpg";
import horizon from "@/assets/bg-crimson-horizon.jpg";
import signal from "@/assets/still-signal.jpg";
import voidShot from "@/assets/still-void.jpg";
import fragments from "@/assets/still-fragments.jpg";
import forest from "@/assets/still-red-forest.jpg";
import monolith from "@/assets/still-monolith.jpg";
import beyond from "@/assets/still-beyond.jpg";
import sCinematic from "@/assets/style-cinematic.jpg";
import sAnime from "@/assets/style-anime.jpg";
import sNoir from "@/assets/style-noir.jpg";
import sDoc from "@/assets/style-documentary.jpg";
import sCyber from "@/assets/style-cyberpunk.jpg";
import sDream from "@/assets/style-dream.jpg";

export const HERO_STILL = kethra;
export const THEATER_STILL = silence;
export const HORIZON_BG = horizon;

export type Shot = { id: string; src: string; title: string; scene: string; tc: string };

export const SHOWREEL: Shot[] = [
  { id: "S01", src: kethra, title: "A lone traveller", scene: "Planet Kethra", tc: "00:00–00:13" },
  { id: "S02", src: signal, title: "The signal", scene: "Dead array", tc: "00:13–00:27" },
  { id: "S03", src: voidShot, title: "Across the void", scene: "Deep orbit", tc: "00:27–00:41" },
  { id: "S04", src: fragments, title: "Fragments", scene: "Memory", tc: "00:41–00:54" },
  { id: "S05", src: monolith, title: "A new world", scene: "Monolith plain", tc: "00:54–01:08" },
  { id: "S06", src: forest, title: "Signs of life", scene: "Crimson wood", tc: "01:08–01:21" },
  { id: "S07", src: sCinematic, title: "The choice", scene: "Visor", tc: "01:21–01:35" },
  { id: "S08", src: beyond, title: "Beyond", scene: "First light", tc: "01:35–01:48" },
];

export const STYLE_IMAGES: Record<string, string> = {
  cinematic: sCinematic,
  anime: sAnime,
  noir: sNoir,
  doc: sDoc,
  cyberpunk: sCyber,
  dream: sDream,
};
