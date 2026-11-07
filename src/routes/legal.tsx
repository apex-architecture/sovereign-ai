import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal & Disclaimers — Sovereign AI Filmverse" },
      { name: "description", content: "Plain-language terms, disclaimers and content rules for the Sovereign AI Filmverse creative platform." },
      { property: "og:title", content: "Legal & Disclaimers — Sovereign AI Filmverse" },
      { property: "og:description", content: "A creative tool, provided as is. You own and answer for what you make." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legal,
});

const SECTIONS: { t: string; p: string[] }[] = [
  { t: "1. What this is", p: [
    "Sovereign AI Filmverse is a prototype software tool for creativity, filmmaking and experimentation. It is provided for testing and evaluation.",
    "It is not a law firm, certifier, notified body, insurer, broker or financial service. Nothing on this platform is legal, financial or professional advice.",
  ]},
  { t: "2. Provided as is", p: [
    "The software is provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including fitness for a particular purpose, availability, accuracy or non-infringement.",
    "Features may change, break or be removed at any time. Generated files from cloud engines may expire; keep your own copies.",
    "To the maximum extent permitted by law, the operators are not liable for any indirect, incidental or consequential loss arising from use of the platform. Nothing here limits rights that cannot be limited under applicable consumer law.",
  ]},
  { t: "3. Your content, your responsibility", p: [
    "You keep the rights you hold in your prompts, scripts, uploads and outputs, subject to the terms of any third-party model or tool you choose to use.",
    "You are solely responsible for what you create, upload and publish, and for having the rights to do so.",
    "Do not use the platform to make content that infringes copyright or trademarks, impersonates real people, deceives, harasses, sexualises minors, or breaks any law. Such content may be removed and access ended.",
  ]},
  { t: "4. AI-generated output", p: [
    "Output is produced by automated AI models and may be inaccurate, unexpected or resemble existing works. Review everything before you use or publish it.",
    "Where the law requires (for example EU AI Act Article 50), label AI-generated or manipulated media as such when you publish it.",
  ]},
  { t: "5. No affiliation", p: [
    "Sovereign AI Filmverse is independent. It is not affiliated with, sponsored by or endorsed by any film studio, streaming service, franchise, model provider or trademark owner. Names of third-party tools are used only to describe compatibility; they belong to their owners.",
    "Characters shown in platform artwork are original illustrations created for this project.",
  ]},
  { t: "6. Third-party and open-source tools", p: [
    "The platform can route work to third-party services and open-source software. Each is governed by its own licence and terms, which you accept when you use it. Listing a tool does not mean its licence has been reviewed for your use.",
  ]},
  { t: "7. PSI receipts — what they prove", p: [
    "Film receipts use the Proof of Stateful Integrity (PSI) protocol published at ai-governance-standard.com (IETF Internet-Draft draft-singh-psi, an individual submission, not an adopted IETF standard).",
    "A receipt proves that an exact file or record existed in that state at or before a time, and was signed by the holder of a key. It does not prove that the content is true, original, lawful or that the signer is its author. Sealing a lie produces a verifiable lie.",
  ]},
  { t: "8. Payments and renders", p: [
    "During testing, rendering on cloud GPUs is limited to the studio owner because each render has a real cost. No pricing, revenue or investment claim on this platform is an offer.",
  ]},
  { t: "9. Privacy", p: [
    "We store only what is needed to run the studio (such as render records). Do not enter personal or confidential data you do not want processed by AI services.",
  ]},
  { t: "10. Contact & changes", p: [
    "These terms may be updated as the platform develops. Continued use means you accept the current version. Questions: use the contact details on sovereignfilmverse.tech.",
  ]},
];

function Legal() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <div className="hud text-[10px] tracking-[0.4em]">Legal · Plain words</div>
      <h1 className="mt-3 font-display text-[34px] font-bold leading-tight text-foreground sm:text-[48px]">Legal &amp; Disclaimers</h1>
      <p className="mt-3 text-[15px] text-muted-foreground">A creative tool, provided as is. You own — and answer for — what you make.</p>
      <div className="mt-8 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.t} className="glass border border-hairline p-5">
            <h2 className="font-display text-[17px] font-semibold text-foreground">{s.t}</h2>
            {s.p.map((x, i) => <p key={i} className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{x}</p>)}
          </section>
        ))}
      </div>
      <p className="mt-8 text-[12px] text-muted-foreground">Prototype terms, last updated 7 November 2026. Have a qualified lawyer review before commercial launch.</p>
      <Link to="/guide" className="mt-4 inline-block text-[13px] text-primary">Read the platform guide →</Link>
    </main>
  );
}
