import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { REPLICATE_API, replicateHeaders } from "@/lib/replicate-gateway";
import { FREE_LIMITS, readClaim, type Claim, type FreeKind } from "@/lib/free-quota";

/** An anonymous daily key for the visitor: a hash of their network address, never the address. */
export async function visitorBucket(): Promise<string> {
  const req = getRequest();
  const h = req?.headers;
  const ip =
    h?.get("cf-connecting-ip") ??
    h?.get("x-real-ip") ??
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const bytes = new TextEncoder().encode(`filmverse-free:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True only when the caller carries a valid session whose user holds the admin (owner) role. */
export async function callerIsOwner(): Promise<boolean> {
  const auth = getRequest()?.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return false;
  const sb = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  const uid = data?.claims?.sub;
  if (error || !uid) return false;
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
  return isAdmin === true;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function claim(bucket: string, kind: FreeKind): Promise<Claim> {
  const sb = await admin();
  const lim = FREE_LIMITS[kind];
  const { data, error } = await sb.rpc("claim_free_quota", {
    _bucket: bucket, _kind: kind, _limit: lim.perVisitor, _global_limit: lim.studioWide,
  });
  if (error) throw new Error("The free allowance could not be checked. Try again in a moment.");
  return readClaim(kind, data as number);
}

export async function refund(bucket: string, kind: FreeKind) {
  const sb = await admin();
  await sb.rpc("refund_free_quota", { _bucket: bucket, _kind: kind });
}

export async function used(bucket: string, kind: FreeKind): Promise<number> {
  const sb = await admin();
  const { data } = await sb.rpc("free_quota_used", { _bucket: bucket, _kind: kind });
  return (data as number) ?? 0;
}

export class EngineError extends Error {
  constructor(message: string, public noCredit = false) { super(message); }
}

/** Runs a hosted model and waits for its answer (up to ~90 s). */
export async function runModel(model: string, input: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${REPLICATE_API}/models/${model}/predictions`, {
    method: "POST",
    headers: { ...replicateHeaders(), Prefer: "wait=55" },
    body: JSON.stringify({ input }),
  });
  let j = (await res.json().catch(() => ({}))) as any;
  if (res.status === 402) {
    throw new EngineError("The studio's cloud engine account is out of credit, so free drafts are paused until the owner tops it up.", true);
  }
  if (!res.ok || !j?.id) {
    console.error("[preproduction] engine refused", model, res.status, j?.detail ?? j?.error);
    throw new EngineError("The cloud engine is busy right now. Try again in a minute.");
  }
  for (let i = 0; i < 18 && j.status !== "succeeded" && j.status !== "failed" && j.status !== "canceled"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const p = await fetch(`${REPLICATE_API}/predictions/${j.id}`, { headers: replicateHeaders() });
    j = await p.json();
  }
  if (j.status !== "succeeded") {
    console.error("[preproduction] engine failed", model, j.status, j.error);
    throw new EngineError("The engine could not finish this one. Try again.");
  }
  return j.output;
}

/** Stores a storyboard frame in the private studio bucket and returns its id. */
export async function keepFrame(remoteUrl: string): Promise<string> {
  const img = await fetch(remoteUrl);
  if (!img.ok) throw new EngineError("The frame was drawn but could not be saved. Try again.");
  const bytes = new Uint8Array(await img.arrayBuffer());
  const id = `${crypto.randomUUID()}.webp`;
  const sb = await admin();
  const { error } = await sb.storage.from("storyboards").upload(id, bytes, { contentType: "image/webp", upsert: false });
  if (error) {
    console.error("[preproduction] store failed", error.message);
    throw new EngineError("The frame was drawn but could not be saved. Try again.");
  }
  return id;
}
