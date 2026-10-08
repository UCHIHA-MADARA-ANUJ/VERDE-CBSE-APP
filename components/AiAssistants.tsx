"use client";

import { useState, type KeyboardEvent } from "react";
import { useVerde, type StatusLine } from "./VerdeProvider";
import { Card, Terminal } from "./ui";

function Status({ label, line }: { label: string; line: StatusLine }) {
  return (
    <div className="status-row">
      <span className="muted mono small">{label}</span>
      <span className={`mono small ${line ? (line.ok ? "ok" : "err") : "muted"}`}>{line?.text ?? "—"}</span>
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) onSend();
  };
  return (
    <input
      className="chat-in"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKey}
    />
  );
}

function GeminiCard() {
  const { aiLines, aiBusy, sendGemini, currentImage, testWeather, testRouter, pingDB, status } = useVerde();
  const [q, setQ] = useState("");
  const send = () => {
    const text = q;
    setQ("");
    void sendGemini(text);
  };
  return (
    <Card
      span2
      title={<>🧠 Gemini 2.5 Flash — chat with image context</>}
      right={<span className="muted mono small">{currentImage ? `image: ${currentImage.name}` : "no image"}</span>}
    >
      <Terminal lines={aiLines} busy={aiBusy} height={240} />
      <div className="chat-row">
        <ChatInput
          value={q}
          onChange={setQ}
          onSend={send}
          disabled={aiBusy}
          placeholder="Ask about the plant photo… (e.g. 'what disease is this?' 'should I water it?')"
        />
        <button className="btn green" onClick={send} disabled={aiBusy || !q.trim()}>
          Ask Gemini
        </button>
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => void testWeather()}>🌦️ Weather</button>
        <button className="btn" onClick={() => void testRouter()}>🛰️ OpenRouter</button>
        <button className="btn" onClick={() => void pingDB()}>🔥 Firebase ping</button>
      </div>
      <div className="status-list">
        <Status label="weather" line={status.weather} />
        <Status label="openrouter" line={status.router} />
        <Status label="firebase" line={status.db} />
      </div>
    </Card>
  );
}

const QUICK = [
  ["💧 Moisture check", "What is the current soil moisture and is it healthy?"],
  ["💦 Should I water?", "Should I water the plant right now? Explain using the thresholds."],
  ["🛢️ Tank safety", "Is the reservoir tank safe? What happens if it is empty?"],
  ["🏆 Judge summary", "Summarize the whole system status for a judge."],
] as const;

function OpenRouterCard() {
  const { orLines, orBusy, sendOpenRouter, orQuick } = useVerde();
  const [q, setQ] = useState("");
  const send = () => {
    const text = q;
    setQ("");
    void sendOpenRouter(text);
  };
  return (
    <Card span2 title="🤖 Sensor-aware chat (OpenRouter) — knows your live ESP32 + database">
      <Terminal lines={orLines} busy={orBusy} tone="sky" height={220} />
      <div className="btn-row">
        {QUICK.map(([label, question]) => (
          <button key={label} className="btn" disabled={orBusy} onClick={() => orQuick(question)}>
            {label}
          </button>
        ))}
      </div>
      <div className="chat-row">
        <ChatInput
          value={q}
          onChange={setQ}
          onSend={send}
          disabled={orBusy}
          placeholder="Ask anything about the live sensor/app data…"
        />
        <button className="btn purple" onClick={send} disabled={orBusy || !q.trim()}>
          Ask OpenRouter
        </button>
      </div>
    </Card>
  );
}

export default function AiAssistants() {
  return (
    <div className="page-body">
      <div className="grid">
        <GeminiCard />
        <OpenRouterCard />
      </div>
    </div>
  );
}
