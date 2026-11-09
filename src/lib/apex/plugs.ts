/**
 * The four plugs — the whole of how anything connects to this platform.
 *
 * The platform is a switchboard on the internet. It owns no GPU, runs no model and stores no
 * footage. A creator plugs their own compute in through one of four paths; the platform routes
 * the job, records the receipt and takes the toll. Nothing is installed on the operator's laptop.
 *
 * "local" in the connector table therefore means THE CREATOR's machine, reached over the network.
 * It never means the machine this code was written on.
 *
 * The browser constraint stated honestly, because it decides which plugs work from static hosting:
 * a page may only call a cross-origin endpoint that sends CORS headers. That is a browser rule,
 * not a platform policy, and no amount of frontend code removes it. Each plug below says plainly
 * whether it survives that rule on GitHub Pages with no server at all.
 */

import { CONNECTORS, type Connector } from "./connectors.ts";

export type Plug = "byok" | "remote-rig" | "webhook" | "browser";

export interface PlugSpec {
  id: Plug;
  name: string;
  /** Plain words, for the Connect page. */
  what: string;
  whoComputes: string;
  whoPays: string;
  /** What the creator supplies to make this plug live. */
  needs: string;
  /** The cross-origin truth, not a marketing answer. */
  cors: string;
  /** Can this run from the static rail with no server and no bridge? */
  worksOnPages: boolean;
}

export const PLUGS: PlugSpec[] = [
  {
    id: "browser",
    name: "In the visitor's browser",
    what: "The PSI seal and the prompt compiler run inside the browser already open on the visitor's own device — a brief becomes a shot matrix and a node graph with no server, no key and no model called. The edit and grade engines are declared contracts, not built yet — the stage table below says which is which.",
    whoComputes: "The visitor's device — phone, laptop, anything with a browser",
    whoPays: "Nobody. No server is involved and no meter runs.",
    needs: "Nothing. It is already there.",
    cors: "No network call, so no cross-origin question arises.",
    worksOnPages: true,
  },
  {
    id: "remote-rig",
    name: "The creator's own rig",
    what: "The creator supplies the address of their own ComfyUI or Ollama. The platform sends the graph; their machine does the work.",
    whoComputes: "The creator's GPU, in their own room",
    whoPays: "The creator, in electricity. The platform pays nothing.",
    needs: "A reachable endpoint URL, and CORS enabled for this platform's origin.",
    // Verified against the installed ComfyUI source: comfy/cli_args.py defines
    // --enable-cors-header ORIGIN (nargs="?", const="*"), and server.py installs the
    // middleware only when that argument is present. Without it the browser refuses the call.
    cors: "ComfyUI sends no CORS headers by default. The creator launches it with --enable-cors-header <this origin>, which is a documented flag, and the browser then permits the call. Ollama needs OLLAMA_ORIGINS set to the same origin.",
    worksOnPages: true,
  },
  {
    id: "byok",
    name: "The creator's own cloud key",
    what: "The creator pastes their own Replicate, RunPod, fal or DeepSeek key. Their credits are consumed; the platform never pays for a render.",
    whoComputes: "The provider's GPU",
    whoPays: "The creator, directly to the provider",
    needs: "An API key held only in the creator's own browser storage.",
    cors: "Most inference APIs send no CORS headers, so a static page cannot call them directly. This plug needs either the creator bridge or a server function that forwards without storing. It is not available from the static rail alone.",
    worksOnPages: false,
  },
  {
    id: "webhook",
    name: "A webhook",
    what: "Any tool that can POST connects in one line. The platform sends the job; the tool calls back with the result.",
    whoComputes: "Whatever is behind the webhook",
    whoPays: "Whoever owns that endpoint",
    needs: "A public URL that accepts a POST and returns a result.",
    cors: "Server-to-server, so the browser rule does not apply. Needs a server or a scheduled runner to send and receive.",
    worksOnPages: false,
  },
];

export const PLUG_BY_ID: Record<Plug, PlugSpec> = Object.fromEntries(
  PLUGS.map((p) => [p.id, p]),
) as Record<Plug, PlugSpec>;

/**
 * How the browser actually reaches the thing. This is the field that stops the Connect page
 * lying: a plug can be correct and still be unreachable, because `local://ffmpeg` is a process
 * spawn and no browser has ever called a process. Reach says what has to exist in between.
 *
 *   device  — no network call at all; the visitor's browser does the work
 *   direct  — the creator's own HTTP endpoint, with CORS enabled for this origin
 *   bridge  — a local process or a non-CORS API; the creator bridge turns it into an endpoint
 *   server  — a platform server function sends it; not available from static hosting
 */
export type Reach = "device" | "direct" | "bridge" | "server";

export interface PluggedConnector {
  connector: Connector;
  plug: Plug;
  reach: Reach;
}

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/;

export function classify(c: Connector): { plug: Plug; reach: Reach } {
  if (c.hosting === "browser") return { plug: "browser", reach: "device" };
  if (c.hosting === "provider-cloud") return { plug: "byok", reach: "bridge" };
  if (c.hosting === "self-hosted" || c.hosting === "edge") return { plug: "webhook", reach: "server" };
  if (c.apiBaseUrl.startsWith("local://")) return { plug: "remote-rig", reach: "bridge" };
  if (LOOPBACK.test(c.apiBaseUrl)) return { plug: "remote-rig", reach: "direct" };
  if (c.apiBaseUrl.startsWith("http")) return { plug: "remote-rig", reach: "direct" };
  return { plug: "remote-rig", reach: "bridge" };
}

export function plugFor(c: Connector): Plug {
  return classify(c).plug;
}

export function pluggedConnectors(): PluggedConnector[] {
  return CONNECTORS.map((connector) => ({ connector, ...classify(connector) }));
}

export function connectorsByPlug(plug: Plug): Connector[] {
  return pluggedConnectors()
    .filter((p) => p.plug === plug)
    .map((p) => p.connector);
}

export function connectorsByReach(reach: Reach): Connector[] {
  return pluggedConnectors()
    .filter((p) => p.reach === reach)
    .map((p) => p.connector);
}

/** How many connectors each plug carries — the shape of the switchboard, measured not asserted. */
export function plugCount(): Record<Plug, number> {
  const out: Record<Plug, number> = { byok: 0, "remote-rig": 0, webhook: 0, browser: 0 };
  for (const p of pluggedConnectors()) out[p.plug] += 1;
  return out;
}

export function reachCount(): Record<Reach, number> {
  const out: Record<Reach, number> = { device: 0, direct: 0, bridge: 0, server: 0 };
  for (const p of pluggedConnectors()) out[p.reach] += 1;
  return out;
}

/**
 * What can actually do work from the static rail with no server and no bridge: the built device
 * stages and the creator endpoints that can be CORS-enabled. A declared-but-unbuilt contract is
 * never counted here, and nothing is shown as live because the code for it exists.
 */
export function liveOnPages(): PluggedConnector[] {
  return pluggedConnectors().filter((p) => p.connector.built && (p.reach === "device" || p.reach === "direct"));
}

export function plugsLiveOnPages(): Plug[] {
  return [...new Set(liveOnPages().map((p) => p.plug))];
}

/** Connectors whose licence has not been read. Unverified is a valid answer; an invented one is not. */
export function unverifiedLicences(): string[] {
  return CONNECTORS.filter((c) => /unverified/i.test(c.licenceTerms)).map((c) => c.provider);
}