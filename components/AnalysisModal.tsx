"use client";

import { useState, type KeyboardEvent } from "react";
import { useVerde } from "./VerdeProvider";
import { AnalysisView, ChatThread, Icon } from "./ui";

export default function AnalysisModal() {
  const { modal, closeModal, sendModalGemini, analysis } = useVerde();
  const [q, setQ] = useState("");
  if (!modal.open || !modal.image) return null;

  const img = modal.image;
  const a = analysis.src === img.src ? analysis : { src: null, status: "idle" as const, crops: [], diseases: [] };
  const send = () => {
    const t = q.trim();
    if (!t || modal.busy) return;
    setQ("");
    void sendModalGemini(t);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="overlay" onClick={closeModal}>
      <div className="sheet analysis-sheet" role="dialog" aria-modal="true" aria-label="Plant analysis" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <div>
            <div className="crumb mono">PLANT ANALYSIS</div>
            <h3>{img.name}</h3>
          </div>
          <button className="icon-btn" onClick={closeModal} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>

        <div className="sheet-split">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="modal-img"
            src={img.src}
            alt="analysis"
            style={{ transform: img.source === "cam" ? "rotate(180deg)" : "none" }}
          />
          <div className="panel-plain"><AnalysisView a={a} /></div>
        </div>

        <ChatThread lines={modal.chat} busy={modal.busy} height={220} assistantName="Gemini" />
        <div className="composer">
          <input
            className="plain-in"
            value={q}
            placeholder="Ask about this plant photo…"
            disabled={modal.busy}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            aria-label="Ask about this photo"
          />
          <button className="btn green icon-send" onClick={send} disabled={modal.busy || !q.trim()} aria-label="Send">
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
