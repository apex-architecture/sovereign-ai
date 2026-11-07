// Sovereign error reporter — no third-party telemetry.
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    // Keep a lightweight ring buffer in sessionStorage for post-mortem.
    const key = "apex.errors";
    const raw = sessionStorage.getItem(key);
    const buf: any[] = raw ? JSON.parse(raw) : [];
    buf.push({ t: Date.now(), route: window.location.pathname, message: (error as any)?.message ?? String(error), context });
    sessionStorage.setItem(key, JSON.stringify(buf.slice(-25)));
  } catch { /* noop */ }
  console.error("[APEX]", error, context);
}
