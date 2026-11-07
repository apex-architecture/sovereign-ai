/**
 * The platform's hands — Vercel Labs' agent-desktop, wrapped as a driver.
 *
 * Most of this film pipeline ends at a desktop app APEX cannot script: Resolve, Kdenlive,
 * Ardour, CapCut. Until now the honest answer was "a human does it". agent-desktop changes
 * that because it acts through the OS accessibility tree with ref IDs instead of pixels:
 * ref actions are headless by default, so the platform can operate an app while the creator
 * keeps the keyboard.
 *
 * The law this file exists to enforce: the operator never gets the screen. `--headed`, real
 * pointer/keyboard input and focus-stealing window commands are refused before they reach the
 * binary, not after. A build step that hijacks Master's desktop is a defect, not a feature.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, tail } from "./exec.ts";
import { R } from "../schema.ts";

/**
 * The npm global install leaves a `.cmd` shim on PATH, and a `.cmd` cannot be spawned without
 * a shell — so the driver resolves the compiled binary inside the package instead. Guessing
 * the shim name is how a working tool gets reported as missing.
 */
function resolveBin(): string {
  const override = process.env.APEX_AGENT_DESKTOP_BIN;
  if (override) return override;
  const platform = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "win32" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const exe = platform === "win32" ? ".exe" : "";
  const roots =
    platform === "win32"
      ? [process.env.APPDATA ?? `${homedir()}\\AppData\\Roaming`]
      : [`${homedir()}/.npm-global`, "/usr/local/lib/node_modules", "/usr/lib/node_modules"];
  for (const root of roots) {
    const p = `${root}${platform === "win32" ? "\\" : "/"}agent-desktop${platform === "win32" ? "" : "/lib"}/bin/agent-desktop-${platform}-${arch}${exe}`;
    if (existsSync(p)) return p;
    const nested = `${root}${platform === "win32" ? "\\npm\\node_modules" : "/node_modules"}/agent-desktop/bin/agent-desktop-${platform}-${arch}${exe}`;
    if (existsSync(nested)) return nested;
  }
  return "agent-desktop";
}

const BIN = resolveBin();

/** Commands that move the cursor, take OS focus, or open system surfaces over the user's head. */
const FOREGROUND_COMMANDS = new Set([
  "double-click",
  "triple-click",
  "hover",
  "drag",
  "mouse-move",
  "mouse-click",
  "mouse-down",
  "mouse-up",
  "mouse-wheel",
  "focus-window",
  "key-down",
  "key-up",
  "open-system-surface",
]);

/** One step of a desktop plan: a command plus its literal arguments. */
export interface DesktopAction {
  command: string;
  args?: string[];
}

function parseEnvelope(stdout: string): { ok: boolean; data?: any; error?: any } {
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: false, error: { message: `no JSON envelope from ${BIN}: ${stdout.slice(0, 200)}` } };
  }
}

/**
 * Run a plan headlessly. Every step must report a delivered disposition; the first refusal
 * ends the plan, because a desktop action that lands out of order is worse than no action.
 */
export async function runDesktopPlan(
  actions: DesktopAction[],
  perActionSeconds = 30,
): Promise<{ state: "succeeded" | "failed" | "blocked-by-guard"; steps: string[]; seconds: number }> {
  const started = Date.now();
  const steps: string[] = [];

  for (const action of actions) {
    if (FOREGROUND_COMMANDS.has(action.command)) {
      steps.push(`REFUSED ${action.command}: foreground input is not permitted while the creator is working`);
      return { state: "blocked-by-guard", steps, seconds: (Date.now() - started) / 1000 };
    }
    const args = (action.args ?? []).filter((a) => a !== "--headed");
    if ((action.args ?? []).includes("--headed")) {
      steps.push(`STRIPPED --headed from ${action.command}: headless ref actions only`);
    }
    const r = await exec(BIN, [action.command, ...args], perActionSeconds);
    const env = parseEnvelope(r.stdout);
    const delivery = env.data?.disposition?.delivery ?? (env.ok ? "ok" : `error: ${env.error?.message ?? r.stderr.slice(0, 160)}`);
    steps.push(`${action.command} → ${delivery}`);
    if (!env.ok) return { state: "failed", steps, seconds: (Date.now() - started) / 1000 };
  }

  return { state: actions.length === 0 ? "failed" : "succeeded", steps, seconds: (Date.now() - started) / 1000 };
}

/** Read what is on screen right now — the accessibility tree, no screenshot, no focus. */
export async function snapshot(app: string): Promise<{ refs: number; tree: unknown; why: string }> {
  const r = await exec(BIN, ["snapshot", "--app", app, "--json"], 45);
  const env = parseEnvelope(r.stdout);
  if (!env.ok) return { refs: 0, tree: null, why: env.error?.message ?? tail(r.stderr, 200) };
  const nodes = env.data?.nodes ?? env.data?.elements ?? [];
  return { refs: Array.isArray(nodes) ? nodes.length : 0, tree: env.data, why: `snapshot ${env.data?.snapshot_id ?? ""} of ${app}` };
}

/**
 * A driver at drivable depth: the plan comes from the stage (input.variant), so the spine can
 * hand a GUI-only app a scripted sequence and read back what the app actually reported.
 */
export const agentDesktopDriver: ToolDriver = {
  toolId: "agent_desktop",
  depth: "drivable",
  record: R({
    name: "agent-desktop (Vercel Labs)",
    category: "ai-agents",
    officialUrl: "https://github.com/vercel-labs/agent-desktop",
    license: "Apache-2.0",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: true,
    hardware: "any workstation; no GPU",
    integrationMethod: "cli",
    cost: "$0",
    capability: "operate desktop apps by accessibility ref, headlessly — snapshot, find, click, type, set-value, scroll, launch",
    priority: "now",
    replacementOptions: ["UI-TARS Desktop (vision-based)", "WinAppDriver", "pywinauto", "manual handoff"],
    dataPortability: "plain JSON envelopes; nothing stored outside the project",
    outputConditions: "accessibility permission is granted per machine; without it the driver reports DOWN",
  }),
  runsOn: "creator-machine",

  async probe() {
    const r = await exec(BIN, ["status"], 20);
    const env = parseEnvelope(r.stdout);
    if (!env.ok) return { ok: false, why: `${BIN} not answering: ${env.error?.message ?? tail(r.stderr, 160)}` };
    const acc = env.data?.permissions?.accessibility?.state;
    if (acc !== "granted") return { ok: false, why: `accessibility permission is ${acc}, not granted` };
    return { ok: true, why: `${env.data?.platform} ref actions headless; ${env.data?.ref_count ?? 0} refs live` };
  },

  async run(input: JobInput): Promise<JobResult> {
    let plan: DesktopAction[] = [];
    try {
      plan = JSON.parse(input.variant ?? "[]") as DesktopAction[];
    } catch {
      return {
        state: "failed",
        outputs: [],
        wallClockSeconds: 0,
        usdSpent: 0,
        reproducible: { binary: BIN },
        log: `agent_desktop needs a JSON plan in variant, got: ${tail(input.variant ?? "", 200)}`,
      };
    }
    const res = await runDesktopPlan(plan, Math.min(input.timeoutSeconds, 120));
    return {
      state: res.state,
      outputs: [],
      wallClockSeconds: res.seconds,
      usdSpent: 0,
      reproducible: { binary: BIN, plan },
      log: res.steps.join("\n"),
    };
  },
};
