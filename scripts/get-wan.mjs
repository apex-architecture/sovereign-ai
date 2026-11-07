/**
 * Streams the Wan 2.1 weights ComfyUI needs for local text-to-video, into the existing
 * D:/ComfyUI model tree. Resumable: an existing file is continued with a Range request,
 * so a dropped connection on a multi-gigabyte download is not a restart.
 *
 *   node scripts/get-wan.mjs
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const BASE = "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main";
const FILES = [
  ["split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors", "diffusion_models"],
  ["split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors", "text_encoders"],
  ["split_files/vae/wan_2.1_vae.safetensors", "vae"],
];
const ROOT = process.env.COMFY_MODELS || "D:/ComfyUI/models";

async function grab(src, sub) {
  const dir = path.join(ROOT, sub);
  mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, path.basename(src));
  const have = existsSync(dest) ? statSync(dest).size : 0;
  const res = await fetch(`${BASE}/${src}`, {
    headers: have ? { range: `bytes=${have}-`, "user-agent": "APEX-build/1.0" } : { "user-agent": "APEX-build/1.0" },
    redirect: "follow",
  });
  if (!res.ok && res.status !== 206) { console.log(`FAIL ${path.basename(src)} HTTP ${res.status}`); return null; }
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? 0) + (res.status === 206 ? have : 0);
  console.log(`${path.basename(src)}  ${have ? `resuming at ${(have / 1073741824).toFixed(2)} GB` : "starting"}  of ${(total / 1073741824).toFixed(2)} GB`);
  const out = createWriteStream(dest, { flags: res.status === 206 ? "a" : "w" });
  let done = have, t0 = Date.now(), lastPrint = 0;
  for await (const chunk of res.body) {
    done += chunk.length;
    if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
    const now = Date.now();
    if (now - lastPrint > 20000) {
      lastPrint = now;
      const mbps = ((done - have) / 1048576) / ((now - t0) / 1000);
      console.log(`   ${(done / 1073741824).toFixed(2)} / ${(total / 1073741824).toFixed(2)} GB  ${mbps.toFixed(1)} MB/s`);
    }
  }
  await new Promise((r) => out.end(r));
  const size = statSync(dest).size;
  console.log(`DONE ${path.basename(src)} ${(size / 1073741824).toFixed(2)} GB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return total && size !== total ? `${path.basename(src)} SHORT: ${size} of ${total}` : null;
}

const problems = [];
for (const [src, sub] of FILES) {
  const p = await grab(src, sub);
  if (p) problems.push(p);
}
console.log(problems.length ? `INCOMPLETE: ${problems.join("; ")}` : `ALL WEIGHTS ON DISK under ${ROOT}`);
process.exit(problems.length ? 1 : 0);
