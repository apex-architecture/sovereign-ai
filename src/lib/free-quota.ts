// The free pre-production allowance (Door C). Script and storyboard are open to every visitor;
// video stays with the owner. Each unit spends a little of the owner's cloud credit, so the
// allowance is capped per visitor per day and studio-wide per day. The server is the only judge.

export type FreeKind = "script" | "frame";

export const FREE_LIMITS: Record<FreeKind, { perVisitor: number; studioWide: number }> = {
  script: { perVisitor: 6, studioWide: 200 },
  frame: { perVisitor: 24, studioWide: 400 },
};

export type Claim =
  | { ok: true; remaining: number }
  | { ok: false; reason: "visitor" | "studio"; message: string };

/** Turns the database's claim code into a plain answer. -1 = your cap, -2 = studio cap. */
export function readClaim(kind: FreeKind, code: number): Claim {
  if (code === -2) {
    return { ok: false, reason: "studio", message: "Today's free studio budget is spent for everyone. It resets at midnight UTC." };
  }
  if (code < 0) {
    const n = FREE_LIMITS[kind].perVisitor;
    const what = kind === "script" ? `${n} free scripts` : `${n} free storyboard frames`;
    return { ok: false, reason: "visitor", message: `You've used today's ${what}. It resets at midnight UTC.` };
  }
  return { ok: true, remaining: code };
}

export function remainingFrom(kind: FreeKind, used: number): number {
  return Math.max(0, FREE_LIMITS[kind].perVisitor - used);
}
