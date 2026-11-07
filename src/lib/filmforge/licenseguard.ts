import type { Tool } from "./catalog.ts";

export type UseCase = "personal" | "client-work" | "platform-bundle";

export type Verdict = "allowed" | "verify-first" | "blocked";

export interface GuardResult {
  verdict: Verdict;
  why: string;
}

const PERMISSIVE = ["MIT", "Apache-2.0", "BSD"];
const COPYLEFT = ["GPL", "AGPL"];

function isPermissive(license: string): boolean {
  return PERMISSIVE.some((p) => license.includes(p));
}

function isCopyleft(license: string): boolean {
  return COPYLEFT.some((p) => license.includes(p));
}

export function check(tool: Tool, use: UseCase): GuardResult {
  if (tool.commercial === "unknown") {
    return {
      verdict: "verify-first",
      why: `Licence "${tool.license}" has no confirmed commercial permission; never assumed`,
    };
  }

  if (tool.license.startsWith("proprietary-service")) {
    return use === "platform-bundle"
      ? { verdict: "blocked", why: "A rented service cannot be bundled as if it were yours" }
      : { verdict: "allowed", why: "Paid per job by whoever runs it; output belongs to the payer" };
  }

  if (tool.license === "proprietary-free") {
    return use === "platform-bundle"
      ? { verdict: "blocked", why: "Free to use, not free to redistribute" }
      : { verdict: "allowed", why: "Used by the operator; the rendered media is theirs" };
  }

  if (isPermissive(tool.license)) {
    return { verdict: "allowed", why: `${tool.license} permits every one of these uses` };
  }

  if (tool.commercial === "restricted") {
    return {
      verdict: "verify-first",
      why: `Marked restricted: "${tool.license}". ${tool.exit}`,
    };
  }

  if (isCopyleft(tool.license)) {
    return use === "platform-bundle"
      ? {
          verdict: "verify-first",
          why: `${tool.license} source obligations attach when it ships inside a product`,
        }
      : { verdict: "allowed", why: `${tool.license} tool, ordinary output is not a derivative` };
  }

  return { verdict: "verify-first", why: "No rule covers this licence; leave it unverified" };
}

export function isOfferable(tool: Tool, use: UseCase): boolean {
  return check(tool, use).verdict === "allowed";
}
