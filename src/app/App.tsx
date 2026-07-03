import { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowRight, Calendar, QrCode, CreditCard,
  ExternalLink, Plus, Pencil, Trash2, Save, Eye, ChevronLeft,
  Globe, Zap, Check
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAROON = "#8C1515";
const BLACK  = "#111111";
const LOGO_LOCKUP = "/assets/eastlake_wolves_lockup_1.png";
const LOGO_WOLF   = "/assets/ewa-wolf.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Club {
  id: number;
  name: string;
  description: string;
  zelleContact: string;
  paymentLink: string;
  websiteUrl: string;
  active: boolean;
}

type AppView = "site" | "admin";

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_CLUBS: Club[] = [
  { id: 1, name: "Football Boosters",         description: "Supporting Eastlake Wolves Football from JV to Varsity — equipment, travel, and team events.",                    zelleContact: "football@eastlakewolfpack.org",   paymentLink: "https://eastlakewolfpack.org/payment?club=football",   websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 2, name: "Water Polo Boosters",        description: "Backing the Wolves Water Polo program with gear, coaching resources, and competition travel support.",              zelleContact: "waterpolo@eastlakewolfpack.org",  paymentLink: "https://eastlakewolfpack.org/payment?club=waterpolo",  websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 3, name: "Band & Color Guard Boosters",description: "Fueling Eastlake's award-winning band and color guard with instruments, uniforms, and competition support.",        zelleContact: "band@eastlakewolfpack.org",       paymentLink: "https://eastlakewolfpack.org/payment?club=band",       websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 4, name: "Wrestling Boosters",         description: "Backing the Wolves wrestling squad with gear, travel funding, and tournament support all season long.",              zelleContact: "wrestling@eastlakewolfpack.org",  paymentLink: "https://eastlakewolfpack.org/payment?club=wrestling",  websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 5, name: "Baseball Boosters",          description: "Supporting Wolves Baseball with equipment, field maintenance funding, and team activities throughout the season.",   zelleContact: "baseball@eastlakewolfpack.org",   paymentLink: "https://eastlakewolfpack.org/payment?club=baseball",   websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 6, name: "Volleyball Boosters",        description: "Cheering on the Wolves volleyball programs with uniforms, travel funding, and team development opportunities.",     zelleContact: "volleyball@eastlakewolfpack.org", paymentLink: "https://eastlakewolfpack.org/payment?club=volleyball", websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 7, name: "Basketball Boosters",        description: "Supporting Wolves Basketball at every level — tournaments, uniforms, and the training resources players need.",      zelleContact: "basketball@eastlakewolfpack.org", paymentLink: "https://eastlakewolfpack.org/payment?club=basketball", websiteUrl: "https://eastlakewolfpack.org", active: true },
  { id: 8, name: "Soccer Boosters",            description: "Backing the Wolves Soccer programs with equipment, travel funding, and community events for families.",              zelleContact: "soccer@eastlakewolfpack.org",     paymentLink: "https://eastlakewolfpack.org/payment?club=soccer",     websiteUrl: "https://eastlakewolfpack.org", active: true },
];

const SEED_NEWS = [
  { id: 1, date: "June 28, 2025", title: "Weight Room Fund Reaches $15,000 Milestone",      excerpt: "Thanks to generous community donations the Wolfpack weight room fund has hit a major milestone. New equipment installation is scheduled for August.", tag: "Fundraising"    },
  { id: 2, date: "June 15, 2025", title: "2025–26 Booster Registration Now Open",            excerpt: "All EWA-affiliated booster clubs are accepting memberships for the new school year. Join and help support our student athletes.",                      tag: "Announcements"  },
  { id: 3, date: "May 30, 2025",  title: "Wolves Water Polo Takes CIF Championship",         excerpt: "Congratulations to the Eastlake Water Polo team on their CIF championship win. EWA is proud to support these incredible student athletes.",            tag: "Athletics"      },
];

const EWA_TEAM = [
  { name: "Sarah Mitchell",   role: "President",         email: "president@eastlakewolfpack.org"  },
  { name: "James Thornton",   role: "Vice President",    email: "vp@eastlakewolfpack.org"         },
  { name: "Maria Nguyen",     role: "Treasurer",         email: "treasurer@eastlakewolfpack.org"  },
  { name: "David Kowalski",   role: "Secretary",         email: "secretary@eastlakewolfpack.org"  },
  { name: "Lisa Pham",        role: "Communications",    email: "comms@eastlakewolfpack.org"      },
  { name: "Robert Chen",      role: "At-Large Member",   email: "atlarge@eastlakewolfpack.org"    },
];

// ── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({ club, onClose }: { club: Club; onClose: () => void }) {
  const [tab, setTab] = useState<"zelle" | "link">("zelle");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const qrValue = tab === "zelle" ? club.zelleContact : club.paymentLink;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ background: BLACK }}>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: MAROON }}>Pay Fees / Donate</div>
            <div className="text-white font-black text-xl uppercase leading-tight" style={{ fontFamily: "var(--font-display)" }}>{club.name}</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors mt-1 shrink-0"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-200">
          {[
            { key: "zelle" as const, icon: <QrCode size={13} />, label: "Zelle QR" },
            { key: "link"  as const, icon: <CreditCard size={13} />, label: "Payment Link" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${tab === t.key ? "border-b-2" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              style={tab === t.key ? { color: MAROON, borderColor: MAROON } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-8 flex flex-col items-center">
          <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-inner mb-5">
            <QRCodeSVG value={qrValue || "https://eastlakewolfpack.org"} size={200} level="M" fgColor={BLACK} bgColor="#ffffff" />
          </div>

          {tab === "zelle" ? (
            <>
              <p className="text-gray-400 text-xs text-center mb-4">Scan with your phone to send Zelle payment</p>
              <div className="w-full bg-gray-50 rounded-lg px-4 py-3 text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Zelle To</div>
                <div className="font-bold text-sm break-all" style={{ color: BLACK }}>{club.zelleContact || "—"}</div>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-xs text-center mb-4">Scan to open the payment page</p>
              <a
                href={club.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-white font-black text-xs py-3 rounded-lg uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-colors"
                style={{ background: MAROON }}
              >
                Open Payment Page <ExternalLink size={13} />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Public Site ───────────────────────────────────────────────────────────────

function PublicSite({ clubs, onGoAdmin }: { clubs: Club[]; onGoAdmin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [payingClub, setPayingClub] = useState<Club | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const activeClubs = clubs.filter(c => c.active);

  const navLinks = [
    { label: "Home",      href: "#home"      },
    { label: "Our Clubs", href: "#clubs"     },
    { label: "News",      href: "#news"      },
    { label: "EWA Team",  href: "#team"      },
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
            {navLinks.map(link => (
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
            {navLinks.map(link => (
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

          {/* Wolf logo in hero */}
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
          ].map(stat => (
            <div key={stat.label} className="text-center px-4 py-1">
              <div className="text-white font-black text-2xl md:text-3xl leading-none" style={{ fontFamily: "var(--font-display)" }}>{stat.value}</div>
              <div className="text-white/60 text-[10px] font-bold tracking-[0.18em] uppercase mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CLUBS — front and center, open cards */}
      <section id="clubs" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: MAROON }}>Community Programs</div>
            <h2 className="font-black leading-none uppercase" style={{ fontFamily: "var(--font-display)", color: BLACK, fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>
              Clubs Associated<br />with EWA
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeClubs.map(club => (
              <div key={club.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="w-10 h-1 rounded-full mb-5 transition-all group-hover:w-16" style={{ background: MAROON }} />
                <h3 className="font-black uppercase text-xl leading-tight mb-3" style={{ fontFamily: "var(--font-display)", color: BLACK }}>
                  {club.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">{club.description}</p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <button
                    onClick={() => setPayingClub(club)}
                    className="flex items-center gap-1.5 text-white font-black text-xs px-4 py-2.5 rounded-lg uppercase tracking-widest transition-colors hover:opacity-90"
                    style={{ background: MAROON }}>
                    <QrCode size={12} /> Pay / Donate
                  </button>
                  {club.websiteUrl && club.websiteUrl !== "#" && (
                    <a href={club.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 border font-bold text-xs px-4 py-2.5 rounded-lg uppercase tracking-widest transition-colors hover:bg-gray-50"
                      style={{ borderColor: "rgba(0,0,0,0.15)", color: BLACK }}>
                      <Globe size={12} /> Website
                    </a>
                  )}
                </div>
              </div>
            ))}
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
            <a href="#" className="font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:underline" style={{ color: MAROON }}>
              All News <ArrowRight size={13} />
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SEED_NEWS.map(article => (
              <article key={article.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded"
                    style={
                      article.tag === "Athletics"    ? { background: `${MAROON}25`, color: "#c25555" } :
                      article.tag === "Fundraising"  ? { background: "rgba(16,185,129,0.15)", color: "#34d399" } :
                                                       { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }
                    }>
                    {article.tag}
                  </span>
                  <span className="text-white/40 text-xs flex items-center gap-1"><Calendar size={11} /> {article.date}</span>
                </div>
                <h3 className="font-black text-white text-xl uppercase leading-tight mb-3 transition-colors group-hover:text-gray-200"
                  style={{ fontFamily: "var(--font-display)" }}>
                  {article.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">{article.excerpt}</p>
                <div className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-3 transition-all" style={{ color: MAROON }}>
                  Read More <ArrowRight size={13} />
                </div>
              </article>
            ))}
          </div>
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
            {EWA_TEAM.map(member => (
              <div key={member.name} className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ background: MAROON }}>
                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: BLACK }}>{member.name}</div>
                  <div className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: MAROON }}>{member.role}</div>
                  <a href={`mailto:${member.email}`} className="text-muted-foreground text-xs hover:underline break-all">{member.email}</a>
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
            {[
              { title: "Athletics Calendar",  desc: "Full Eastlake Wolves schedule on ArbiterLive.",             href: "https://www.arbiterlive.com",         emoji: "📅" },
              { title: "Booster Resources",   desc: "Forms, guidelines, and documents for booster leaders.",     href: "#",                                   emoji: "📋" },
              { title: "Weight Room Fund",    desc: "Donate to the Wolfpack weight room equipment fund.",        href: "#",                                   emoji: "🏋️" },
              { title: "EWA Team",            desc: "Meet the volunteers and board members behind EWA.",         href: "#team",                               emoji: "🐺" },
              { title: "LWSD District Site",  desc: "Lake Washington School District official website.",         href: "https://www.lwsd.org",                emoji: "🏫" },
              { title: "Contact EWA",         desc: "Get in touch with the Eastlake Wolfpack Association.",     href: "mailto:info@eastlakewolfpack.org",    emoji: "✉️" },
            ].map(link => (
              <a key={link.title} href={link.href} className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/25 transition-all block">
                <div className="text-3xl mb-4 select-none">{link.emoji}</div>
                <div className="font-black text-white text-lg uppercase tracking-wide mb-2 group-hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--font-display)" }}>{link.title}</div>
                <div className="text-white/45 text-sm leading-relaxed">{link.desc}</div>
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
                {[...navLinks, { label: "Admin", href: "#" }].map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-white/45 hover:text-white transition-colors text-sm">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-black text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: MAROON }}>Quick Access</div>
              <ul className="space-y-2.5">
                {[
                  { label: "Athletics Calendar", href: "https://www.arbiterlive.com" },
                  { label: "Booster Resources",  href: "#" },
                  { label: "Weight Room Fund",   href: "#" },
                  { label: "LWSD District",      href: "https://www.lwsd.org" },
                ].map(l => (
                  <li key={l.label}><a href={l.href} className="text-white/45 hover:text-white transition-colors text-sm">{l.label}</a></li>
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

// ── Admin Panel ───────────────────────────────────────────────────────────────

const EMPTY_CLUB: Omit<Club, "id"> = {
  name: "", description: "", zelleContact: "", paymentLink: "", websiteUrl: "", active: true,
};

function AdminPanel({ clubs, setClubs, onBack }: {
  clubs: Club[];
  setClubs: (clubs: Club[]) => void;
  onBack: () => void;
}) {
  const [editingId, setEditingId]   = useState<number | "new" | null>(null);
  const [form, setForm]             = useState<Omit<Club, "id">>(EMPTY_CLUB);
  const [qrPreviewTab, setQrPreviewTab] = useState<"zelle" | "payment">("zelle");
  const [saved, setSaved]           = useState(false);
  const nextId                      = useRef(Math.max(...clubs.map(c => c.id)) + 1);

  const startEdit = (club: Club) => {
    setForm({ name: club.name, description: club.description, zelleContact: club.zelleContact, paymentLink: club.paymentLink, websiteUrl: club.websiteUrl, active: club.active });
    setEditingId(club.id);
    setSaved(false);
  };

  const startNew = () => {
    setForm(EMPTY_CLUB);
    setEditingId("new");
    setSaved(false);
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_CLUB); };

  const saveEdit = () => {
    if (editingId === "new") {
      setClubs([...clubs, { ...form, id: nextId.current++ }]);
    } else {
      setClubs(clubs.map(c => c.id === editingId ? { ...c, ...form } : c));
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditingId(null); }, 1000);
  };

  const deleteClub = (id: number) => {
    if (!window.confirm("Delete this booster club?")) return;
    setClubs(clubs.filter(c => c.id !== id));
  };

  const toggleActive = (id: number) => {
    setClubs(clubs.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const qrValue = qrPreviewTab === "zelle" ? form.zelleContact : form.paymentLink;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>
      {/* Admin header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-bold">
              <ChevronLeft size={16} /> Back to Site
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <img src={LOGO_WOLF} alt="" className="h-7 w-7 rounded-full object-cover" />
              <span className="font-black text-sm uppercase tracking-widest" style={{ color: BLACK }}>EWA Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest border border-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors">
              <Eye size={13} /> Preview Site
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-black text-2xl uppercase tracking-wide" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>Booster Club Manager</h1>
            <p className="text-gray-500 text-sm mt-1">Add, edit, and manage clubs — update payment links and Zelle QR codes.</p>
          </div>
          <button onClick={startNew}
            className="flex items-center gap-2 text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-widest transition-colors hover:opacity-90"
            style={{ background: MAROON }}>
            <Plus size={15} /> Add Club
          </button>
        </div>

        {/* Club list + edit panel side by side */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* Club list */}
          <div className="space-y-3">
            {clubs.map(club => (
              <div key={club.id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${editingId === club.id ? "ring-2" : "hover:border-gray-300"}`}
                style={editingId === club.id ? { ringColor: MAROON, borderColor: MAROON } : {}}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm uppercase truncate" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{club.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${club.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {club.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-snug line-clamp-2">{club.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {club.zelleContact && <span className="flex items-center gap-1"><Zap size={10} /> Zelle</span>}
                    {club.paymentLink  && <span className="flex items-center gap-1"><CreditCard size={10} /> Payment link</span>}
                    {club.websiteUrl   && <span className="flex items-center gap-1"><Globe size={10} /> Website</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(club.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${club.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                    title={club.active ? "Hide club" : "Show club"}>
                    <Eye size={14} />
                  </button>
                  <button onClick={() => startEdit(club)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteClub(club.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit form */}
          {editingId !== null && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: `${MAROON}08` }}>
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: MAROON, fontFamily: "var(--font-display)" }}>
                  {editingId === "new" ? "New Club" : "Edit Club"}
                </span>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Club Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Football Boosters"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: MAROON }} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Description *</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Briefly describe this club's purpose and what donations support."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" />
                </div>

                {/* Zelle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><Zap size={11} /> Zelle Contact (email or phone)</span>
                  </label>
                  <input value={form.zelleContact} onChange={e => setForm({ ...form, zelleContact: e.target.value })}
                    placeholder="treasurer@eastlakewolfpack.org"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono" />
                </div>

                {/* Payment link */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><CreditCard size={11} /> Payment Link (Stripe / other)</span>
                  </label>
                  <input value={form.paymentLink} onChange={e => setForm({ ...form, paymentLink: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono" />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><Globe size={11} /> Club Website URL (optional)</span>
                  </label>
                  <input value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono" />
                </div>

                {/* Active toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.active ? "" : "bg-gray-200"}`}
                    style={form.active ? { background: MAROON } : {}}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: BLACK }}>Show on website</div>
                    <div className="text-gray-400 text-xs">Toggle to hide this club from the public site</div>
                  </div>
                  <input type="checkbox" className="sr-only" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                </label>

                {/* Live QR preview */}
                {(form.zelleContact || form.paymentLink) && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-gray-500">QR Preview</span>
                      <div className="flex">
                        {[
                          { key: "zelle" as const,   label: "Zelle"   },
                          { key: "payment" as const, label: "Payment" },
                        ].map(t => (
                          <button key={t.key} onClick={() => setQrPreviewTab(t.key)}
                            className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest transition-colors ${qrPreviewTab === t.key ? "text-white" : "text-gray-400 hover:text-gray-600"}`}
                            style={qrPreviewTab === t.key ? { background: MAROON } : {}}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {qrValue ? (
                      <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          <QRCodeSVG value={qrValue} size={140} level="M" fgColor={BLACK} bgColor="#ffffff" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-300 text-xs py-4">Enter a {qrPreviewTab === "zelle" ? "Zelle contact" : "payment link"} above to preview</div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-2 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-colors hover:opacity-90"
                  style={{ background: saved ? "#16a34a" : MAROON }}>
                  {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
                </button>
                <button onClick={cancelEdit} className="px-5 py-3 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [clubs, setClubs] = useState<Club[]>(SEED_CLUBS);
  const [view, setView]   = useState<AppView>("site");

  return view === "admin"
    ? <AdminPanel clubs={clubs} setClubs={setClubs} onBack={() => setView("site")} />
    : <PublicSite clubs={clubs} onGoAdmin={() => setView("admin")} />;
}
