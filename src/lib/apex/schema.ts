/**
 * APEX Global Technology Master Registry — record contract.
 *
 * The rule this file enforces: a technology is never marked permitted because someone
 * said "free". Every permission field defaults to "unverified" and must be lifted
 * individually against the actual licence text.
 */

export type Permission = "yes" | "restricted" | "no" | "unverified";
export type Status = "active" | "stale" | "abandoned" | "unverified";

export const CATEGORIES = [
  "video-generation",
  "image-generation",
  "identity-lock",
  "face-restore",
  "upscale",
  "video-editing",
  "video-finishing",
  "audio-daw",
  "voice",
  "music",
  "sound-fx",
  "subtitle",
  "three-d",
  "animation",
  "vfx-compositing",
  "render-farm",
  "games-interactive",
  "writing-script",
  "design-graphics",
  "photography",
  "ai-runtime",
  "ai-training",
  "ai-agents",
  "ai-retrieval-memory",
  "ai-evaluation-safety",
  "workflow-automation",
  "database",
  "search-index",
  "identity-auth",
  "storage-sync",
  "deploy-infra",
  "ci-cd-codehosting",
  "observability",
  "provenance-standard",
  "cryptography-keys",
  "rights-licensing",
  "digital-forensics",
  "asset-library-3d",
  "asset-library-image",
  "asset-library-audio",
  "asset-library-text",
  "commerce-marketplace",
  "payments-billing",
  "crm-operations",
  "contracts-documents",
  "publishing-cms",
  "video-hosting",
  "federated-social",
  "research-compute",
  "knowledge-graph",
  "geospatial",
  "translation",
  "accessibility",
  "hardware-fabrication",
  "robotics",
  "analytics-marketing",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["now", "after-foundation", "after-usage", "when-justified"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const INTEGRATION_METHODS = [
  "cli",
  "python-api",
  "http-api",
  "node-graph",
  "plugin-or-cli",
  "web-app",
  "desktop-app",
  "protocol",
  "library",
] as const;
export type IntegrationMethod = (typeof INTEGRATION_METHODS)[number];

export interface TechRecord {
  name: string;
  category: Category;
  officialUrl: string;
  sourceRepository: string;
  /** Licence family as written on the project, or "unverified". */
  license: string;
  /** true only when a human has read the licence text and recorded the date. */
  licenseVerified: boolean;
  commercialUse: Permission;
  redistribution: Permission;
  modification: Permission;
  attribution: Permission;
  /** Restrictions the licence places on generated output. */
  outputConditions: string;
  /** What the project discloses about training data / dependencies. */
  trainingDataDisclosure: string;
  geographicRestrictions: string;
  /** Can APEX expose this through its own interface? */
  apiTerms: Permission;
  selfHosting: boolean;
  localExecution: boolean;
  apiAvailable: boolean;
  hardware: string;
  maintenanceStatus: Status;
  securityStatus: Status;
  dataPortability: string;
  integrationMethod: IntegrationMethod;
  cost: "$0" | "per-job" | "subscription" | "self-host-hardware";
  /** What APEX runs instead if this disappears. Never empty. */
  replacementOptions: string[];
  capability: string;
  priority: Priority;
  lastVerified: string | null;
}

type Partial_ = Partial<TechRecord> & Pick<TechRecord, "name" | "category">;

/** Build a record with every permission deliberately unverified until a human reads it. */
export function R(p: Partial_): TechRecord {
  const rec: TechRecord = {
    officialUrl: "",
    sourceRepository: "",
    license: "unverified",
    licenseVerified: false,
    commercialUse: "unverified",
    redistribution: "unverified",
    modification: "unverified",
    attribution: "unverified",
    outputConditions: "unverified",
    trainingDataDisclosure: "unverified",
    geographicRestrictions: "unverified",
    apiTerms: "unverified",
    selfHosting: false,
    localExecution: true,
    apiAvailable: false,
    hardware: "unverified",
    maintenanceStatus: "unverified",
    securityStatus: "unverified",
    dataPortability: "unverified",
    integrationMethod: "plugin-or-cli",
    cost: "$0",
    replacementOptions: [],
    capability: "",
    priority: "after-foundation",
    lastVerified: null,
    ...p,
  } satisfies TechRecord;

  // A row cannot assert that a human read its licence without recording when it happened.
  if (rec.lastVerified === null) rec.licenseVerified = false;
  return rec;
}

/** The only rows allowed to be offered to a paying customer or bundled into the platform. */
export function isClearedForWork(rec: TechRecord): boolean {
  return rec.licenseVerified && rec.commercialUse === "yes";
}
