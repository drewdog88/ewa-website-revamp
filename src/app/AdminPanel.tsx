import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Save, Eye, ChevronLeft, X, Check, Globe,
  Zap, CreditCard, LogOut, Users, Newspaper, Link2, Heart, Building2, Upload,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "./api";
import type { Club, NewsItem, Officer, Resource, Fundraiser } from "./api";

const MAROON = "#8C1515";
const BLACK = "#111111";
const LOGO_WOLF = "/assets/ewa-wolf.jpg";

// Mirror of api/_lib/zelle.js buildZelleUrl, for the live QR preview.
function buildZelleUrl(name: string, token: string): string {
  const jsonStr = JSON.stringify({ name, action: "payment", token });
  const b64 = btoa(unescape(encodeURIComponent(jsonStr))).replace(/=+$/, "");
  return `https://enroll.zellepay.com/qr-codes?data=${b64}`;
}

const input = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2";
const ringStyle = { ["--tw-ring-color" as string]: MAROON };
const label = "block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1";

function SaveButton({ onClick, saved, busy }: { onClick: () => void; saved: boolean; busy: boolean }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="flex-1 flex items-center justify-center gap-2 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-colors hover:opacity-90 disabled:opacity-60"
      style={{ background: saved ? "#16a34a" : MAROON }}>
      {saved ? <><Check size={14} /> Saved!</> : busy ? "Saving…" : <><Save size={14} /> Save</>}
    </button>
  );
}

// ── Clubs ───────────────────────────────────────────────────────────────────

interface ClubForm {
  name: string; description: string; websiteUrl: string; active: boolean;
  zelleName: string; zelleToken: string; paymentLink: string;
}
const EMPTY_CLUB: ClubForm = { name: "", description: "", websiteUrl: "", active: true, zelleName: "", zelleToken: "", paymentLink: "" };

function ClubsManager() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ClubForm>(EMPTY_CLUB);
  const [qrTab, setQrTab] = useState<"zelle" | "payment">("zelle");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.adminClubs().then(setClubs).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const startEdit = (c: Club) => {
    const zm = c.paymentMethods.find((m) => m.type === "zelle");
    const lm = c.paymentMethods.find((m) => m.type !== "zelle" && m.value);
    setForm({
      name: c.name, description: c.description || "", websiteUrl: c.websiteUrl || "", active: c.active,
      zelleName: zm?.zelleName || c.name, zelleToken: zm?.displayToken || "", paymentLink: lm?.value || "",
    });
    setEditingId(c.id); setSaved(false); setError(null);
  };
  const startNew = () => { setForm(EMPTY_CLUB); setEditingId("new"); setSaved(false); setError(null); };
  const cancel = () => { setEditingId(null); setForm(EMPTY_CLUB); };

  const buildMethods = () => {
    const methods: Record<string, unknown>[] = [];
    if (form.zelleToken.trim())
      methods.push({ type: "zelle", label: "Zelle", name: form.zelleName.trim() || form.name.trim(), token: form.zelleToken.trim() });
    if (form.paymentLink.trim())
      methods.push({ type: "other", label: "Payment Page", value: form.paymentLink.trim() });
    return methods;
  };

  const save = async () => {
    if (!form.name.trim()) { setError("Club name is required"); return; }
    setBusy(true); setError(null);
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null, active: form.active, paymentMethods: buildMethods(),
    };
    try {
      const next = editingId === "new"
        ? await api.createClub(payload)
        : await api.updateClub(editingId as number, payload);
      setClubs(next); setSaved(true);
      setTimeout(() => { setSaved(false); setEditingId(null); }, 900);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Permanently delete this club and its payment methods? Consider hiding it instead.")) return;
    try { setClubs(await api.deleteClub(id)); if (editingId === id) cancel(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  };

  const toggle = async (c: Club) => {
    const zm = c.paymentMethods.find((m) => m.type === "zelle");
    const lm = c.paymentMethods.find((m) => m.type !== "zelle" && m.value);
    const methods: Record<string, unknown>[] = [];
    if (zm) methods.push({ type: "zelle", label: zm.label, name: zm.zelleName || c.name, token: zm.displayToken });
    if (lm) methods.push({ type: lm.type, label: lm.label, value: lm.value });
    try { setClubs(await api.updateClub(c.id, { name: c.name, description: c.description, websiteUrl: c.websiteUrl, active: !c.active, paymentMethods: methods })); }
    catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
  };

  const qrValue = qrTab === "zelle"
    ? (form.zelleToken.trim() ? buildZelleUrl(form.zelleName || form.name, form.zelleToken.trim()) : "")
    : form.paymentLink.trim();

  return (
    <>
      <SectionHeader
        title="Booster Clubs"
        subtitle="Add, edit, hide, or delete clubs — set the Zelle QR and payment link."
        action={<AddButton onClick={startNew} label="Add Club" />}
      />
      {error && <ErrorBanner msg={error} />}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          {clubs.map((c) => (
            <div key={c.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${editingId === c.id ? "ring-2" : "hover:border-gray-300"}`}
              style={editingId === c.id ? { borderColor: MAROON, ["--tw-ring-color" as string]: MAROON } : {}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-sm uppercase truncate" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{c.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {c.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-snug line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  {c.paymentMethods.some((m) => m.type === "zelle") && <span className="flex items-center gap-1"><Zap size={10} /> Zelle</span>}
                  {c.paymentMethods.some((m) => m.type !== "zelle" && m.value) && <span className="flex items-center gap-1"><CreditCard size={10} /> Payment link</span>}
                  {c.websiteUrl && <span className="flex items-center gap-1"><Globe size={10} /> Website</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggle(c)} title={c.active ? "Hide" : "Show"}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${c.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}>
                  <Eye size={14} />
                </button>
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"><Pencil size={14} /></button>
                <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {editingId !== null && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
            <FormHeader title={editingId === "new" ? "New Club" : "Edit Club"} onClose={cancel} />
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className={label}>Club Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Football Boosters" className={input} style={ringStyle} />
              </div>
              <div>
                <label className={label}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  placeholder="What this club does and what donations support." className={`${input} resize-none`} style={ringStyle} />
              </div>
              <div>
                <label className={label}><span className="flex items-center gap-1"><Zap size={11} /> Zelle recipient name</span></label>
                <input value={form.zelleName} onChange={(e) => setForm({ ...form, zelleName: e.target.value })} placeholder="Name shown in Zelle app" className={input} style={ringStyle} />
              </div>
              <div>
                <label className={label}><span className="flex items-center gap-1"><Zap size={11} /> Zelle email or phone</span></label>
                <input value={form.zelleToken} onChange={(e) => setForm({ ...form, zelleToken: e.target.value })} placeholder="treasurer@eastlakewolfpack.org" className={`${input} font-mono`} style={ringStyle} />
              </div>
              <div>
                <label className={label}><span className="flex items-center gap-1"><CreditCard size={11} /> Payment link (Stripe / other)</span></label>
                <input value={form.paymentLink} onChange={(e) => setForm({ ...form, paymentLink: e.target.value })} placeholder="https://buy.stripe.com/..." className={`${input} font-mono`} style={ringStyle} />
              </div>
              <div>
                <label className={label}><span className="flex items-center gap-1"><Globe size={11} /> Club website (optional)</span></label>
                <input value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..." className={`${input} font-mono`} style={ringStyle} />
              </div>
              <ActiveToggle active={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Show on website" hint="Hidden clubs stay in the system but don't appear publicly." />

              {(form.zelleToken || form.paymentLink) && (
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">QR Preview</span>
                    <div className="flex">
                      {[{ key: "zelle" as const, label: "Zelle" }, { key: "payment" as const, label: "Payment" }].map((t) => (
                        <button key={t.key} onClick={() => setQrTab(t.key)}
                          className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest transition-colors ${qrTab === t.key ? "text-white" : "text-gray-400 hover:text-gray-600"}`}
                          style={qrTab === t.key ? { background: MAROON } : {}}>{t.label}</button>
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
                    <div className="text-center text-gray-300 text-xs py-4">Enter a {qrTab === "zelle" ? "Zelle email/phone" : "payment link"} to preview</div>
                  )}
                </div>
              )}
            </div>
            <FormFooter onSave={save} onCancel={cancel} saved={saved} busy={busy} />
          </div>
        )}
      </div>
    </>
  );
}

// ── News ────────────────────────────────────────────────────────────────────

interface NewsForm { title: string; body: string; tag: string; isPublished: boolean; }
const EMPTY_NEWS: NewsForm = { title: "", body: "", tag: "Announcements", isPublished: true };

function NewsManager() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<NewsForm>(EMPTY_NEWS);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.adminNews().then(setItems).catch((e) => setError(e.message)); }, []);

  const startEdit = (n: NewsItem) => {
    setForm({ title: n.title, body: n.body || "", tag: n.tag || "", isPublished: n.isPublished ?? true });
    setEditingId(n.id); setSaved(false); setError(null);
  };
  const startNew = () => { setForm(EMPTY_NEWS); setEditingId("new"); setSaved(false); setError(null); };
  const cancel = () => { setEditingId(null); setForm(EMPTY_NEWS); };

  const save = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setBusy(true); setError(null);
    const payload = { title: form.title.trim(), body: form.body.trim() || null, tag: form.tag.trim() || null, isPublished: form.isPublished };
    try {
      const next = editingId === "new" ? await api.createNews(payload) : await api.updateNews(editingId as number, payload);
      setItems(next); setSaved(true);
      setTimeout(() => { setSaved(false); setEditingId(null); }, 900);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this news post?")) return;
    try { setItems(await api.deleteNews(id)); if (editingId === id) cancel(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <>
      <SectionHeader title="News & Announcements" subtitle="Post updates that appear on the public News section." action={<AddButton onClick={startNew} label="Add Post" />} />
      {error && <ErrorBanner msg={error} />}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${editingId === n.id ? "ring-2" : "hover:border-gray-300"}`}
              style={editingId === n.id ? { borderColor: MAROON, ["--tw-ring-color" as string]: MAROON } : {}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-black text-sm uppercase truncate" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{n.title}</span>
                  {n.tag && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 text-gray-500">{n.tag}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${n.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{n.isPublished ? "Published" : "Draft"}</span>
                </div>
                <p className="text-gray-400 text-xs leading-snug line-clamp-2">{n.body}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(n)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"><Pencil size={14} /></button>
                <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {editingId !== null && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
            <FormHeader title={editingId === "new" ? "New Post" : "Edit Post"} onClose={cancel} />
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div><label className={label}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} style={ringStyle} /></div>
              <div><label className={label}>Body</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} className={`${input} resize-none`} style={ringStyle} /></div>
              <div>
                <label className={label}>Tag</label>
                <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className={input} style={ringStyle}>
                  <option>Announcements</option><option>Athletics</option><option>Fundraising</option>
                </select>
              </div>
              <ActiveToggle active={form.isPublished} onChange={(v) => setForm({ ...form, isPublished: v })} label="Published" hint="Drafts are hidden from the public site." />
            </div>
            <FormFooter onSave={save} onCancel={cancel} saved={saved} busy={busy} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Team ────────────────────────────────────────────────────────────────────

interface OfficerForm { name: string; role: string; email: string; }
const EMPTY_OFFICER: OfficerForm = { name: "", role: "", email: "" };

function TeamManager() {
  const [items, setItems] = useState<Officer[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<OfficerForm>(EMPTY_OFFICER);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.adminOfficers().then(setItems).catch((e) => setError(e.message)); }, []);

  const startEdit = (o: Officer) => { setForm({ name: o.name, role: o.role || "", email: o.email || "" }); setEditingId(o.id); setSaved(false); setError(null); };
  const startNew = () => { setForm(EMPTY_OFFICER); setEditingId("new"); setSaved(false); setError(null); };
  const cancel = () => { setEditingId(null); setForm(EMPTY_OFFICER); };

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setBusy(true); setError(null);
    const payload = { name: form.name.trim(), role: form.role.trim() || null, email: form.email.trim() || null };
    try {
      const next = editingId === "new" ? await api.createOfficer(payload) : await api.updateOfficer(editingId as number, payload);
      setItems(next); setSaved(true);
      setTimeout(() => { setSaved(false); setEditingId(null); }, 900);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Remove this team member?")) return;
    try { setItems(await api.deleteOfficer(id)); if (editingId === id) cancel(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <>
      <SectionHeader title="EWA Team" subtitle="Board members and volunteers shown on the public site." action={<AddButton onClick={startNew} label="Add Member" />} />
      {error && <ErrorBanner msg={error} />}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${editingId === o.id ? "ring-2" : "hover:border-gray-300"}`}
              style={editingId === o.id ? { borderColor: MAROON, ["--tw-ring-color" as string]: MAROON } : {}}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0" style={{ background: MAROON }}>
                {o.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: BLACK }}>{o.name}</div>
                <div className="text-gray-400 text-xs">{o.role}{o.role && o.email ? " · " : ""}{o.email}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"><Pencil size={14} /></button>
                <button onClick={() => remove(o.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {editingId !== null && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
            <FormHeader title={editingId === "new" ? "New Member" : "Edit Member"} onClose={cancel} />
            <div className="px-6 py-5 space-y-4">
              <div><label className={label}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} style={ringStyle} /></div>
              <div><label className={label}>Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. President" className={input} style={ringStyle} /></div>
              <div><label className={label}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@eastlakewolfpack.org" className={`${input} font-mono`} style={ringStyle} /></div>
            </div>
            <FormFooter onSave={save} onCancel={cancel} saved={saved} busy={busy} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────

interface ResourceForm { title: string; description: string; url: string; isActive: boolean; artifactId: number | null; fileName: string; }
const EMPTY_RESOURCE: ResourceForm = { title: "", description: "", url: "", isActive: true, artifactId: null, fileName: "" };

function ResourcesManager() {
  const [items, setItems] = useState<Resource[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ResourceForm>(EMPTY_RESOURCE);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.adminResources().then(setItems).catch((e) => setError(e.message)); }, []);

  const startEdit = (r: Resource) => {
    setForm({ title: r.title, description: r.description || "", url: r.url || "", isActive: r.isActive ?? true, artifactId: r.artifactId ?? null, fileName: r.artifactId ? "Attached file" : "" });
    setEditingId(r.id); setSaved(false); setError(null);
  };
  const startNew = () => { setForm(EMPTY_RESOURCE); setEditingId("new"); setSaved(false); setError(null); };
  const cancel = () => { setEditingId(null); setForm(EMPTY_RESOURCE); };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const art = await api.uploadArtifact(file.name, file.type || "application/octet-stream", dataBase64);
      // An attached file takes the place of an external URL.
      setForm((f) => ({ ...f, artifactId: art.id, fileName: file.name, url: "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setBusy(true); setError(null);
    const payload = { title: form.title.trim(), description: form.description.trim() || null, url: form.url.trim() || null, artifactId: form.artifactId, isActive: form.isActive };
    try {
      const next = editingId === "new" ? await api.createResource(payload) : await api.updateResource(editingId as number, payload);
      setItems(next); setSaved(true);
      setTimeout(() => { setSaved(false); setEditingId(null); }, 900);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this resource link?")) return;
    try { setItems(await api.deleteResource(id)); if (editingId === id) cancel(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <>
      <SectionHeader title="Quick Resources" subtitle="Helpful links shown in the Resources section and footer." action={<AddButton onClick={startNew} label="Add Link" />} />
      {error && <ErrorBanner msg={error} />}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${editingId === r.id ? "ring-2" : "hover:border-gray-300"}`}
              style={editingId === r.id ? { borderColor: MAROON, ["--tw-ring-color" as string]: MAROON } : {}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-sm uppercase truncate" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{r.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{r.isActive ? "Active" : "Hidden"}</span>
                </div>
                <p className="text-gray-400 text-xs leading-snug line-clamp-1">{r.description}</p>
                {r.url && <p className="text-gray-300 text-xs font-mono truncate mt-0.5">{r.url}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"><Pencil size={14} /></button>
                <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {editingId !== null && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
            <FormHeader title={editingId === "new" ? "New Link" : "Edit Link"} onClose={cancel} />
            <div className="px-6 py-5 space-y-4">
              <div><label className={label}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} style={ringStyle} /></div>
              <div><label className={label}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${input} resize-none`} style={ringStyle} /></div>
              <div><label className={label}>Link to a URL</label><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value, artifactId: e.target.value.trim() ? null : form.artifactId })} placeholder="https://..." className={`${input} font-mono`} style={ringStyle} /></div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">or attach a file</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div>
                <label className={label}><span className="flex items-center gap-1"><Upload size={11} /> Upload a PDF or document</span></label>
                <input type="file" onChange={(e) => onFile(e.target.files?.[0])} disabled={uploading}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-white file:cursor-pointer disabled:opacity-50"
                  style={{ ["--file-bg" as string]: MAROON }} />
                <style>{`input[type=file]::file-selector-button{background:${MAROON}}`}</style>
                {uploading && <div className="text-xs text-gray-400 mt-2">Uploading…</div>}
                {form.artifactId && !uploading && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <Check size={13} /> {form.fileName || "File attached"} — will be served on the site
                    <button onClick={() => setForm({ ...form, artifactId: null, fileName: "" })} className="ml-auto text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                )}
              </div>

              <ActiveToggle active={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Show on website" hint="Hidden links stay saved but don't appear publicly." />
            </div>
            <FormFooter onSave={save} onCancel={cancel} saved={saved} busy={busy} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Fundraiser ────────────────────────────────────────────────────────────────

function FundraiserManager() {
  const [f, setF] = useState<Fundraiser | null>(null);
  const [headline, setHeadline] = useState("");
  const [goal, setGoal] = useState("");
  const [raised, setRaised] = useState("");
  const [active, setActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminFundraiser().then((data) => {
      setF(data);
      setHeadline(data.headline || "");
      setGoal(data.goalCents ? String(data.goalCents / 100) : "");
      setRaised(data.raisedCents ? String(data.raisedCents / 100) : "");
      setActive(data.isActive ?? false);
    }).catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    setBusy(true); setError(null);
    const payload = {
      headline: headline.trim() || null,
      goalCents: Math.round((parseFloat(goal) || 0) * 100),
      raisedCents: Math.round((parseFloat(raised) || 0) * 100),
      isActive: active,
    };
    try {
      const next = await api.updateFundraiser(payload);
      setF(next); setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  if (!f && !error) return <div className="text-gray-400 text-sm">Loading…</div>;

  const goalC = Math.round((parseFloat(goal) || 0) * 100);
  const raisedC = Math.round((parseFloat(raised) || 0) * 100);
  const pct = goalC > 0 ? Math.min(100, Math.round((raisedC / goalC) * 100)) : 0;

  return (
    <>
      <SectionHeader title="Fundraiser" subtitle="The progress band shown near the top of the public site." action={null} />
      {error && <ErrorBanner msg={error} />}
      <div className="max-w-xl bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div><label className={label}>Headline</label><input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Weight Room Equipment Fund" className={input} style={ringStyle} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={label}>Goal ($)</label><input value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" placeholder="25000" className={`${input} font-mono`} style={ringStyle} /></div>
          <div><label className={label}>Raised ($)</label><input value={raised} onChange={(e) => setRaised(e.target.value)} inputMode="decimal" placeholder="15000" className={`${input} font-mono`} style={ringStyle} /></div>
        </div>

        <div>
          <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: MAROON }} />
          </div>
          <div className="text-right text-xs font-black uppercase tracking-widest mt-1.5" style={{ color: MAROON }}>{pct}% funded</div>
        </div>

        <ActiveToggle active={active} onChange={setActive} label="Show fundraiser band" hint="When off, the band is hidden from the public site." />

        <div className="flex gap-3 pt-2">
          <SaveButton onClick={save} saved={saved} busy={busy} />
        </div>
      </div>
    </>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="font-black text-2xl uppercase tracking-wide" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-widest transition-colors hover:opacity-90" style={{ background: MAROON }}>
      <Plus size={15} /> {label}
    </button>
  );
}

function FormHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: `${MAROON}08` }}>
      <span className="font-black text-sm uppercase tracking-widest" style={{ color: MAROON, fontFamily: "var(--font-display)" }}>{title}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
    </div>
  );
}

function FormFooter({ onSave, onCancel, saved, busy }: { onSave: () => void; onCancel: () => void; saved: boolean; busy: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
      <SaveButton onClick={onSave} saved={saved} busy={busy} />
      <button onClick={onCancel} className="px-5 py-3 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-gray-300 transition-colors">Cancel</button>
    </div>
  );
}

function ActiveToggle({ active, onChange, label: text, hint }: { active: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${active ? "" : "bg-gray-200"}`} style={active ? { background: MAROON } : {}}>
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <div>
        <div className="text-sm font-bold" style={{ color: BLACK }}>{text}</div>
        <div className="text-gray-400 text-xs">{hint}</div>
      </div>
      <input type="checkbox" className="sr-only" checked={active} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{msg}</div>;
}

// ── Panel shell ───────────────────────────────────────────────────────────────

type Tab = "clubs" | "news" | "team" | "resources" | "fundraiser";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "clubs", label: "Clubs", icon: <Building2 size={15} /> },
  { key: "news", label: "News", icon: <Newspaper size={15} /> },
  { key: "team", label: "Team", icon: <Users size={15} /> },
  { key: "resources", label: "Resources", icon: <Link2 size={15} /> },
  { key: "fundraiser", label: "Fundraiser", icon: <Heart size={15} /> },
];

export function AdminPanel({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("clubs");

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-bold">
              <ChevronLeft size={16} /> View Site
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <img src={LOGO_WOLF} alt="" className="h-7 w-7 rounded-full object-cover" />
              <span className="font-black text-sm uppercase tracking-widest" style={{ color: BLACK }}>EWA Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs hidden sm:inline">Signed in as <span className="font-bold text-gray-600">{username}</span></span>
            <button onClick={logout} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest border border-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              style={tab === t.key ? { color: MAROON, borderColor: MAROON } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {tab === "clubs" && <ClubsManager />}
        {tab === "news" && <NewsManager />}
        {tab === "team" && <TeamManager />}
        {tab === "resources" && <ResourcesManager />}
        {tab === "fundraiser" && <FundraiserManager />}
      </div>
    </div>
  );
}
