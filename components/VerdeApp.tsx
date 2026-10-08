"use client";

import { useEffect, type ChangeEvent } from "react";
import { APP_VERSION } from "@/lib/config";
import AiAssistants from "./AiAssistants";
import AnalysisModal from "./AnalysisModal";
import Dashboard from "./Dashboard";
import { GraphModal, HoverGraph } from "./Graphs";
import PlantDoctor from "./PlantDoctor";
import { useVerde, VerdeProvider, type PageId, type PollState } from "./VerdeProvider";
import Weather from "./Weather";

const PAGES: { id: PageId; icon: string; label: string; hint: string }[] = [
  { id: "dashboard", icon: "📡", label: "Dashboard", hint: "telemetry · controls · status" },
  { id: "weather", icon: "🌦️", label: "Weather", hint: "auto rain override" },
  { id: "doctor", icon: "🌿", label: "Plant Doctor", hint: "capture · analyse · photo" },
  { id: "ai", icon: "🧠", label: "AI Assistants", hint: "Gemini · OpenRouter chats" },
];

function PollPill({ state }: { state: PollState }) {
  const map: Record<PollState, { cls: string; text: string }> = {
    connecting: { cls: "off", text: "⏳ CONNECTING…" },
    live: { cls: "live", text: "● FIREBASE LIVE" },
    offline: { cls: "bad", text: "✗ OFFLINE" },
  };
  const m = map[state];
  return <span className={`status-pill ${m.cls}`}>{m.text}</span>;
}

function Header() {
  const { setNavOpen, navOpen, pollState } = useVerde();
  return (
    <header className="topbar">
      <button className="burger" onClick={() => setNavOpen(!navOpen)} aria-label="Menu" aria-expanded={navOpen}>
        ☰
      </button>
      <div className="brand">
        <div className="brand-t">
          PROJECT VERDE <span>FINAL APP</span>
        </div>
        <div className="brand-s">
          <span className="chip-green">DEMO-READY {APP_VERSION.replace("FINAL-DEMO-", "")}</span>
          <span className="muted mono small">Next.js · secure server proxy</span>
        </div>
      </div>
      <PollPill state={pollState} />
    </header>
  );
}

function NavDrawer() {
  const { navOpen, setNavOpen, page, setPage, triggerCamCapture, checkWeather } = useVerde();
  return (
    <>
      <div className={`backdrop ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />
      <nav className={`drawer ${navOpen ? "open" : ""}`} aria-label="Main">
        <div className="drawer-h">Menu</div>
        {PAGES.map((p) => (
          <button key={p.id} className={`nav-item ${page === p.id ? "active" : ""}`} onClick={() => setPage(p.id)}>
            <span>{p.icon} {p.label}</span>
            <small>{p.hint}</small>
          </button>
        ))}
        <div className="drawer-h">Quick</div>
        <button className="nav-item" onClick={() => { setNavOpen(false); void triggerCamCapture(); }}>
          📸 Capture photo
        </button>
        <button className="nav-item" onClick={() => { setNavOpen(false); void checkWeather(true); }}>
          🔍 Check weather
        </button>
        <div className="drawer-foot">v{APP_VERSION}</div>
      </nav>
    </>
  );
}

function Toasts() {
  const { toasts } = useVerde();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
      ))}
    </div>
  );
}

function FileInput() {
  const { fileInputRef, onUserFile } = useVerde();
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUserFile(f);
    e.target.value = "";
  };
  return <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onChange} />;
}

function Shell() {
  const { page, navOpen, setNavOpen, graphKey, setGraphKey, modal, closeModal } = useVerde();

  // Esc closes the topmost overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modal.open) closeModal();
      else if (graphKey) setGraphKey(null);
      else if (navOpen) setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, graphKey, navOpen, closeModal, setGraphKey, setNavOpen]);

  return (
    <div className="shell">
      <Header />
      <NavDrawer />
      <main key={page} className="page-fade">
        {page === "dashboard" && <Dashboard />}
        {page === "weather" && <Weather />}
        {page === "doctor" && <PlantDoctor />}
        {page === "ai" && <AiAssistants />}
      </main>
      <HoverGraph />
      <GraphModal />
      <AnalysisModal />
      <Toasts />
      <FileInput />
    </div>
  );
}

export default function VerdeApp() {
  return (
    <VerdeProvider>
      <Shell />
    </VerdeProvider>
  );
}
