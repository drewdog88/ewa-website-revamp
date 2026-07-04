import { useState } from "react";
import { ChevronLeft, Lock, LogIn } from "lucide-react";
import { api } from "./api";

const MAROON = "#8C1515";
const BLACK = "#111111";
const LOGO_WOLF = "/assets/ewa-wolf.jpg";

export function LoginScreen({ onSuccess, onBack }: { onSuccess: (username: string) => void; onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(username.trim(), password);
      onSuccess(res.username);
    } catch (err) {
      setError(err instanceof Error && err.message !== "401" ? "Invalid username or password" : "Invalid username or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BLACK, fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-bold mb-8">
          <ChevronLeft size={16} /> Back to Site
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-8 flex flex-col items-center border-b border-gray-100">
            <img src={LOGO_WOLF} alt="EWA" className="h-16 w-16 rounded-full object-cover mb-4" />
            <div className="font-black text-xl uppercase tracking-widest" style={{ color: BLACK, fontFamily: "var(--font-display)" }}>EWA Admin</div>
            <div className="text-gray-400 text-xs mt-1 flex items-center gap-1"><Lock size={11} /> Authorized access only</div>
          </div>

          <form onSubmit={submit} className="px-8 py-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as string]: MAROON }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as string]: MAROON }} />
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={busy || !username || !password}
              className="w-full flex items-center justify-center gap-2 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: MAROON }}>
              {busy ? "Signing in…" : <><LogIn size={14} /> Sign In</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
