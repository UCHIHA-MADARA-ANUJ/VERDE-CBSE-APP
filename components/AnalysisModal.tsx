"use client";

import { useState, type KeyboardEvent } from "react";
import { useVerde } from "./VerdeProvider";
import { AnalysisView, Terminal } from "./ui";

export default function AnalysisModal() {
  const { modal, closeModal, sendModalGemini, analysis } = useVerde();
  const [q, setQ] = useState("");
  if (!modal.open || !modal.image) return null;

  const img = modal.image;
  const a = analysis.src === img.src ? analysis : { ...analysis, status: "idle" as const };
  const send = () => {
    const text = q;
    setQ("");
    void sendModalGemini(text);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="overlay" onClick={closeModal}>
      <div className="sheet analysis-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h3>🌿 Plant analysis · <span className="muted">{img.name}</span></h3>
          <button className="icon-btn" onClick={closeModal} aria-label="Close">✕</button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="modal-img"
          src={img.src}
          alt="analysis"
          style={{ transform: img.source === "cam" ? "rotate(180deg)" : "none" }}
        />

        <div className="panel"><AnalysisView a={a} /></div>

        <Terminal lines={modal.chat} busy={modal.busy} height={170} />
        <div className="chat-row">
          <input
            className="chat-in"
            value={q}
            placeholder="Ask about THIS plant photo…"
            disabled={modal.busy}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <button className="btn green" onClick={send} disabled={modal.busy || !q.trim()}>
            Ask
          </button>
        </div>
        <div className="hint">Gemini sees this image and the Crop.health result above.</div>
      </div>
    </div>
  );
}
