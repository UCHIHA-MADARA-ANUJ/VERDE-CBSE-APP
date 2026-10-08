"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { APP_VERSION } from "@/lib/config";
import AiAssistants from "./AiAssistants";
import AnalysisModal from "./AnalysisModal";
import Boot from "./Boot";
import Dashboard from "./Dashboard";
import { GraphModal, HoverGraph } from "./Graphs";
import PlantDoctor from "./PlantDoctor";
import { useVerde, VerdeProvider, type PageId, type PollState } from "./VerdeProvider";
import { Icon } from "./ui";
import Weather from "./Weather";

const PAGES: { id: PageId; icon: string; label: string; title: string }[] = [
  { id: "dashboard", icon: "grid", label: "Dashboard", title: "Sensory telemetry" },
  { id: "weather", icon: "cloud", label: "Weather", title: "Weather & rain override" },
  { id: "doctor", icon: "leaf", label: "Plant Doctor", title: "Plant Doctor" },
  { id: "ai", icon: "chat", label: "AI Assistants", title: "AI assistants" },
];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="mono clock" suppressHydrationWarning>
      {now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" })} <span className="muted">IST</span>
    </span>
  );
}

function LinkPill({ state }: { state: PollState }) {
  const map: Record<PollState, { cls: string; text: string }> = {
    connecting: { cls: "wait", text: "Connecting" },
    live: { cls: "live", text: "Firebase live" },
    offline: { cls: "bad", text: "Offline" },
  };
  const m = map[state];
  return (
    <span className={`link-pill ${m.cls}`}>
      <i />
      {m.text}
    </span>
  );
}

function Sidebar() {
  const { page, setPage, navOpen, setNavOpen, triggerCamCapture, checkWeather, pollState } = useVerde();
  return (
    <>
      <div className={`backdrop ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar ${navOpen ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark"><Icon name="leaf" size={20} /></div>
          <div>
            <div className="brand-t">PROJECT VERDE</div>
            <div className="brand-s">Autonomous Plant <span>· V3.0</span></div>
          </div>
        </div>

        <div className="nav-label">Navigate</div>
        <nav className="nav">
          {PAGES.map((p) => (
            <button key={p.id} className={`nav-item ${page === p.id ? "active" : ""}`} onClick={() => setPage(p.id)}>
              <Icon name={p.icon} size={18} />
              <span>{p.label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-label">Quick actions</div>
        <div className="quick">
          <button className="quick-btn" onClick={() => { setNavOpen(false); void triggerCamCapture(); }}>
            <Icon name="camera" size={16} /> Capture
          </button>
          <button className="quick-btn" onClick={() => { setNavOpen(false); void checkWeather(true); }}>
            <Icon name="refresh" size={16} /> Weather
          </button>
        </div>

        <div className="sidebar-foot">
          <LinkPill state={pollState} />
          <div className="muted mono small">build {APP_VERSION.replace("FINAL-DEMO-", "")}</div>
        </div>
      </aside>
    </>
  );
}

function Topbar() {
  const { page, setNavOpen, navOpen, pollState, rain, weather, toggleFullscreen } = useVerde();
  const meta = PAGES.find((p) => p.id === page);
  return (
    <header className="topbar">
      <button className="burger" onClick={() => setNavOpen(!navOpen)} aria-label="Open menu" aria-expanded={navOpen}>
        <Icon name="menu" size={20} />
      </button>
      <div className="page-title">
        <div className="crumb mono">VERDE OS / {meta?.label}</div>
        <h1>{meta?.title}</h1>
      </div>
      <div className="top-right">
        {rain && <span className="chip chip-rain"><Icon name="drop" size={13} /> Rain override</span>}
        {weather.current && (
          <span className="chip"><Icon name="cloud" size={13} /> {weather.current.temp}°C · {weather.current.city}</span>
        )}
        <div className="hide-sm"><LinkPill state={pollState} /></div>
        <div className="hide-sm"><Clock /></div>
        <button className="icon-btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
          <Icon name="gauge" size={16} />
        </button>
      </div>
    </header>
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
    <div className="app">
      <Boot />
      <Sidebar />
      <div className="main">
        <Topbar />
        <main key={page} className="page-fade">
          {page === "dashboard" && <Dashboard />}
          {page === "weather" && <Weather />}
          {page === "doctor" && <PlantDoctor />}
          {page === "ai" && <AiAssistants />}
        </main>
      </div>
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
