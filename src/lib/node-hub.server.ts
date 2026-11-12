// Shared guards for the GPU node hub (/api/public/nodes/*). Server-only.
//
// Two keys:
//   OPERATOR_API_TOKEN — the owner. Queues jobs and reads results.
//   NODE_API_TOKEN     — handed to GPU nodes. Can only claim, complete and fail jobs.
//                        Falls back to OPERATOR_API_TOKEN while no separate node key is set,
//                        so the owner's own rigs work on day one.

export const nodeCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Filename",
};

function bearer(request: Request): string {
  const h = request.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

function same(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function deny(status: number, msg: string) {
  return Response.json({ error: msg }, { status, headers: nodeCors });
}

/** Owner-only door: queue jobs, read results. */
export function requireOperator(request: Request): Response | null {
  const op = process.env.OPERATOR_API_TOKEN;
  if (!op) return deny(503, "Hub not provisioned: OPERATOR_API_TOKEN is not set");
  return same(bearer(request), op) ? null : deny(401, "Unauthorized");
}

/** Node door: a node key, or the operator key while no node key exists. */
export function requireNode(request: Request): Response | null {
  const node = process.env.NODE_API_TOKEN;
  const op = process.env.OPERATOR_API_TOKEN;
  if (!node && !op) return deny(503, "Hub not provisioned: no node key is set");
  const t = bearer(request);
  return same(t, node ?? "") || same(t, op ?? "") ? null : deny(401, "Unauthorized");
}

export const NODE_ID = /^[A-Za-z0-9._-]{1,64}$/;
export const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_OUTPUT_BYTES = 95 * 1024 * 1024;
export const OUTPUT_BUCKET = "node-outputs";

export function safeFilename(raw: string | null): string {
  const base = (raw ?? "").replace(/\\/g, "/").split("/").pop() ?? "";
  const clean = base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
  return clean && clean !== "." && clean !== ".." ? clean : "output.bin";
}

export const ALLOWED_MIME = /^(video|image|audio)\/[A-Za-z0-9.+-]+$|^application\/octet-stream$/;
