import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState,
  HeadContent, Scripts, type ErrorComponentProps,
} from "@tanstack/react-router";
import { Fragment, useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { DreamGate, useShowIntro } from "@/components/DreamGate";
import { toast } from "sonner";
import { Clock, Pip } from "@/components/hud";
import { stageCoverage } from "@/lib/apex/connection";
import { APP_PRIMARY, APP_SECONDARY, appNav, appNavAll } from "@/lib/apex/vocabulary";
import logoMark from "@/assets/logo-mark.webp";
import {
  Archive, Cable, Clapperboard, Eye, Film, Gauge, Lock, Sparkles, MonitorPlay, Settings2, ShieldCheck, Wand2,
  type LucideIcon,
} from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel relative max-w-md px-10 py-12 text-center">
        <div className="hud text-primary">NO SIGNAL // 404</div>
        <h1 className="mt-3 text-7xl text-primary text-glow">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This reel doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block border border-primary/60 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary">Return to the deck</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => { reportClientError(error instanceof Error ? error : new Error(String(error)), { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-md px-8 py-10 text-center">
        <div className="hud text-primary">SYSTEM FAULT</div>
        <p className="mt-3 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <button onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 border border-primary/60 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary">Retry</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sovereign AI Filmverse" },
      { name: "description", content: "Sovereign AI Filmverse — the world studio, open to everyone. Make films with AI from any phone or browser." },
      { name: "theme-color", content: "#07070a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Filmverse" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Sovereign AI Filmverse" },
      { name: "twitter:title", content: "Sovereign AI Filmverse" },
      { property: "og:description", content: "Sovereign AI Filmverse — the world studio, open to everyone. Make films with AI from any phone or browser." },
      { name: "twitter:description", content: "Sovereign AI Filmverse — the world studio, open to everyone. Make films with AI from any phone or browser." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}


type NavItem = { to: string; label: string; sub: string; group: string; icon: LucideIcon };

/** One icon per room. The names come from the vocabulary, so the app and the rail agree. */
const ICONS: Record<string, LucideIcon> = {
  studio: Clapperboard,
  create: Wand2,
  director: Film,
  oracle: Eye,
  theater: MonitorPlay,
  library: Archive,
  connect: Cable,
  verify: ShieldCheck,
  cost: Gauge,
  console: Settings2,
};

const PRIMARY: NavItem[] = appNav(APP_PRIMARY).map((c) => ({
  to: c.to,
  label: c.label,
  sub: c.purpose,
  group: c.group,
  icon: ICONS[c.id],
}));

const SECONDARY: { to: string; label: string }[] = appNav(APP_SECONDARY).map((c) => ({
  to: c.to,
  label: c.label,
}));

const MOBILE_TABS = appNavAll();

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex min-w-0 items-center gap-3 leading-none">
      <img src={logoMark} alt="Sovereign AI Filmverse logo" width={256} height={256}
        className={"shrink-0 rounded-xl shadow-[0_0_24px_-6px_var(--primary)] " + (compact ? "h-10 w-10" : "h-12 w-12")} />
      <span className="min-w-0">
        <span className={"block font-display font-bold tracking-[0.04em] " + (compact ? "text-[24px]" : "text-[30px]")}>
          <span className="text-primary text-glow">SOVEREIGN</span>
          {!compact && <span className="text-foreground"> FILMVERSE</span>}
        </span>
        <span className="hud mt-1.5 block truncate text-[9px] tracking-[0.3em]">
          {compact ? "AI Filmverse" : <>The world studio, <span className="text-foreground/80">open to everyone</span></>}
        </span>
      </span>
    </Link>
  );
}

function LockButton() {
  const showIntro = useShowIntro();
  return (
    <button onClick={showIntro} title="Back to the welcome page" aria-label="Show welcome page"
      className="inline-flex h-9 items-center gap-1.5 border border-primary/50 px-3 text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
      <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Intro</span>
    </button>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-chassis/90 backdrop-blur-xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:h-[84px] lg:grid-cols-[1fr_auto_1fr] lg:px-6 lg:py-0">
        <div className="min-w-0">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden lg:block"><Brand /></div>
        </div>
        <div className="hud hidden items-center gap-5 text-[11px] tracking-[0.42em] text-muted-foreground lg:flex">
          Ideas <span className="text-primary">⟶</span> Frames <span className="text-primary">⟶</span> Worlds
        </div>
        <div className="flex items-center justify-end gap-4">
          <div className="hud hidden text-right text-[9px] leading-[1.5] tracking-[0.3em] lg:block">
            <span className="block text-foreground/80">More human</span>
            <span className="block">stories</span>
            <span className="block text-primary">possible</span>
          </div>
          <span className="hud hidden lg:inline">v1.0</span>
          <span className="hud text-right text-[9px] leading-[1.6] tracking-[0.25em] lg:hidden">
            <span className="block">More humans</span>
            <span className="block">bolder stories</span>
          </span>
          <LockButton />
        </div>
      </div>
      {/* Mobile tab strip */}
      <nav className="no-scrollbar flex items-stretch gap-1 overflow-x-auto border-t border-hairline px-2 lg:hidden">
        {MOBILE_TABS.map((t, i) => (
          <Fragment key={t.to + t.label}>
            {i > 0 && MOBILE_TABS[i - 1].group !== t.group && (
              <span aria-hidden className="my-2.5 w-px shrink-0 self-stretch bg-hairline" />
            )}
            <Link to={t.to} activeOptions={{ exact: t.to === "/" }}
              className="relative shrink-0 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
              activeProps={{ className: "!text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary after:shadow-[0_0_10px_var(--primary)]" }}>
              {t.label}
            </Link>
          </Fragment>
        ))}
      </nav>
    </header>
  );
}

/** On the film-making screen the room list folds to icons, so the film gets the width. */
function CompactRail() {
  return (
    <aside className="sticky top-[85px] hidden h-[calc(100vh-85px-33px)] w-[68px] shrink-0 flex-col border-r border-border bg-chassis/60 lg:flex">
      <nav className="no-scrollbar flex-1 overflow-y-auto py-3">
        {PRIMARY.map((it) => {
          const I = it.icon;
          return (
            <Link key={it.to} to={it.to} activeOptions={{ exact: it.to === "/" }} title={it.label} aria-label={it.label}
              className="relative flex h-12 items-center justify-center text-muted-foreground transition-colors hover:bg-rack/60 hover:text-foreground"
              activeProps={{ className: "!text-primary bg-primary/[0.08] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--primary)]" }}>
              <I className="h-5 w-5" strokeWidth={1.4} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function SideRail() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/create") return <CompactRail />;
  return (
    <aside className="sticky top-[85px] hidden h-[calc(100vh-85px-33px)] w-[240px] shrink-0 flex-col border-r border-border bg-chassis/60 lg:flex">
      <nav className="no-scrollbar flex-1 overflow-y-auto py-3">
        {PRIMARY.map((it, i) => {
          const I = it.icon;
          return (
            <Fragment key={it.to}>
              {i > 0 && PRIMARY[i - 1].group !== it.group && (
                <div className="hud px-6 pb-1 pt-4 text-[9px] tracking-[0.28em] text-muted-foreground/70">{it.group}</div>
              )}
              <Link to={it.to} activeOptions={{ exact: it.to === "/" }}
                className="group relative flex items-center gap-4 px-6 py-3.5 text-muted-foreground transition-colors hover:bg-rack/60 hover:text-foreground"
                activeProps={{ className: "!text-primary bg-primary/[0.08] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--primary)]" }}>
                <I className="h-6 w-6 shrink-0" strokeWidth={1.25} />
                <span className="min-w-0">
                  <span className="block font-display text-[17px] font-medium uppercase tracking-[0.06em] text-current">{it.label}</span>
                  <span className="hud block truncate text-[9px] tracking-[0.18em]">{it.sub}</span>
                </span>
              </Link>
            </Fragment>
          );
        })}
        <div className="mx-6 mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-hairline pt-4">
          {SECONDARY.map((s) => (
            <Link key={s.to} to={s.to} className="hud text-[9px] hover:text-foreground" activeProps={{ className: "!text-primary" }}>{s.label}</Link>
          ))}
        </div>
      </nav>
      <div className="px-6 pb-5">
        <span className="mb-3 block h-px w-10 bg-primary" />
        <p className="hud text-[10px] leading-[1.7] tracking-[0.32em]">Ideas<br />become<br />worlds</p>
        <span className="mt-3 block h-px w-24 bg-primary/70" />
      </div>
    </aside>
  );
}

function StatusBar() {
  const c = stageCoverage();
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 hidden h-[33px] items-center justify-between gap-6 border-t border-border bg-chassis/95 px-6 backdrop-blur lg:flex">
      <div className="hud flex items-center gap-4 text-[9.5px]">
        <span>Studio <span className="text-foreground/80">Sovereign AI Filmverse</span></span>
        <span className="text-hairline">|</span><span>24 fps</span>
        <span className="text-hairline">|</span><span>2.39:1</span>
        <span className="text-hairline">|</span><span>Stages wired <span className="text-foreground/80">{c.wired}/{c.total}</span></span>
      </div>
      <div className="hud flex items-center gap-4 text-[9.5px]">
        <span className="flex items-center gap-2 text-ok"><Pip tone="ok" pulse /> Studio online</span>
        <span className="text-hairline">|</span>
        <a href="/legal" className="hover:text-foreground">Legal &amp; disclaimers</a><span className="text-hairline">|</span><a href="https://www.ai-governance-standard.com/" target="_blank" rel="noreferrer" className="hover:text-foreground">PSI · ai-governance-standard.com</a>
        <span className="text-hairline">|</span>
        <Clock />
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <DreamGate>
        <TopBar />
        <div className="flex">
          <SideRail />
          <div className="min-w-0 flex-1 pb-6 lg:pb-[45px]">
            <Outlet />
          </div>
        </div>
        <StatusBar />
      </DreamGate>
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}
