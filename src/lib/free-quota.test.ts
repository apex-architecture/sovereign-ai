import { describe, expect, it } from "vitest";
import { FREE_LIMITS, readClaim, remainingFrom } from "./free-quota";

describe("free pre-production allowance", () => {
  it("gives each visitor 6 free scripts a day", () => {
    expect(FREE_LIMITS.script.perVisitor).toBe(6);
    expect(remainingFrom("script", 0)).toBe(6);
    expect(remainingFrom("script", 6)).toBe(0);
  });

  it("gives each visitor 24 free storyboard frames a day", () => {
    expect(FREE_LIMITS.frame.perVisitor).toBe(24);
    expect(remainingFrom("frame", 30)).toBe(0);
  });

  it("caps the whole studio at 200 scripts and 400 frames a day", () => {
    expect(FREE_LIMITS.script.studioWide).toBe(200);
    expect(FREE_LIMITS.frame.studioWide).toBe(400);
  });

  it("refuses when the visitor's own cap is spent", () => {
    const c = readClaim("script", -1);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe("visitor");
  });

  it("refuses everyone when the studio cap is spent", () => {
    const c = readClaim("frame", -2);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe("studio");
  });

  it("passes the remaining count through on success", () => {
    expect(readClaim("frame", 5)).toEqual({ ok: true, remaining: 5 });
  });
});
