import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import {
  CONTACT_EMAIL,
  MAILING_ADDRESS,
  ORG_CHARITIES_REG,
  ORG_EIN,
  ORG_SHORT,
} from "./org";

const MAROON = "#8C1515";
const NAVY = "#2c3e50";
const BLACK = "#111111";
const CHARCOAL = "#262b33";
const LOGO_WOLF = "/assets/ewa-wolf.jpg";
const LOGO_LOCKUP = "/assets/eastlake_wolves_lockup_1.png";
const LAST_UPDATED = "September 7, 2026";

export function LegalPages({ page }: { page: "privacy" | "accessibility" }) {
  const title = page === "privacy" ? "Privacy Policy" : "Accessibility";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-body)" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded focus:bg-white focus:text-sm focus:font-bold"
        style={{ color: NAVY }}
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-white">
        <nav className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between" aria-label="Legal page">
          <a href="#home" className="flex items-center gap-2">
            <img src={LOGO_WOLF} alt="Eastlake Wolves" className="h-10 w-10 object-contain" />
          </a>
          <a href="#home" className="flex items-center gap-1.5 text-sm font-bold hover:opacity-70" style={{ color: NAVY }}>
            <ChevronLeft size={16} /> Back to site
          </a>
        </nav>
      </header>

      <main id="main" className="max-w-3xl mx-auto px-6 py-16">
        <p className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>
          Eastlake Wolfpack Association
        </p>
        <h1
          className="font-black leading-none uppercase mb-3"
          style={{ fontFamily: "var(--font-display)", color: NAVY, fontSize: "clamp(2.25rem, 5vw, 3.25rem)" }}
        >
          {title}
        </h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated {LAST_UPDATED}</p>

        {page === "privacy" ? <PrivacyCopy /> : <AccessibilityCopy />}
      </main>

      <footer className="border-t border-white/10 mt-8" style={{ background: `linear-gradient(180deg, ${CHARCOAL} 0%, ${BLACK} 100%)` }}>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <img src={LOGO_LOCKUP} alt="Eastlake Wolves" className="h-10 object-contain mb-4" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-white/45 text-sm mb-6">501(c)(3) · Tax ID {ORG_EIN} · WA Charities #{ORG_CHARITIES_REG}</p>
          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-white/45 text-xs">© 2025 Eastlake Wolfpack Association. All rights reserved.</span>
              <a href="#privacy" className="text-white/45 hover:text-white text-xs underline underline-offset-2">Privacy</a>
              <a href="#accessibility" className="text-white/45 hover:text-white text-xs underline underline-offset-2">Accessibility</a>
            </div>
            <span className="text-white/45 text-xs">Eastlake High School · Sammamish, WA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PrivacyCopy() {
  return (
    <div className="space-y-6 text-[15px] leading-relaxed text-muted-foreground">
      <p>
        We do not ask the public for personal information, run advertising analytics, or sell your
        information. We do not process payment details on this website. This site is intended for
        parents and community members and is not directed at children under 13. We only use cookies
        for board member logins. You do not need cookies to use the public site.
      </p>
      <p>
        For questions, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline underline-offset-2" style={{ color: MAROON }}>
          {CONTACT_EMAIL}
        </a>
        {" "}or write to {ORG_SHORT}, {MAILING_ADDRESS}.
      </p>
    </div>
  );
}

function AccessibilityCopy() {
  return (
    <div className="space-y-6 text-[15px] leading-relaxed text-muted-foreground">
      <p>
        We are committed to making this website usable for everyone. If you have trouble accessing
        any page or feature, please email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline underline-offset-2" style={{ color: MAROON }}>
          {CONTACT_EMAIL}
        </a>
        {" "}so we can assist you.
      </p>
    </div>
  );
}
