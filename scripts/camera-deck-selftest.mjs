/**
 * Proves the camera deck reaches the encoder — and that a film which never chose a shape is
 * untouched by the deck.
 *
 * The failure this catches is the one a screenshot cannot show: a page that says 2.39:1 while
 * the craft chain writes 1920x1080, or a deck that quietly re-frames every project built before
 * it existed. So the checks are the real argv and the real numbers, not a description of them.
 *
 *   node --experimental-strip-types scripts/camera-deck-selftest.mjs
 *
 * Add --render to also run FFmpeg over a bundled plate at two shapes and read the delivered
 * file back with ffprobe. That half is the proof in pixels; it is opt-in because CI machines
 * do not always carry the binary.
 */
import { ASPECTS, DEFAULT_ASPECT, STOPS, deckTable, encodeRaster, latentRaster } from "../src/lib/apex/camera-deck.ts";
import { compileMatrix, graphProblems } from "../src/lib/apex/prompt-compiler.ts";

let failed = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok    ${label}${detail ? " — " + detail : ""}`);
  else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

/* ---------------------------------------------------- the default is yesterday's numbers */

const WIDE = ASPECTS.find((a) => a.id === DEFAULT_ASPECT);
check("the default shape is 16:9", !!WIDE, WIDE?.label ?? "missing");
check(
  "the default delivery raster is the 1920x1080 the driver hard-coded before the deck",
  WIDE.encode.width === 1920 && WIDE.encode.height === 1080,
  `${WIDE.encode.width}x${WIDE.encode.height}`,
);
check(
  "the default latent is the 832x480 the compiler asked for before the deck",
  WIDE.latent.width === 832 && WIDE.latent.height === 480,
  `${WIDE.latent.width}x${WIDE.latent.height}`,
);
check("no shape chosen still resolves to 16:9", encodeRaster(null).width === 1920 && encodeRaster(undefined).height === 1080);
check("an unknown shape falls back rather than throwing", encodeRaster("imax").width === 1920, `${encodeRaster("imax").width}x${encodeRaster("imax").height}`);

/* ---------------------------------------------------- the arithmetic the engines demand */

const badEncode = ASPECTS.filter((a) => a.encode.width % 2 || a.encode.height % 2);
check("every delivery raster has even sides (yuv420p subsamples chroma 2x2)", badEncode.length === 0, badEncode.map((a) => a.id).join(", "));

const badLatent = ASPECTS.filter((a) => a.latent.width % 16 || a.latent.height % 16);
check("every latent side divides by 16 (VAE /8, then the patchifier /2)", badLatent.length === 0, badLatent.map((a) => a.id).join(", "));

const lying = ASPECTS.filter((a) => Math.abs(a.encodeRatio - a.nominal) > 0.02);
check(
  "no shape is named for a ratio it does not deliver within 0.02",
  lying.length === 0,
  lying.map((a) => `${a.id} says ${a.nominal}, encodes ${a.encodeRatio.toFixed(3)}`).join("; "),
);

const exact = ASPECTS.filter((a) => Math.abs(a.encodeRatio - a.nominal) < 1e-9).map((a) => a.id);
console.log(`      shapes that are exact at the delivery raster: ${exact.join(", ") || "none"}`);

/* ---------------------------------------------------- the name a human reads matches the number */

const misNamed = ASPECTS.filter((a) => {
  const [w, h] = a.soldAs.split(":").map(Number);
  return !w || !h || Math.abs(w / h - a.nominal) > 1e-6;
});
check(
  "every shape's written name evaluates to the number it is compared against",
  misNamed.length === 0,
  misNamed.map((a) => `${a.id} writes ${a.soldAs} but holds ${a.nominal.toFixed(6)}`).join("; "),
);
check("the sold-as name appears in the label, so a reader cannot meet two names", ASPECTS.every((a) => a.label.includes(a.soldAs)), ASPECTS.filter((a) => !a.label.includes(a.soldAs)).map((a) => a.id).join(", "));
console.log(`      scope delivers ${encodeRaster("scope").width}x${encodeRaster("scope").height} = ${(encodeRaster("scope").width / encodeRaster("scope").height).toFixed(4)}:1, asked of a generator as ${latentRaster("scope").width}x${latentRaster("scope").height} = ${(latentRaster("scope").width / latentRaster("scope").height).toFixed(4)}:1`);

check("the deck table is what a page would print", deckTable().length === ASPECTS.length, `${deckTable().length} rows`);
check("every stop has a depth-of-field sentence, not a slogan", STOPS.every((s) => s.dof.length > 8 && s.term.includes("f/")), `${STOPS.length} stops`);

/* ---------------------------------------------------- the compiler obeys the deck */

const BRIEF = "a lighthouse keeper climbs a spiral stair at dawn, handheld, cold blue light";

const bare = compileMatrix(BRIEF);
const scope = compileMatrix(BRIEF, { aspect: "scope", stop: "2.8" });

check("a brief with no deck keeps the old latent", bare.shots[0].width === 832 && bare.shots[0].height === 480, `${bare.shots[0].width}x${bare.shots[0].height}`);
check(
  "a brief with no deck keeps the old prompt words",
  !bare.shots[0].positive.includes("widescreen framing"),
  bare.shots[0].positive.slice(0, 70),
);
check("a deck set adds no warning", scope.warnings.length === 0, scope.warnings.join("; "));
check(
  "the scope latent is what the graph actually carries",
  JSON.stringify(scope.shots).includes('"width":832') && scope.shots.every((s) => s.height === 352),
  scope.shots.map((s) => `${s.width}x${s.height}`).slice(0, 2).join(", "),
);
check("the shape reaches the prompt", scope.shots[0].positive.includes("(2.39:1 anamorphic widescreen composition:1.10)"), scope.shots[0].positive.slice(0, 120));
check("the aperture reaches the prompt", scope.shots[0].positive.includes("f/2.8"), scope.shots[0].positive.slice(0, 160));
check("the director's own words still survive a deck", scope.shots[0].positive.includes("lighthouse keeper"));
check("a deck does not break the graph", scope.shots.every((s) => graphProblems(s.graph).length === 0));
check(
  "the same brief and the same deck produce the same matrix",
  JSON.stringify(compileMatrix(BRIEF, { aspect: "scope", stop: "2.8" })) === JSON.stringify(scope),
);
check("the shape does not move the seeds", scope.shots.map((s) => s.seed).join(",") === bare.shots.map((s) => s.seed).join(","), "seeds are the brief's, not the deck's");

const bogus = compileMatrix(BRIEF, { aspect: "imax", stop: "1.0" });
check("an unknown shape says so instead of guessing", bogus.warnings.some((w) => w.includes("not a shape on the deck")), bogus.warnings.join("; "));
check("an unknown stop says so", bogus.warnings.some((w) => w.includes("not a stop on the deck")));

/* ---------------------------------------------------- the driver puts it in the argv */

const { argsFor } = await import("../src/lib/apex/drivers/ffmpeg.ts");
const argvOf = (task, aspect, inputs = ["demo-plates/hall.jpg"]) => {
  const args = argsFor({
    task,
    inputs,
    aspect,
    timeoutSeconds: 60,
    budgetUsd: 0,
    projectId: "deck-selftest",
    sceneId: "argv",
    stage: task,
    variant: task === "grade" ? "2" : undefined,
  });
  return args ? args.join(" ") : "";
};

const concatScope = argvOf("concat", "scope", ["a.mp4", "b.mp4"]);
check("concat encodes to the scope raster", concatScope.includes("scale=1920:804") && concatScope.includes("pad=1920:804"), concatScope.slice(0, 100));
const gradeScope = argvOf("grade", "scope");
check("the plate move renders scope", gradeScope.includes("crop=1920:804") && gradeScope.includes("s=1920x804"), gradeScope.slice(0, 100));
const finishScope = argvOf("finish", "scope");
check("the finishing pass lands on scope", finishScope.includes("scale=1920:804,setsar=1"), (finishScope.match(/scale=1920:\d+/g) ?? []).join(", "));
check("the bloom scales with the frame instead of staying a fixed pixel blur", /gblur=sigma=6\b/.test(finishScope), (finishScope.match(/gblur=sigma=\d+/) ?? [""])[0]);

const finishWide = argvOf("finish", undefined);
check("with no deck the finishing pass keeps the pre-deck raster and the measured sigma", finishWide.includes("scale=1920:1080,setsar=1") && /gblur=sigma=8\b/.test(finishWide), (finishWide.match(/gblur=sigma=\d+/) ?? [""])[0]);
check("an unknown shape cannot smuggle a bad raster into the flags", argvOf("grade", "imax").includes("1920:1080"));
check(
  "a shape-chosen render cannot overwrite the same scene at another shape",
  argvOf("finish", "scope").endsWith("deck-selftest-finish-argv-scope.mp4") && argvOf("finish", "vertical").endsWith("deck-selftest-finish-argv-vertical.mp4"),
  (argvOf("finish", "scope").match(/[\w.-]+\.mp4/) ?? [""])[0],
);
check("a job with no deck set still writes the pre-deck file name", argvOf("finish", undefined).endsWith("deck-selftest-finish-argv.mp4"));

/* ---------------------------------------------------- optional: the proof in pixels */

if (process.argv.includes("--render")) {
  const { existsSync, mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const { ffmpegDriver } = await import("../src/lib/apex/drivers/ffmpeg.ts");

  const plate = "demo-plates/hall.jpg";
  if (!existsSync(plate)) {
    check("--render needs demo-plates/hall.jpg", false, "the bundled plate is not on disk");
  } else {
    const dir = mkdtempSync(join(tmpdir(), "apex-deck-"));
    process.env.APEX_RUN_DIR = dir;
    const dimsOf = (file) => {
      const p = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
      return (p.stdout || "").trim().replace(/\r/g, "");
    };
    const base = { timeoutSeconds: 300, budgetUsd: 0, projectId: "deck-selftest", sceneId: "render" };

    for (const aspect of ["wide", "scope"]) {
      const want = aspect === "scope" ? "1920,804" : "1920,1080";
      const grade = await ffmpegDriver.run({ ...base, task: "grade", stage: "grade", inputs: [plate], aspect, variant: "2" });
      const master = grade.outputs[0];
      const masterDims = master ? dimsOf(master) : "";
      check(`the graded ${aspect} master is ${want} on disk`, masterDims === want, `${master ?? "no file"} -> ${masterDims || "unreadable"} (${grade.state})`);

      const finish = await ffmpegDriver.run({ ...base, task: "finish", stage: "finish", inputs: [master], aspect });
      const finalFile = finish.outputs[0];
      const finalDims = finalFile ? dimsOf(finalFile) : "";
      check(`the finished ${aspect} master is still ${want} after the photochemical pass`, finalDims === want, `${finalFile ?? "no file"} -> ${finalDims || "unreadable"} (${finish.state})`);
      if (finalFile) console.log(`      ${aspect}: ${finalFile}`);
    }
  }
}

console.log(
  failed === 0
    ? `\nCAMERA DECK CLEAN — ${ASPECTS.length} shapes, ${STOPS.length} stops, the default is untouched, and the raster is in the argv.`
    : `\nCAMERA DECK FAILED — ${failed} check(s) did not pass.`,
);
process.exit(failed === 0 ? 0 : 1);
