/**
 * Serves verse-site exactly as the rail will deliver it: one file per path, no build step.
 *   node scripts/serve-rail.mjs [port]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { siteDir } from "./site-dir.mjs";

const ROOT = siteDir();
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".vtt": "text/vtt; charset=utf-8" };
const port = Number(process.argv[2] || 8788);

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(ROOT, url === "/" ? "index.html" : url.replace(/^\/+/, ""));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("404");
  }
}).listen(port, () => console.log(`rail at http://127.0.0.1:${port}/index.html · dailies at http://127.0.0.1:${port}/dailies.html`));
