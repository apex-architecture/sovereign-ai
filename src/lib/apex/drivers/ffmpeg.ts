/**
 * FFmpeg driver — drivable depth, real process launch.
 *
 * Runs only on the creator's machine (the local runner), never inside the hosted web app.
 * Every command is kept in the result so the identical edit can be replayed or audited.
 */

import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";
import { encodeRaster } from "../camera-deck.ts";

const record = R({
  name: "FFmpeg",
  category: "video-editing",
  officialUrl: "https://ffmpeg.org",
  sourceRepository: "https://git.ffmpeg.org/ffmpeg.git",
  license: "LGPL-2.1+ / GPL-2.0+ depending on build options",
  licenseVerified: false,
  selfHosting: true,
  localExecution: true,
  apiAvailable: false,
  hardware: "any CPU; NVENC/QSV/AMF when present",
  integrationMethod: "cli",
  cost: "$0",
  capability: "cut, concat, re-encode, loudness-normalise, burn subtitles, extract frames",
  priority: "now",
  replacementOptions: ["GStreamer", "MKVToolNix + HandBrake", "Gyan FFmpeg (same engine, packaged)"],
  dataPortability: "output files are ordinary media; no proprietary container",
});

const LOCAL_BIN = process.env.APEX_FFMPEG_BIN ?? "ffmpeg";

export const ffmpegDriver: ToolDriver = {
  toolId: "ffmpeg",
  depth: "drivable",
  record,
  runsOn: "creator-machine",

  async probe() {
    try {
      const out = await run(["-version"], 10);
      return out.code === 0
        ? { ok: true, why: firstLine(out.stdout) }
        : { ok: false, why: `exit ${out.code}: ${firstLine(out.stderr)}` };
    } catch (e) {
      return { ok: false, why: `ffmpeg not on PATH for the local runner (${String(e)})` };
    }
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const args = argsFor(input);
    if (!args) {
      return {
        state: "failed",
        outputs: [],
        wallClockSeconds: 0,
        usdSpent: 0,
        reproducible: { args: [] },
        log: `unrecognised ffmpeg task: ${input.task}`,
      };
    }
    // The mix stage refuses to certify silence. Mastering a stream that carries no signal returns
    // exit 0 and a file of the right shape, which is the one outcome worse than a failure: the run
    // sheet would say "sound succeeded" over a film nobody can hear. So the input is measured first
    // and the stage reports what it actually found.
    if (input.task === "loudnorm") {
      const rms = await audioRms(input.inputs[0]);
      if (rms === null || Number(rms) <= -60) {
        return {
          state: "failed",
          outputs: [],
          wallClockSeconds: (Date.now() - started) / 1000,
          usdSpent: 0,
          reproducible: { measured_rms_db: rms },
          log: `no signal to master: ${input.inputs[0]} measures ${rms ?? "no audio stream"} dB RMS — the cut is silent because no score or line has been cleared, and loudnorm over silence would only mint a receipt for nothing`,
        };
      }
    }
    const out = await run(args, input.timeoutSeconds);
    return {
      state: out.code === 0 ? "succeeded" : "failed",
      outputs: out.code === 0 ? [args[args.length - 1]] : [],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { binary: LOCAL_BIN, args },
      log: out.code === 0 ? encodeSummary(out.stderr) : tail(out.stderr, 800),
    };
  },
};

/**
 * Five tasks cover what the film pipeline actually needs from FFmpeg.
 * Anything else is a missing driver, and we say so instead of guessing at flags.
 *
 * Exported for the guard: `scripts/camera-deck-selftest.mjs` reads the argv it would have sent,
 * so the shape claim is checked against the flags themselves rather than against a description
 * of them. Same reason `graphProblems` is exported from the prompt compiler.
 */
export function argsFor(input: JobInput): string[] | null {
  const [srcA, srcB] = input.inputs;
  // An extension is not decoration: ffmpeg chooses the muxer from it, so a nameless target makes
  // every job fail before it starts. The stage is in the name because one scene passes through
  // several stages — without it, edit would overwrite the shot and the chain could not form.
  // The shape joins that same argument: a director cutting a scope version and a vertical version
  // of one scene is making two films, and the second render must not silently replace the first.
  // A job with no deck set keeps the pre-deck name exactly, so every existing run sheet still
  // names a file that exists.
  const dir = process.env.APEX_RUN_DIR ?? ".";
  const tag = input.aspect ? `-${input.aspect}` : "";
  const out = (ext: string) => `${dir}/${input.projectId}-${input.stage}-${input.sceneId}${tag}.${ext}`;
  if (input.task === "concat" && srcA && srcB) {
    // Shots arrive at different sizes now that the generator is in the chain — a plate move is
    // 1920x1080/23.976, a Wan take is 832x480/16. Concatenating mismatched streams does not fail
    // loudly, it produces a file that breaks on the second shot, so everything is fitted to one
    // raster and one rate here. A 480p take is fitted up, not pretended to be native 1080p.
    // The raster is the deck's, not a constant: a scope reel that concatenates back to 16:9 is a
    // film whose shape was decided by the last stage in the chain instead of by the director.
    const { width, height } = encodeRaster(input.aspect);
    const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24000/1001,format=yuv420p`;
    return ["-y", "-f", "concat", "-safe", "0", "-i", srcA, "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-an", out("mp4")];
  }
  if (input.task === "loudnorm" && srcA) {
    return ["-y", "-i", srcA, "-af", "loudnorm=I=-23:TP=-2:LRA=7", out("mp4")];
  }
  if (input.task === "burn-subs" && srcA) {
    return ["-y", "-i", srcA, "-vf", `subtitles=${srcB}`, "-c:a", "copy", out("mp4")];
  }
  /**
   * A still plate becomes a shot: fit to 1080p, push in. The look is not applied here any more —
   * it belongs to `finish`, because grain and halation put over a zoom-pan advertise a grade the
   * footage has not earned. No audio track is laid down: a silent placeholder stream used to let
   * the mix stage report a pass on a film nobody could hear, so the shot now carries exactly the
   * sound it has, which is none until a score or a line is cleared.
   * `variant` is the seconds the move runs for.
   *
   * `t2v` reaching this branch is not a bug: it means the generator was refused or unreachable and
   * the door fell through to the plate move. The run sheet's `tried` chain shows both names, so
   * the fallback is visible instead of quiet.
   */
  if ((input.task === "grade" || input.task === "t2v") && srcA) {
    const seconds = Math.max(1, Math.min(30, Number(input.variant ?? 5)));
    const { width, height } = encodeRaster(input.aspect);
    const vf = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      `zoompan=z='min(zoom+0.0012,1.12)':d=${seconds * 24}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=24000/1001`,
      "format=yuv420p",
    ].join(",");
    return [
      "-y",
      "-i", srcA,
      "-vf", vf,
      // A hard frame count, not `-loop 1 -t` on the input: an image2 loop has no trustworthy
      // duration, and zoompan re-expands every one of those endless frames by `d`, so the encode
      // above ran until the file was 285 MB and still growing. Bounded output is the only cap
      // that survives both.
      "-frames:v", String(Math.round((seconds * 24000) / 1001)),
      "-c:v", process.env.APEX_FFMPEG_ENCODER ?? "libx264", "-preset", "fast", "-crf", "20", "-tune", "grain",
      "-an", out("mp4"),
    ];
  }
  /**
   * The finishing pass. Order is the craft order, measured rather than assumed:
   *   lateral CA -> halation (Screen, red-shifted) -> gate weave -> grain -> grade -> vignette.
   * Every number below survived a test against the frame it was meant to change:
   *   - 1 px CA, not 2: SATAVG 10.43 against 10.90, so the fringe reads as glass instead of a filter.
   *   - gate weave is time-driven. The obvious `crop=x='random(0)*4'` produced a frame-to-frame
   *     luma difference of 0.0031 — identical to no weave at all. The sine version measures 4.51.
   *   - the vignette is judged on the SUBJECT, not the mean. Mean luma is the wrong yardstick: it
   *     punished a perfectly ordinary optical falloff. Measured on a night reel and a bright one,
   *     PI/6 costs the centre box -0.04 EV on each (it holds the face) while the corner box falls
   *     -0.51 EV and -0.52 EV — a lens, not a filter. ffmpeg's own default PI/5 measured -0.75 EV
   *     and drained 32-39% of corner chroma; PI/8 was too timid at -0.29 EV.
   *   - that corner chroma cost is real and accepted: this build's vignette multiplies all three
   *     planes, so PI/6 greys the extreme corner by 24-30%. A luma-only vignette would keep it,
   *     and is the known next improvement rather than a claim this chain makes.
   * `variant` switches the shutter emulation on. minterpolate is a CPU cost of minutes, so it runs
   * on the accepted master and not on every attempt.
   */
  if (input.task === "finish" && srcA) {
    const shutter = input.variant === "shutter";
    const { width, height } = encodeRaster(input.aspect);
    const bloom = Math.max(2, Math.round((8 * height) / 1080));
    const vf = [
      "fps=24000/1001",
      "format=gbrp",
      "rgbashift=rh=-1:bh=1",
      "split=2[base][hl]",
      // The bloom was measured at 1080 rows, and a blur is denominated in pixels, not in picture.
      // Left at sigma=8 a scope frame is only 804 rows tall, so the same grade would read as a
      // heavier filter on a smaller file. Scaling sigma with the raster keeps the look proportional
      // and returns exactly 8 at 16:9, which is what every master before the deck was graded with.
      `[hl]curves=master='0/0 0.60/0 0.85/0.5 1/1',gblur=sigma=${bloom},colorchannelmixer=rr=1:gg=0.5:bb=0.28[bloom]`,
      "[base][bloom]blend=all_mode=screen:all_opacity=0.6",
      "crop=iw-5:ih-5:x='2.5+1.5*sin(2*PI*t*0.9)+1*sin(2*PI*t*0.37)':y='2.5+1.5*sin(2*PI*t*1.1)+1*sin(2*PI*t*0.53)'",
      `scale=${width}:${height},setsar=1`,
      "noise=c0s=11:c0f=t+u:c1s=3:c1f=t:c2s=3:c2f=t",
      "curves=master='0/0.012 0.25/0.265 0.5/0.515 0.75/0.785 1/0.965'",
      "colorbalance=rs=0.03:gs=-0.008:bs=-0.018:rm=0.012:bm=-0.008:rh=-0.025:gh=-0.006:bh=0.045",
      "eq=saturation=0.92:contrast=1.02:gamma=1.04",
      // The vignette is optical, so it belongs in the same working space as the lens: applied in
      // RGB before the picture is folded back into YUV, where a multiplication cannot be mistaken
      // for a range error by whatever reads the file next.
      "vignette=PI/6",
      // Everything upstream of here is full-range RGB because the plates are JPEG. The delivery
      // picture is limited-range Rec.709: 0-255 becomes 16-235 and all three colour tags are
      // written, or a strict player re-derives the matrix and shifts the grade on the way out.
      "scale=out_range=limited:out_color_matrix=bt709",
      "format=yuv420p",
    ].join(",");
    return [
      "-y", "-i", srcA,
      ...(shutter ? ["-vf", `minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:vsbmc=1,tblend=all_mode=average,fps=24000/1001,${vf}`]
                  : ["-vf", vf]),
      "-c:v", process.env.APEX_FFMPEG_ENCODER ?? "libx264", "-preset", "medium", "-crf", "16", "-tune", "grain",
      "-c:a", "copy", "-video_track_timescale", "24000",
      "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      // The placeholder audio used to out-run the last frame by 0.16 s, so the container reported
      // an audio stream longer than the picture. `-shortest` ends both at the picture.
      "-shortest", "-movflags", "+faststart", out("mp4"),
    ];
  }
  return null;
}

/** ffmpeg's own closing line carries the frame count, size and time — that is the record worth keeping. */
function encodeSummary(stderr: string): string {
  const lines = stderr.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  return lines.find((l) => l.includes("Lsize")) ?? lines[lines.length - 1] ?? "";
}

async function run(args: string[], timeoutSeconds: number) {  const r = await exec(LOCAL_BIN, args, timeoutSeconds);
  return { code: r.timedOut ? -1 : r.code, stdout: r.stdout, stderr: r.stderr };
}

/**
 * ffmpeg's own measurement of what a file is actually carrying: overall RMS in dB, or null when
 * there is no audio stream to measure. Silence comes back as -inf, which is a number-shaped answer
 * and the reason the caller compares against -60 rather than checking for a value.
 */
async function audioRms(file: string): Promise<string | null> {
  const r = await exec(LOCAL_BIN, ["-hide_banner", "-nostats", "-i", file, "-af", "astats=metadata=0", "-f", "null", "-"], 120);
  const text = `${r.stdout}\n${r.stderr}`;
  const m = /Overall[\s\S]*?RMS level dB:\s*(-?[0-9.inf]+(?:\.[0-9]+)?)/.exec(text);
  return m ? m[1] : null;
}
