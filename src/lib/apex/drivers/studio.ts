/**
 * File-exchange and portal-only drivers — the honest remaining two thirds of "connected".
 *
 * APEX does not pretend to operate a GUI editor it cannot script. At file-exchange depth
 * it does the machine work around the human: assemble the cut list, preflight the codecs,
 * hand back a delivery package, and record what came back. That is real integration
 * without a fake API.
 */

import { existsSync, readdirSync } from "node:fs";
import type { Depth, JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

/**
 * A file-exchange driver is only honest if the app is on this machine — otherwise the
 * handoff it issues is a promise nobody can keep. So the probe looks for the executable
 * instead of asserting it, and a DOWN reason names a real location a creator can act on.
 */
function desktopApp(envVar: string, candidates: string[]): { ok: boolean; why: string } {
  const override = process.env[envVar];
  if (override) {
    return existsSync(override)
      ? { ok: true, why: `${envVar} → ${override}` }
      : { ok: false, why: `${envVar} points at ${override}, which is not on this disk` };
  }
  for (const p of candidates) {
    if (existsSync(p)) return { ok: true, why: p };
  }
  const looked = candidates.length === 0 ? "its install root" : candidates[0];
  return { ok: false, why: `${looked} is not on this disk — set ${envVar}` };
}

/**
 * Ardour installs as C:\Program\ArdourNN, so the version number is discovered rather than
 * pinned in this file — a pinned 10 would report a real install as missing.
 */
function ardourCandidates(): string[] {
  const out: string[] = [];
  for (const root of ["C:\\Program", "C:\\Program Files", "/Applications"]) {
    let entries: string[] = [];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!/^ardour/i.test(e)) continue;
      out.push(`${root}\\${e}\\bin\\ardour.exe`, `${root}/${e}/Contents/MacOS/Ardour`);
    }
  }
  out.push("/usr/bin/ardour", "/usr/local/bin/ardour");
  return out;
}

function rec(
  name: string,
  category: ToolDriver["record"]["category"],
  capability: string,
  replacements: string[],
  depth: Depth,
  officialUrl = "",
  sourceRepository = "",
): ToolDriver["record"] {
  return R({
    name,
    category,
    officialUrl,
    sourceRepository,
    license: "unverified",
    licenseVerified: false,
    selfHosting: depth === "file-exchange",
    localExecution: depth === "file-exchange",
    apiAvailable: false,
    hardware: "creator workstation",
    integrationMethod: "desktop-app",
    cost: "$0",
    capability,
    priority: "after-foundation",
    replacementOptions: replacements,
  });
}

/** Kdenlive: scriptable through its document format, so the handoff is a real project file. */
export const kdenliveDriver: ToolDriver = {
  toolId: "kdenlive",
  depth: "file-exchange",
  record: rec("Kdenlive", "video-editing", "multitrack timeline assembly and render presets", ["OpenShot", "Pitivi", "Olive", "Shotcut"], "file-exchange", "https://kdenlive.org", "https://invent.kde.org/multimedia/kdenlive"),
  runsOn: "creator-machine",
  async probe() {
    return desktopApp("APEX_KDENLIVE_BIN", [
      "C:\\Program Files\\Kdenlive\\bin\\kdenlive.exe",
      "C:\\Users\\apex1\\AppData\\Local\\Programs\\Kdenlive\\bin\\kdenlive.exe",
      "/Applications/kdenlive.app/Contents/MacOS/kdenlive",
      "/usr/bin/kdenlive",
    ]);
  },
  async handoff(input) {
    const project = `${input.projectId}.kdenlive`;
    return {
      instructions: `Open ${project}, confirm the cuts by eye, then render to ${input.sceneId}-master.mp4 at the project preset. APEX records the rendered file, not the click.`,
      files: [project, ...input.inputs],
    };
  },
};

/** DaVinci Resolve: the free app is proprietary; only the Studio build exposes scripting. */
export const resolveDriver: ToolDriver = {
  toolId: "davinci_resolve",
  depth: "file-exchange",
  record: {
    ...rec("DaVinci Resolve", "video-finishing", "grade, sound post, deliverables", ["Blender Video Sequence Editor", "Kdenlive", "Olive"], "file-exchange", "https://www.blackmagicdesign.com/products/davinciresolve", ""),
    license: "proprietary freemium (Resolve) / paid (Studio)",
    commercialUse: "restricted",
    redistribution: "no",
    geographicRestrictions: "export-controlled in some jurisdictions",
  },
  runsOn: "creator-machine",
  async probe() {
    return desktopApp("APEX_RESOLVE_BIN", [
      "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe",
      "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\fusionscript.dll",
      "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/MacOS/DaVinci Resolve",
      "/opt/resolve/bin/resolve",
    ]);
  },
  async handoff(input) {
    return {
      instructions: `Import ${input.inputs.join(", ")} into a Resolve timeline, grade, then export an IMF or ProRes master. APEX verifies the delivered hash against the ledger.`,
      files: [...input.inputs],
    };
  },
};

/** Ardour: session files are XML, so APEX can build the session and read back the mixdown. */
export const ardourDriver: ToolDriver = {
  toolId: "ardour",
  depth: "file-exchange",
  record: rec("Ardour", "audio-daw", "dialogue cleanup, foley, music bed, stem export", ["Qtractor", "Zrythm", "Audacity"], "file-exchange", "https://ardour.org", "https://github.com/Ardour/ardour"),
  runsOn: "creator-machine",
  async probe() {
    const found = ardourCandidates().filter((p) => existsSync(p));
    return found.length > 0
      ? { ok: true, why: found[0] }
      : { ok: false, why: `no Ardour install under C:\\Program, C:\\Program Files or /Applications — set APEX_ARDOUR_BIN` };
  },
  async handoff(input) {
    return {
      instructions: `Open the session built for ${input.sceneId}, balance dialogue against ambience, export stems to ${input.sceneId}-stems/.`,
      files: [`${input.projectId}-${input.sceneId}.ardour`, ...input.inputs],
    };
  },
};

/** A web service with no usable API: we link and record, and call that portal depth. */
export function makePortalDriver(toolId: string, name: string, officialUrl: string, url: (input: JobInput) => string): ToolDriver {
  return {
    toolId,
    depth: "portal-only",
    record: rec(name, "video-hosting", "distribution surface without an integration APEX can rely on", [], "portal-only", officialUrl, ""),
    runsOn: "any",
    async probe() {
      return { ok: false, why: "portal depth: no API, so automated publication is not claimed" };
    },
    portalUrl: url,
  };
}

/** At portal depth the run never happens — the platform must say so, not time out mysteriously. */
export function refuseAtPortalDepth(driver: ToolDriver, input: JobInput): JobResult {
  return {
    state: "blocked-by-licence",
    outputs: [],
    wallClockSeconds: 0,
    usdSpent: 0,
    reproducible: { portal: driver.portalUrl?.(input) ?? "" },
    log: `${driver.toolId} is portal-only: a human publishes, APEX records the URL it produced`,
  };
}
