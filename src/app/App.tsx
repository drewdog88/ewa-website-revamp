import { useState, useEffect } from "react";
import { PublicSite } from "./PublicSite";
import { AdminPanel } from "./AdminPanel";
import { LoginScreen } from "./LoginScreen";
import { api } from "./api";
import type { Club, NewsItem, Officer, Resource, Fundraiser } from "./api";

type View = "site" | "login" | "admin";

export default function App() {
  const [view, setView] = useState<View>("site");
  const [username, setUsername] = useState<string | null>(null);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);

  // Load public content. Individual failures are non-fatal — a section just renders empty.
  const loadPublic = () => {
    api.clubs().then(setClubs).catch(() => {});
    api.news().then(setNews).catch(() => {});
    api.officers().then(setOfficers).catch(() => {});
    api.resources().then(setResources).catch(() => {});
    api.fundraiser().then(setFundraiser).catch(() => {});
  };

  useEffect(() => {
    loadPublic();
    // Restore an existing admin session silently.
    api.me().then((u) => setUsername(u.username)).catch(() => setUsername(null));
  }, []);

  const goAdmin = () => setView(username ? "admin" : "login");

  const onLoginSuccess = (name: string) => { setUsername(name); setView("admin"); };

  const onLogout = () => { setUsername(null); setView("site"); };

  const backToSite = () => { loadPublic(); setView("site"); };

  if (view === "login") return <LoginScreen onSuccess={onLoginSuccess} onBack={() => setView("site")} />;
  if (view === "admin" && username) return <AdminPanel username={username} onBack={backToSite} onLogout={onLogout} />;

  return (
    <PublicSite
      clubs={clubs}
      news={news}
      officers={officers}
      resources={resources}
      fundraiser={fundraiser}
      onGoAdmin={goAdmin}
    />
  );
}
