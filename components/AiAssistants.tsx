"use client";

import { useState, type KeyboardEvent } from "react";
import { useVerde, type StatusLine } from "./VerdeProvider";
import { Badge, Card, ChatThread, Icon } from "./ui";

function Diag({ label, line }: { label: string; line: StatusLine }) {
  return (
    <div className="diag">
      <span className="muted small">{label}</span>
      <span className={`mono small ${line ? (line.ok ? "ok" : "err") : "muted"}`}>{line?.text ?? "not tested"}</span>
    </div>
  );
}

function Composer({
  placeholder,
  disabled,
  onSend,
  tone,
}: {
  placeholder: string;
  disabled: boolean;
  onSend: (text: string) => void;
  tone: "green" | "purple";
}) {
  const [q, setQ] = useState("");
  const send = () => {
    const t = q.trim();
    if (!t || disabled) return;
    setQ("");
    onSend(t);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  return (
    <div className="composer">
      <textarea
        rows={1}
        value={q}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        aria-label={placeholder}
      />
      <button className={`btn ${tone} icon-send`} onClick={send} disabled={disabled || !q.trim()} aria-label="Send">
        <Icon name="send" size={16} />
      </button>
    </div>
  );
}

function GeminiCard() {
  const { aiLines, aiBusy, sendGemini, currentImage, testGemini, testWeather, testRouter, pingDB, status } = useVerde();
  return (
    <Card
      className="chat-card"
      title="Gemini · image chat"
      icon="leaf"
      right={<Badge tone={currentImage ? "info" : "idle"}>{currentImage ? currentImage.name : "no image"}</Badge>}
    >
      <ChatThread lines={aiLines} busy={aiBusy} height={380} assistantName="Gemini" />
      <Composer
        tone="green"
        disabled={aiBusy}
        placeholder="Ask about the plant… e.g. ‘what disease is this?’ or ‘should I water it?’"
        onSend={(t) => void sendGemini(t)}
      />
      <div className="diag-row">
        <button className="btn ghost sm" onClick={() => void testGemini()}>Test Gemini</button>
        <button className="btn ghost sm" onClick={() => void testWeather()}>Weather API</button>
        <button className="btn ghost sm" onClick={() => void testRouter()}>OpenRouter</button>
        <button className="btn ghost sm" onClick={() => void pingDB()}>Firebase</button>
      </div>
      <div className="diags">
        <Diag label="gemini" line={status.gemini} />
        <Diag label="weather" line={status.weather} />
        <Diag label="openrouter" line={status.router} />
        <Diag label="firebase" line={status.db} />
      </div>
    </Card>
  );
}

const QUICK = [
  ["Moisture check", "What is the current soil moisture and is it healthy?"],
  ["Should I water?", "Should I water the plant right now? Explain using the thresholds."],
  ["Tank safety", "Is the reservoir tank safe? What happens if it is empty?"],
  ["Judge summary", "Summarize the whole system status for a judge."],
] as const;

function OpenRouterCard() {
  const { orLines, orBusy, sendOpenRouter, orQuick } = useVerde();
  return (
    <Card className="chat-card" title="Sensor-aware assistant" icon="pulse" right={<Badge tone="info">OpenRouter</Badge>}>
      <ChatThread
        lines={orLines.length ? orLines : []}
        busy={orBusy}
        height={320}
        assistantName="Sensor AI"
      />
      <div className="chips">
        {QUICK.map(([label, question]) => (
          <button key={label} className="chip-btn" disabled={orBusy} onClick={() => orQuick(question)}>
            {label}
          </button>
        ))}
      </div>
      <Composer
        tone="purple"
        disabled={orBusy}
        placeholder="Ask about your live sensors, controls or database…"
        onSend={(t) => void sendOpenRouter(t)}
      />
    </Card>
  );
}

export default function AiAssistants() {
  return (
    <div className="page-body">
      <div className="dash-grid">
        <div className="c-6"><GeminiCard /></div>
        <div className="c-6"><OpenRouterCard /></div>
      </div>
    </div>
  );
}
