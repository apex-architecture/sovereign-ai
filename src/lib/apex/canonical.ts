/**
 * Canonical JSON — one definition, shared by the signer and the checker.
 *
 * Why this file exists: a receipt has to be signed in the browser and verified on the
 * server, and node:crypto cannot be bundled for a browser. Both ends therefore
 * canonicalise through this one isomorphic function, and the SHA-256 that follows is
 * plain SHA-256 on both sides — the digest is identical, only the host API differs.
 *
 * The rule this file keeps: keys are sorted, whitespace is absent, and the bytes are
 * therefore a function of the value alone. Re-serialising a manifest cannot dodge a
 * signature by changing its field order.
 *
 * The sort is by UTF-16 code unit (RFC 8785), not by locale. `localeCompare` orders
 * "a" before "A" and ignores case at the first difference, so a manifest with a
 * mixed-case stageConfig key would sign different bytes in Node than in a browser with
 * different ICU data — the signature would then fail for a reason no one could see.
 * Code-unit order is the same in every engine, so the bytes are the same everywhere.
 */

export function canonical(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

export function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, sortDeep(val)]),
    );
  }
  return v;
}
