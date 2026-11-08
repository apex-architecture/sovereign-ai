/**
 * One vocabulary for the whole house.
 *
 * The platform and the public rail used to speak two different languages: the app called a
 * room the Vault, the rail called it the Media Library; the app said Connect, the rail said
 * AI Tools; the app said Verify, the rail said Verification. Every one of those pairs is the
 * same room with two names, and a person who meets both ends has to learn both names.
 *
 * So the names live here, once. The app nav, the rail nav, the CI check and any third-party
 * integrator all read this file. A concept that exists only on the rail still gets its name
 * here, so the two ends can be compared without a human reading both.
 *
 * `built: false` means the concept is named but the surface does not exist yet. A nav that
 * admits a gap is better than a nav that lies about where it goes.
 */

export type Group = "Make" | "Watch" | "Build" | "Trust" | "Operate" | "Guide";

export type Concept = {
  /** Stable id. Everything keys off this, never off the label. */
  id: string;
  /** The one name. This is the only label any surface may use for this concept. */
  label: string;
  /** One line, plain words, that says what a person gets here. */
  purpose: string;
  group: Group;
  /** The app route, or null when the concept exists only on the public rail. */
  app: string | null;
  /** The public rail page (may carry an anchor), or null when it exists only in the app. */
  rail: string | null;
  /** false = named, not built. The nav shows it as a gap instead of a link. */
  built: boolean;
};

export const BRAND = {
  name: "Sovereign AI Filmverse",
  tagline: "The world studio, open to everyone",
  app: "https://sovereignfilmverse.tech",
  rail: "https://apex-architecture.github.io/sovereign-ai/",
} as const;

export const GROUPS: Group[] = ["Make", "Watch", "Build", "Trust", "Operate", "Guide"];

export const CONCEPTS: Concept[] = [
  { id: "studio", label: "Studio", purpose: "Your desk: ideas, renders and the pipeline", group: "Make", app: "/", rail: "studio.html", built: true },
  { id: "create", label: "Create", purpose: "Make a shot, an image or a clip", group: "Make", app: "/create", rail: null, built: true },
  { id: "director", label: "Director", purpose: "Lay the scene out, shot by shot", group: "Make", app: "/director", rail: null, built: true },
  { id: "oracle", label: "Oracle", purpose: "Turn a plain idea into a cinematic prompt", group: "Make", app: "/oracle", rail: null, built: true },
  { id: "mission", label: "Mission", purpose: "One idea walked from story to master", group: "Make", app: null, rail: "mission.html", built: true },

  { id: "theater", label: "Theater", purpose: "Watch the cut", group: "Watch", app: "/theater", rail: "cinema.html", built: true },
  { id: "library", label: "Library", purpose: "Every asset and every version", group: "Watch", app: "/vault", rail: "dailies.html", built: true },

  { id: "connect", label: "Connect", purpose: "Pick the machine that will shoot it", group: "Build", app: "/connect", rail: "engines.html", built: true },
  { id: "registry", label: "Registry", purpose: "Every tool and module, honestly measured", group: "Build", app: "/registry", rail: "verse.html", built: true },
  { id: "pipeline", label: "Pipeline", purpose: "The ten stages, and which are wired", group: "Build", app: null, rail: "workflow.html", built: true },
  { id: "opensource", label: "Open Source", purpose: "The tool map, and what it really costs", group: "Build", app: null, rail: "tools.html", built: true },
  { id: "projects", label: "Projects", purpose: "The films in flight", group: "Build", app: null, rail: "studio.html#projects", built: true },
  { id: "foreman", label: "Foreman", purpose: "The agent that builds and runs the house", group: "Build", app: null, rail: "studio.html#foreman", built: true },

  { id: "verify", label: "Verify", purpose: "Check a receipt. Free, no account", group: "Trust", app: "/verify", rail: "verify.html", built: true },
  { id: "passport", label: "Passport", purpose: "A portable record of the work", group: "Trust", app: "/seal", rail: "passport.html", built: true },
  { id: "rights", label: "Rights", purpose: "The honest rights ledger", group: "Trust", app: null, rail: "rights.html", built: true },

  { id: "console", label: "Console", purpose: "The build's own status board", group: "Operate", app: "/admin", rail: "console.html", built: true },
  { id: "cost", label: "Cost", purpose: "Usage and budgets", group: "Operate", app: "/cost", rail: null, built: true },
  { id: "broadcast", label: "Broadcast", purpose: "Send the film out", group: "Operate", app: "/broadcast", rail: null, built: true },

  { id: "guide", label: "Guide", purpose: "What it does and how to use it", group: "Guide", app: "/guide", rail: null, built: true },
  { id: "nominate", label: "Nominate", purpose: "Creator intake", group: "Guide", app: "/nominate", rail: null, built: true },
  { id: "beta", label: "Beta", purpose: "Join the beta", group: "Guide", app: "/beta", rail: null, built: true },
  { id: "legal", label: "Legal", purpose: "Terms, disclaimers and ownership", group: "Guide", app: "/legal", rail: null, built: true },

  { id: "academy", label: "Academy", purpose: "Lessons and walkthroughs", group: "Guide", app: null, rail: null, built: false },
  { id: "community", label: "Community", purpose: "Where creators meet", group: "Guide", app: null, rail: null, built: false },
  { id: "settings", label: "Settings", purpose: "Your account and your keys", group: "Operate", app: null, rail: null, built: false },
];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

/** App nav tiers. The side rail shows primary; the foot of the rail shows secondary. */
export const APP_PRIMARY = ["studio", "create", "director", "oracle", "theater", "library", "connect", "verify", "cost", "console"];
export const APP_SECONDARY = ["registry", "passport", "broadcast", "nominate", "beta", "guide", "legal"];

export const appNav = (ids: string[]) =>
  ids.map((id) => {
    const c = CONCEPT_BY_ID.get(id);
    if (!c) throw new Error(`vocabulary: unknown concept "${id}"`);
    if (!c.app) throw new Error(`vocabulary: "${id}" has no app route but is in the app nav`);
    return { ...c, to: c.app };
  });

/** Every app room, in group order, so a nav can be cut into readable sections. */
export const appNavAll = () =>
  GROUPS.flatMap((g) =>
    CONCEPTS.filter((c) => c.group === g && c.app).map((c) => ({
      ...c,
      to: c.app as string,
      tier: (APP_PRIMARY.includes(c.id) ? "primary" : "secondary") as "primary" | "secondary",
    })),
  );

/** The public rail nav, grouped the same way the app groups its rooms. */
export const railNav = () =>
  GROUPS.map((group) => ({
    group,
    items: CONCEPTS.filter((c) => c.group === group && (c.rail || !c.built)).map((c) => ({
      id: c.id,
      href: c.rail,
      label: c.label,
      built: c.built,
    })),
  })).filter((g) => g.items.length > 0);
