// Typed client for the EWA serverless API. All admin calls rely on the
// HTTP-only session cookie (credentials: "include").

export interface PaymentMethod {
  id?: number;
  type: "zelle" | "stripe" | "paypal" | "venmo" | "other";
  label?: string | null;
  value?: string | null;
  displayToken?: string | null;
  qrSettings?: unknown;
  zelleName?: string | null;
  // admin-form-only fields (used when building a Zelle URL server-side):
  name?: string;
  token?: string;
  isActive?: boolean;
}

export interface Club {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  active: boolean;
  sortOrder?: number;
  paymentMethods: PaymentMethod[];
  zelleUrl?: string | null;
  zelleToken?: string | null;
  paymentLink?: string | null;
  paymentLabel?: string | null;
}

export interface NewsItem {
  id: number;
  title: string;
  body: string | null;
  tag: string | null;
  isPublished?: boolean;
  publishedAt: string | null;
}

export interface Officer {
  id: number;
  name: string;
  role: string | null;
  email: string | null;
}

export interface Resource {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  artifactId?: number | null;
  isActive?: boolean;
}

export interface UploadedArtifact {
  id: number;
  filename: string;
  mimeType: string;
  url: string;
}

export interface Fundraiser {
  id: number;
  headline: string | null;
  goalCents: number;
  raisedCents: number;
  isActive?: boolean;
}

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    ...opts,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const body = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

export const api = {
  // ---- public reads ----
  clubs: () => req<Club[]>("/api/clubs"),
  news: () => req<NewsItem[]>("/api/news"),
  officers: () => req<Officer[]>("/api/officers"),
  resources: () => req<Resource[]>("/api/resources"),
  fundraiser: () => req<Fundraiser | null>("/api/fundraiser"),

  // ---- auth ----
  me: () => req<{ username: string }>("/api/auth/me"),
  login: (username: string, password: string) =>
    req<{ ok: true; username: string }>("/api/auth/login", { method: "POST", ...body({ username, password }) }),
  logout: () => req<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  // ---- admin: clubs ----
  adminClubs: () => req<Club[]>("/api/admin/clubs"),
  createClub: (c: Partial<Club>) => req<Club[]>("/api/admin/clubs", { method: "POST", ...body(c) }),
  updateClub: (id: number, c: Partial<Club>) => req<Club[]>(`/api/admin/clubs?id=${id}`, { method: "PUT", ...body(c) }),
  deleteClub: (id: number) => req<Club[]>(`/api/admin/clubs?id=${id}`, { method: "DELETE" }),
  reorderClubs: (order: number[]) => req<Club[]>("/api/admin/clubs?action=reorder", { method: "PATCH", ...body({ order }) }),

  // ---- admin: news ----
  adminNews: () => req<NewsItem[]>("/api/admin/news"),
  createNews: (n: Partial<NewsItem>) => req<NewsItem[]>("/api/admin/news", { method: "POST", ...body(n) }),
  updateNews: (id: number, n: Partial<NewsItem>) => req<NewsItem[]>(`/api/admin/news?id=${id}`, { method: "PUT", ...body(n) }),
  deleteNews: (id: number) => req<NewsItem[]>(`/api/admin/news?id=${id}`, { method: "DELETE" }),

  // ---- admin: officers ----
  adminOfficers: () => req<Officer[]>("/api/admin/officers"),
  createOfficer: (o: Partial<Officer>) => req<Officer[]>("/api/admin/officers", { method: "POST", ...body(o) }),
  updateOfficer: (id: number, o: Partial<Officer>) => req<Officer[]>(`/api/admin/officers?id=${id}`, { method: "PUT", ...body(o) }),
  deleteOfficer: (id: number) => req<Officer[]>(`/api/admin/officers?id=${id}`, { method: "DELETE" }),

  // ---- admin: resources ----
  adminResources: () => req<Resource[]>("/api/admin/resources"),
  createResource: (r: Partial<Resource>) => req<Resource[]>("/api/admin/resources", { method: "POST", ...body(r) }),
  updateResource: (id: number, r: Partial<Resource>) => req<Resource[]>(`/api/admin/resources?id=${id}`, { method: "PUT", ...body(r) }),
  deleteResource: (id: number) => req<Resource[]>(`/api/admin/resources?id=${id}`, { method: "DELETE" }),

  // ---- admin: fundraiser ----
  adminFundraiser: () => req<Fundraiser>("/api/admin/fundraiser"),
  updateFundraiser: (f: Partial<Fundraiser>) => req<Fundraiser>("/api/admin/fundraiser", { method: "PUT", ...body(f) }),

  // ---- admin: artifacts (file uploads stored as bytea) ----
  uploadArtifact: (filename: string, mimeType: string, dataBase64: string) =>
    req<UploadedArtifact>("/api/admin/artifacts", { method: "POST", ...body({ filename, mimeType, dataBase64 }) }),
};
