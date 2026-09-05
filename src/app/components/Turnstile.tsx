// Cloudflare Turnstile widget (CAPTCHA alternative) for the admin login form.
// Loads the Turnstile script once, renders a widget, and reports the token to
// the parent. The token is verified server-side in /api/auth/login.
import { useEffect, useRef } from "react";

// Site keys are public by design. This is the production widget
// ("EWA website admin login" in the Cloudflare dashboard). Override with
// VITE_TURNSTILE_SITE_KEY (e.g. Cloudflare's always-pass test key on previews).
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAEpjgb8g7yUvWLeI";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed to initialise")));
    s.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

export function Turnstile({
  onToken,
  onError,
  handleRef,
}: {
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
  handleRef?: React.MutableRefObject<TurnstileHandle | null>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !container.current) return;
        widgetId.current = ts.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          action: "admin-login",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            onError?.("Security check failed to load. Please refresh and try again.");
          },
        });
        if (handleRef) handleRef.current = { reset: () => widgetId.current && ts.reset(widgetId.current) };
      })
      .catch((e: Error) => {
        if (!cancelled) onError?.(e.message);
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      }
      if (handleRef) handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={container} className="flex justify-center min-h-[65px]" />;
}
