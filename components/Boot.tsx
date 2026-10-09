"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STEPS = [
  "Starting the VERDE greenhouse workspace",
  "Preparing live sensor telemetry",
  "Loading irrigation and lighting controls",
  "Preparing weather and plant-health tools",
  "Workspace ready — connecting to your device",
];

const KEY = "verde.booted";

// Tiny external store: "has the boot sequence already run this session?"
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const hasBooted = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const markBooted = () => {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: the boot simply shows again next load */
  }
  listeners.forEach((l) => l());
};

/** One-time-per-session boot sequence. Skippable. Renders nothing on the server. */
export default function Boot() {
  const booted = useSyncExternalStore(
    subscribe,
    () => hasBooted(),
    () => true, // server: hidden, so there is no hydration mismatch
  );
  const [count, setCount] = useState(0);

  const close = useCallback(() => markBooted(), []);

  useEffect(() => {
    if (booted) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= STEPS.length) {
        window.clearInterval(id);
        window.setTimeout(close, 450);
      }
    }, 260);
    return () => window.clearInterval(id);
  }, [booted, close]);

  if (booted) return null;
  const pct = Math.round((count / STEPS.length) * 100);
  return (
    <div className="boot" role="dialog" aria-label="Boot sequence">
      <div className="boot-box">
        <div className="boot-brand">PROJECT VERDE OS <span>V3.0</span></div>
        <div className="boot-sub">Autonomous Plant OS</div>
        <div className="boot-log">
          {STEPS.slice(0, count).map((l) => (
            <div key={l}>
              <span className="boot-ok">›</span> {l}
            </div>
          ))}
          <div className="boot-cursor">_</div>
        </div>
        <div className="boot-bar"><div style={{ width: `${pct}%` }} /></div>
        <div className="boot-foot">
          <span className="mono">BOOTING KERNEL… {pct}%</span>
          <button className="btn ghost sm" onClick={close}>Bypass diagnostics</button>
        </div>
      </div>
    </div>
  );
}
