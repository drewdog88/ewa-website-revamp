
  import { createRoot } from "react-dom/client";
  import { initBotId } from "botid/client/core";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Invisible bot detection for the login endpoint (Vercel BotID, basic mode).
  initBotId({
    protect: [{ path: "/api/auth/login", method: "POST" }],
  });

  createRoot(document.getElementById("root")!).render(<App />);
  