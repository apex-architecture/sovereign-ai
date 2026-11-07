import type { TechRecord } from "./schema.ts";

/**
 * APEX Connect — the connector contract. An integration must be replaceable without
 * redesigning the platform, so every provider carries its own exit.
 */

export const CONNECTOR_FAMILIES = [
  "ai-inference",
  "image-generation",
  "video-generation",
  "video-processing",
  "audio",
  "three-d",
  "storage",
  "search",
  "identity",
  "payments",
  "communication",
  "publishing",
  "documents",
  "maps",
  "research",
  "provenance",
  "analytics",
  "automation",
] as const;

export type ConnectorFamily = (typeof CONNECTOR_FAMILIES)[number];

export interface Connector {
  provider: string;
  product: string;
  family: ConnectorFamily;
  docsUrl: string;
  apiBaseUrl: string;
  authMethod: "bearer" | "token" | "api-key-header" | "oauth2" | "oidc" | "local-process" | "none";
  scopes: string[];
  actions: string[];
  webhookEvents: string[];
  rateLimit: string;
  usageCharge: string;
  licenceTerms: string;
  dataRetention: string;
  hosting: "local" | "self-hosted" | "edge" | "provider-cloud";
  securityStatus: "checked" | "unverified";
  /** Never empty: if this provider vanishes or reprices, what runs instead. */
  replacementProvider: string[];
  connectorVersion: string;
  lastTested: string | null;
}

export const CONNECTORS: Connector[] = [
  {
    provider: "ComfyUI",
    product: "ComfyUI API",
    family: "image-generation",
    docsUrl: "https://docs.comfy.org",
    apiBaseUrl: "http://127.0.0.1:8188",
    authMethod: "local-process",
    scopes: ["workflow.read", "workflow.submit", "history.read"],
    actions: ["queue_prompt", "interrupt", "history", "view_image", "upload_file"],
    webhookEvents: ["execution_complete", "execution_error"],
    rateLimit: "local, unbounded by policy",
    usageCharge: "$0 — runs on the creator's own hardware",
    licenceTerms: "GPL-3.0 tool; per-model licences assessed separately",
    dataRetention: "Nothing leaves the machine",
    hosting: "local",
    securityStatus: "checked",
    replacementProvider: ["InvokeAI", "Diffusers", "self-hosted ComfyUI on a rented GPU"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Ollama",
    product: "Ollama local models",
    family: "ai-inference",
    docsUrl: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    apiBaseUrl: "http://127.0.0.1:11434",
    authMethod: "none",
    scopes: ["models.list", "generate", "embeddings"],
    actions: ["generate", "chat", "embeddings", "pull"],
    webhookEvents: [],
    rateLimit: "local",
    usageCharge: "$0",
    licenceTerms: "MIT runtime; each weight carries its own licence",
    dataRetention: "Nothing leaves the machine",
    hosting: "local",
    securityStatus: "checked",
    replacementProvider: ["llama.cpp", "LocalAI", "vLLM"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Replicate",
    product: "Replicate predictions",
    family: "video-generation",
    docsUrl: "https://replicate.com/docs",
    apiBaseUrl: "https://api.replicate.com/v1",
    authMethod: "token",
    scopes: ["predictions.create", "predictions.read"],
    actions: ["create_prediction", "get_prediction", "cancel_prediction"],
    webhookEvents: ["prediction.completed"],
    rateLimit: "per-account, published in the console",
    usageCharge: "per-second metered; the customer's key pays, or APEX discloses its margin",
    licenceTerms: "proprietary service; model licences are separate per weights",
    dataRetention: "Provider retains inputs and outputs under its terms",
    hosting: "provider-cloud",
    securityStatus: "unverified",
    replacementProvider: ["RunPod", "Modal", "self-owned GPU running the same open weights"],
    connectorVersion: "1.0.0",
    lastTested: "2026-11-01",
  },
  {
    provider: "RunPod",
    product: "Serverless GPU pods",
    family: "video-generation",
    docsUrl: "https://docs.runpod.io",
    apiBaseUrl: "https://api.runpod.io/v2",
    authMethod: "api-key-header",
    scopes: ["pods.create", "pods.read", "jobs.submit"],
    actions: ["create_pod", "run_sync", "run_async", "terminate"],
    webhookEvents: ["job.finished"],
    rateLimit: "per-account",
    usageCharge: "hourly GPU; batch renders cost the pod-hours actually consumed",
    licenceTerms: "proprietary infrastructure, open software inside it",
    dataRetention: "Ephemeral volumes disappear on termination unless persisted",
    hosting: "provider-cloud",
    securityStatus: "unverified",
    replacementProvider: ["Replicate", "Lambda", "a GPU the studio owns"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "FFmpeg",
    product: "FFmpeg transcode and conform",
    family: "video-processing",
    docsUrl: "https://ffmpeg.org/ffmpeg.html",
    apiBaseUrl: "local://ffmpeg",
    authMethod: "local-process",
    scopes: ["exec"],
    actions: ["probe", "transcode", "concat", "loudnorm", "burn_subtitles", "grade", "finish"],
    webhookEvents: [],
    rateLimit: "local",
    usageCharge: "$0; NVENC speeds it up on the operator's card",
    licenceTerms: "LGPL-2.1 / GPL-2.0 build-dependent",
    dataRetention: "Nothing leaves the machine",
    hosting: "local",
    securityStatus: "checked",
    replacementProvider: ["GStreamer"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Blender",
    product: "Blender headless",
    family: "three-d",
    docsUrl: "https://docs.blender.org/api/current/",
    apiBaseUrl: "local://blender",
    authMethod: "local-process",
    scopes: ["exec"],
    actions: ["render_scene", "bpy_script", "previz_flythrough"],
    webhookEvents: [],
    rateLimit: "local",
    usageCharge: "$0",
    licenceTerms: "GPL-2.0; .blend files and renders are open output",
    dataRetention: "Nothing leaves the machine",
    hosting: "local",
    securityStatus: "checked",
    replacementProvider: ["Godot for real-time sets", "LuxCoreRender"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Whisper",
    product: "Whisper transcription",
    family: "audio",
    docsUrl: "https://github.com/openai/whisper",
    apiBaseUrl: "local://whisper",
    authMethod: "local-process",
    scopes: ["transcribe"],
    actions: ["transcribe", "align", "emit_srt"],
    webhookEvents: [],
    rateLimit: "local",
    usageCharge: "$0",
    licenceTerms: "MIT code; weights Apache-2.0 for the open releases",
    dataRetention: "Nothing leaves the machine",
    hosting: "local",
    securityStatus: "checked",
    replacementProvider: ["whisper.cpp", "Vosk"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "OpenTimestamps",
    product: "Bitcoin anchor batching",
    family: "provenance",
    docsUrl: "https://opentimestamps.org",
    apiBaseUrl: "https://bitcoinapi.xyz",
    authMethod: "none",
    scopes: ["anchor.submit", "anchor.verify"],
    actions: ["stamp_sha256", "verify_ots_file"],
    webhookEvents: [],
    rateLimit: "public service, batched",
    usageCharge: "fractions of a cent per proof when batched; verification is free",
    licenceTerms: "open protocol, no account",
    dataRetention: "Only a hash is published, never the content",
    hosting: "self-hosted",
    securityStatus: "checked",
    replacementProvider: ["Arweave", "Stacks", "an RFC 6962 transparency log APEX runs"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Supabase",
    product: "Project metadata and auth",
    family: "identity",
    docsUrl: "https://supabase.com/docs",
    apiBaseUrl: "https://<project>.supabase.co",
    authMethod: "bearer",
    scopes: ["authenticated", "service_role"],
    actions: ["select", "insert", "update", "rpc"],
    webhookEvents: [],
    rateLimit: "per-plan",
    usageCharge: "free allowance then metered",
    licenceTerms: "open-source self-hostable stack",
    dataRetention: "Project rows live in the studio's database",
    hosting: "provider-cloud",
    securityStatus: "unverified",
    replacementProvider: ["self-hosted Postgres", "PocketBase", "Cloudflare D1"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "PeerTube",
    product: "Federated video publishing",
    family: "publishing",
    docsUrl: "https://docs.joinpeertube.com/api",
    apiBaseUrl: "https://<instance>/api/v1",
    authMethod: "oauth2",
    scopes: ["videos:write", "users:read"],
    actions: ["upload_video", "update_video", "list_channels"],
    webhookEvents: ["video.published"],
    rateLimit: "per-instance",
    usageCharge: "the instance operator pays storage and bandwidth",
    licenceTerms: "AGPL-3.0",
    dataRetention: "Instance policy",
    hosting: "self-hosted",
    securityStatus: "unverified",
    replacementProvider: ["Owncast", "an S3 bucket behind a signed URL"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
  {
    provider: "Stripe",
    product: "Subscriptions and payouts",
    family: "payments",
    docsUrl: "https://docs.stripe.com/api",
    apiBaseUrl: "https://api.stripe.com/v1",
    authMethod: "bearer",
    scopes: ["read_write"],
    actions: ["create_customer", "create_subscription", "create_payout_split"],
    webhookEvents: ["invoice.paid", "checkout.session.completed"],
    rateLimit: "published in the console",
    usageCharge: "per successful transaction plus local fees",
    licenceTerms: "proprietary service",
    dataRetention: "Regulated financial records",
    hosting: "provider-cloud",
    securityStatus: "unverified",
    replacementProvider: ["Lago", "Kill Bill", "Adyen", "Invoice Ninja"],
    connectorVersion: "1.0.0",
    lastTested: null,
  },
];

export const CONNECTOR_BY_PROVIDER: Record<string, Connector> = Object.fromEntries(
  CONNECTORS.map((c) => [c.provider, c]),
);

/** No connector enters the platform without a named exit. */
export function connectorsWithoutExit(): string[] {
  return CONNECTORS.filter((c) => c.replacementProvider.length === 0).map((c) => c.provider);
}

export function connectorsByFamily(family: ConnectorFamily): Connector[] {
  return CONNECTORS.filter((c) => c.family === family);
}

/** Providers that must never become a survival dependency. */
export const SINGLE_POINT_RISK = CONNECTORS.filter(
  (c) => c.hosting === "provider-cloud",
).map((c) => `${c.provider} — exit: ${c.replacementProvider[0] ?? "UNDECLARED"}`);

export function describeConnector(c: Connector): string[] {
  return [
    `${c.provider} / ${c.product} (${c.family})`,
    `auth: ${c.authMethod} -> ${c.apiBaseUrl}`,
    `actions: ${c.actions.join(", ")}`,
    `cost: ${c.usageCharge}`,
    `licence: ${c.licenceTerms}`,
    `exit: ${c.replacementProvider.join(" | ")}`,
    `last tested: ${c.lastTested ?? "never"}`,
  ];
}
