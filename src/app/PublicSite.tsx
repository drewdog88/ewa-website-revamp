import { useState, useEffect } from "react";
import {
  Menu, X, ArrowRight, Calendar, QrCode, ExternalLink, Globe, Heart,
} from "lucide-react";
import { PaymentModal } from "./PaymentModal";
import type { Club, NewsItem, Officer, Resource, Fundraiser } from "./api";

const MAROON = "#8C1515";
const BLACK = "#111111";
const LOGO_LOCKUP = "/assets/eastlake_wolves_lockup_1.png";
const LOGO_WOLF = "/assets/ewa-wolf.jpg";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function tagStyle(tag: string | null) {
  const t = (tag || "").toLowerCase();
  if (t.includes("athlet")) return { background: `${MAROON}25`, color: "#c25555" };
  if (t.includes("fundrais")) return { background: "rgba(16,185,129,0.15)", color: "#34d399" };
  return { background: "rgba(59,130,246,0.15)", color: "#60a5fa" };
}

const dollars = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function PublicSite({
  clubs, news, officers, resources, fundraiser, onGoAdmin,
}: {
  clubs: Club[];
  news: NewsItem[];
  officers: Officer[];
  resources: Resource[];
  fundraiser: Fundraiser | null;
  onGoAdmin: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [payingClub, setPayingClub] = useState<Club | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const activeClubs = clubs.filter((c) => c.active);
  const showFundraiser = !!fundraiser && fundraiser.isActive !== false && fundraiser.goalCents > 0;
  const pct = showFundraiser
    ? Math.min(100, Math.round((fundraiser!.raisedCents / fundraiser!.goalCents) * 100))
    : 0;

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Our Clubs", href: "#clubs" },
    { label: "News", href: "#news" },
    { label: "EWA Team", href: "#team" },
    { label: "Resources", href: "#resources" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-body)" }}>
      {payingClub && <PaymentModal club={payingClub} onClose={() => setPayingClub(null)} />}

      {/* NAV */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "shadow-xl" : ""}`}
        style={{ background: scrolled ? `${BLACK}f5` : "transparent", backdropFilter: scrolled ? "blur(8px)" : "none" }}>
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center">
            <img src={LOGO_LOCKUP} alt="Eastlake Wolves" className="h-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}
                className="text-white/75 hover:text-white transition-colors text-xs font-bold tracking-[0.15em] uppercase">
                {link.label}
              </a>
            ))}
            <button onClick={onGoAdmin}
              className="text-white font-black text-xs px-5 py-2.5 rounded tracking-widest uppercase transition-colors"
              style={{ background: MAROON }}>
              Admin
            </button>
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-1" style={{ background: BLACK }}>
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                className="text-white/70 hover:text-white text-sm font-bold tracking-widest uppercase py-3 border-b border-white/10">
                {link.label}
              </a>
            ))}
            <button onClick={() => { setMenuOpen(false); onGoAdmin(); }}
              className="text-white font-black text-sm px-4 py-3 rounded tracking-widest uppercase text-center mt-3"
              style={{ background: MAROON }}>
              Admin
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden" style={{ background: BLACK }}>
        <div className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&h=900&fit=crop&auto=format')" }}
          aria-hidden="true" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${BLACK} 0%, ${BLACK}cc 60%, ${BLACK}80 100%)` }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 w-full grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border text-[10px] font-black tracking-[0.25em] uppercase px-3 py-2 rounded mb-8"
              style={{ borderColor: `${MAROON}60`, background: `${MAROON}18`, color: MAROON }}>
              501(c)(3) Nonprofit · Tax ID 77-0616862
            </div>
            <h1 className="font-black text-white leading-none uppercase mb-6"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 8vw, 5.5rem)", letterSpacing: "-0.01em" }}>
              Eastlake<br />
              <span style={{ color: MAROON }}>Wolfpack</span><br />
              Association
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-md mb-8">
              Empowering Eastlake High School students in Sammamish, WA through community-driven support for athletics, arts, and sciences.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#clubs" className="text-white font-black text-xs px-7 py-4 rounded uppercase tracking-widest flex items-center gap-2 transition-colors hover:opacity-90"
                style={{ background: MAROON }}>
                Support a Club <ArrowRight size={14} />
              </a>
              <a href="#news" className="border border-white/30 text-white font-bold text-xs px-7 py-4 rounded uppercase tracking-widest hover:border-white/60 transition-colors">
                Latest News
              </a>
            </div>
          </div>

          <div className="hidden md:flex justify-center items-center">
            <img src={LOGO_WOLF} alt="Eastlake Wolves" className="w-72 h-72 object-contain opacity-80 drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 40px rgba(140,21,21,0.4))" }} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-28"
          style={{ background: "linear-gradient(to top, var(--background), transparent)" }} aria-hidden="true" />
      </section>

      {/* STAT STRIP */}
      <section style={{ background: MAROON }} className="py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/20">
          {[
            { value: `${activeClubs.length}`, label: "Booster Clubs" },
            { value: "501(c)(3)", label: "Nonprofit Status" },
            { value: "Wolf Strong", label: "Pack Strong" },
            { value: "Sammamish", label: "Eastlake High School" },
          ].map((stat) => (
            <div key={stat.label} className="text-center px-4 py-1">
              <div className="text-white font-black text-2xl md:text-3xl leading-none" style={{ fontFamily: "var(--font-display)" }}>{stat.value}</div>
              <div className="text-white/60 text-[10px] font-bold tracking-[0.18em] uppercase mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FUNDRAISER BAND */}
      {showFundraiser && (
        <section className="py-14 bg-background border-b border-border">
          <div className="max-w-4xl mx-auto px-6">
            <div className="rounded-2xl border border-border p-8" style={{ background: `${MAROON}08` }}>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} style={{ color: MAROON }} />
                <span className="font-black text-[10px] tracking-[0.25em] uppercase" style={{ color: MAROON }}>Active Fundraiser</span>
              </div>
              <h2 className="font-black uppercase leading-none mb-6"
                style={{ fontFamily: "var(--font-display)", color: BLACK, fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
                {fundraiser!.headline || "Support the Wolfpack"}
              </h2>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="font-black text-3xl" style={{ color: MAROON, fontFamily: "var(--font-display)" }}>{dollars(fundraiser!.raisedCents)}</div>
                  <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Raised</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{dollars(fundraiser!.goalCents)}</div>
                  <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Goal</div>
                </div>
              </div>

              <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: MAROON }} />
              </div>
              <div className="text-right text-xs font-black uppercase tracking-widest mt-2" style={{ color: MAROON }}>{pct}% funded</div>
            </div>
          </div>
        </section>
      )}

      {/* CLUBS */}
      <section id="clubs" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>Community Programs</div>
            <h2 className="font-black leading-none uppercase" style={{ fontFamily: "var(--font-display)", color: BLACK, fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>
              Clubs Associated<br />with EWA
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeClubs.map((club) => {
              const canPay = !!club.zelleUrl || club.paymentMethods.some((m) => m.type !== "zelle" && m.value);
              return (
                <div key={club.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all group">
                  <div className="w-10 h-1 rounded-full mb-5 transition-all group-hover:w-16" style={{ background: MAROON }} />
                  <h3 className="font-black uppercase text-xl leading-tight mb-3" style={{ fontFamily: "var(--font-display)", color: BLACK }}>
                    {club.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">{club.description}</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {canPay && (
                      <button
                        onClick={() => setPayingClub(club)}
                        className="flex items-center gap-1.5 text-white font-black text-xs px-4 py-2.5 rounded-lg uppercase tracking-widest transition-colors hover:opacity-90"
                        style={{ background: MAROON }}>
                        <QrCode size={12} /> Pay / Donate
                      </button>
                    )}
                    {club.websiteUrl && club.websiteUrl !== "#" && (
                      <a href={club.websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 border font-bold text-xs px-4 py-2.5 rounded-lg uppercase tracking-widest transition-colors hover:bg-gray-50"
                        style={{ borderColor: "rgba(0,0,0,0.15)", color: BLACK }}>
                        <Globe size={12} /> Website
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NEWS */}
      <section id="news" className="py-24" style={{ background: BLACK }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>Latest Updates</div>
              <h2 className="font-black text-white leading-none uppercase" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>
                News &<br />Announcements
              </h2>
            </div>
          </div>

          {news.length === 0 ? (
            <p className="text-white/40 text-sm">No announcements yet — check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {news.map((article) => (
                <article key={article.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:-translate-y-1 transition-all group">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {article.tag && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded" style={tagStyle(article.tag)}>
                        {article.tag}
                      </span>
                    )}
                    {article.publishedAt && (
                      <span className="text-white/40 text-xs flex items-center gap-1"><Calendar size={11} /> {formatDate(article.publishedAt)}</span>
                    )}
                  </div>
                  <h3 className="font-black text-white text-xl uppercase leading-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
                    {article.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed whitespace-pre-line">{article.body}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* EWA TEAM */}
      <section id="team" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>Volunteers &amp; Board</div>
            <h2 className="font-black leading-none uppercase" style={{ fontFamily: "var(--font-display)", color: BLACK, fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>
              The EWA Team
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {officers.map((member) => (
              <div key={member.id} className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ background: MAROON }}>
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm" style={{ color: BLACK }}>{member.name}</div>
                  {member.role && <div className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: MAROON }}>{member.role}</div>}
                  {member.email && <a href={`mailto:${member.email}`} className="text-muted-foreground text-xs hover:underline break-all">{member.email}</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESOURCES */}
      <section id="resources" className="py-24" style={{ background: BLACK }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>Helpful Links</div>
            <h2 className="font-black text-white leading-none uppercase" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>
              Quick Resources
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {resources.map((link) => (
              <a key={link.id} href={link.url || "#"} target={link.url?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/25 transition-all block">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: `${MAROON}25` }}>
                  <ExternalLink size={16} style={{ color: "#c25555" }} />
                </div>
                <div className="font-black text-white text-lg uppercase tracking-wide mb-2 group-hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--font-display)" }}>{link.title}</div>
                {link.description && <div className="text-white/45 text-sm leading-relaxed">{link.description}</div>}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10" style={{ background: BLACK }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <img src={LOGO_LOCKUP} alt="Eastlake Wolves" className="h-12 object-contain mb-4" style={{ filter: "brightness(0) invert(1)" }} />
              <p className="text-white/45 text-sm leading-relaxed max-w-xs">
                Supporting Eastlake High School athletics, arts &amp; sciences in Sammamish, WA.<br />
                <span className="text-white/25 text-xs">501(c)(3) · Tax ID 77-0616862</span>
              </p>
            </div>
            <div>
              <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: MAROON }}>Navigate</div>
              <ul className="space-y-2.5">
                {navLinks.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-white/45 hover:text-white transition-colors text-sm">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: MAROON }}>Quick Access</div>
              <ul className="space-y-2.5">
                {resources.slice(0, 4).map((l) => (
                  <li key={l.id}><a href={l.url || "#"} className="text-white/45 hover:text-white transition-colors text-sm">{l.title}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
            <span className="text-white/25 text-xs">© 2025 Eastlake Wolfpack Association. All rights reserved.</span>
            <span className="text-white/25 text-xs">Eastlake High School · Sammamish, WA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
