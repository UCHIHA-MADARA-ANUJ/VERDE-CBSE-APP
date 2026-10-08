"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { pct } from "@/lib/logic";
import type { Status, Tone } from "@/lib/logic";
import type { Analysis, ChatLine } from "@/lib/types";

// ---------- icons (inline SVG, stroke-based) ----------
const ICONS: Record<string, string[]> = {
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  cloud: ["M7 18a4 4 0 010-8 5 5 0 019.6-1.3A4.5 4.5 0 0118 18H7z"],
  leaf: ["M4 20c0-8 6-14 16-14 0 10-6 16-14 16z", "M4 20L14 10"],
  chat: ["M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"],
  terminal: ["M4 17l6-6-6-6", "M12 19h8"],
  camera: ["M4 8h3l2-3h6l2 3h3v11H4z", "M12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"],
  refresh: ["M20 12a8 8 0 11-2.3-5.7", "M20 4v5h-5"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  drop: ["M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"],
  thermo: ["M14 14.8V5a2 2 0 00-4 0v9.8a4 4 0 104 0z"],
  sun: ["M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4", "M12 8a4 4 0 100 8 4 4 0 000-8z"],
  tank: ["M6 4h12v16H6z", "M6 9h12", "M6 14h12"],
  send: ["M4 12l16-8-6 16-2-7z"],
  close: ["M6 6l12 12M18 6L6 18"],
  menu: ["M4 7h16M4 12h16M4 17h16"],
  gauge: ["M4 15a8 8 0 1116 0", "M12 15l4-4"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  rotate: ["M4 12a8 8 0 018-8 8 8 0 016 2.7L20 9", "M20 4v5h-5", "M20 12a8 8 0 01-8 8 8 8 0 01-6-2.7L4 15", "M4 20v-5h5"],
  flame: ["M12 3c2 4 6 6 6 11a6 6 0 01-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-4 1-6 2-9.5z"],
  pulse: ["M3 12h4l2-6 4 12 2-6h6"],
};

export function Icon({ name, size = 18, className = "" }: { name: keyof typeof ICONS | string; size?: number; className?: string }) {
  const paths = ICONS[name] ?? ICONS.gauge;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// ---------- layout primitives ----------
export function Card({
  title,
  icon,
  right,
  children,
  span2 = false,
  className = "",
}: {
  title?: ReactNode;
  icon?: string;
  right?: ReactNode;
  children: ReactNode;
  span2?: boolean;
  className?: string;
}) {
  return (
    <section className={`card ${span2 ? "span-2" : ""} ${className}`}>
      {(title || right) && (
        <header className="card-h">
          {title && (
            <h2>
              {icon && <Icon name={icon} size={16} />}
              <span>{title}</span>
            </h2>
          )}
          {right && <div className="card-h-r">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "idle", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status-pill-sm tone-${status.tone}`}>
      <i />
      {status.label}
    </span>
  );
}

// ---------- controls ----------
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

/** Slider that commits on release (same behaviour as the original onchange). */
export function Threshold({
  label,
  hint,
  value,
  fallback,
  min,
  max,
  step,
  tone,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number | undefined;
  fallback: number;
  min: number;
  max: number;
  step: number;
  tone: string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value ?? fallback;
  const commit = () => {
    if (draft !== null) {
      onCommit(draft);
      setDraft(null);
    }
  };
  const fill = ((shown - min) / (max - min)) * 100;
  return (
    <div className="threshold">
      <div className="threshold-h">
        <div>
          <div className="threshold-t">{label}</div>
          {hint && <div className="threshold-hint">{hint}</div>}
        </div>
        <output className="threshold-v mono" style={{ color: tone }}>{shown}%</output>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        style={{ ["--fill" as string]: `${fill}%`, ["--tone" as string]: tone }}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        aria-label={label}
      />
    </div>
  );
}

// ---------- visualisations ----------
/** Radial gauge (SVG). value is 0–100. */
export function Gauge({ value, color, size = 92, stroke = 9, children }: { value: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,255,180,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray .6s ease, stroke .3s", filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="gauge-c">{children}</div>
    </div>
  );
}

/** Horizontal meter bar. */
export function Meter({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter">
      <div className="meter-fill" style={{ width: `${w}%`, background: color, boxShadow: `0 0 10px ${color}66` }} />
    </div>
  );
}

/** Canvas line chart; redraws on resize and value change. */
export function LineChart({
  values,
  color = "#3ddc84",
  height = 110,
  min,
  max,
  threshold,
  className = "",
  grid = true,
}: {
  values: number[];
  color?: string;
  height?: number;
  min?: number;
  max?: number;
  threshold?: number;
  className?: string;
  grid?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (grid) {
        ctx.strokeStyle = "rgba(120,255,180,0.07)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const y = Math.round((h * i) / 4) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      if (values.length === 0) {
        ctx.fillStyle = "#4b5e53";
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText("waiting for readings…", 10, h / 2 + 4);
        return;
      }

      const lo = min ?? Math.min(...values);
      let hi = max ?? Math.max(...values);
      if (hi === lo) hi = lo + 1;
      const pad = 8;
      const x = (i: number) => (values.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (values.length - 1));
      const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - 2 * pad);

      if (threshold !== undefined && threshold >= lo && threshold <= hi) {
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = "rgba(255,176,32,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y(threshold));
        ctx.lineTo(w, y(threshold));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${color}40`);
      grad.addColorStop(1, `${color}00`);
      ctx.beginPath();
      values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      ctx.lineTo(x(values.length - 1), h);
      ctx.lineTo(x(0), h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();

      const lx = x(values.length - 1);
      const ly = y(values[values.length - 1]);
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fillStyle = `${color}33`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [values, color, min, max, threshold, grid]);

  return <canvas ref={ref} className={`chart ${className}`} style={{ height }} />;
}

// ---------- logs + chat ----------
/** Monospace scrolling log (activity feed). */
export function Terminal({ lines, height = 180 }: { lines: string[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <div className="term" ref={ref} style={{ height }}>
      {lines.map((l, i) => (
        <div key={i} className="ln">{l}</div>
      ))}
    </div>
  );
}

/** Chat bubbles for Gemini / OpenRouter / analysis follow-ups. */
export function ChatThread({
  lines,
  busy = false,
  height = 320,
  assistantName = "VERDE AI",
}: {
  lines: ChatLine[];
  busy?: boolean;
  height?: number;
  assistantName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, busy]);

  return (
    <div className="thread" ref={ref} style={{ height }}>
      {lines.map((l) => {
        if (l.role === "sys") return <div key={l.id} className="sys-note">{l.text}</div>;
        const text = l.text.replace(/^VERDE AI:\s*/, "");
        const mine = l.role === "user";
        return (
          <div key={l.id} className={`msg ${mine ? "me" : l.role === "err" ? "err" : "bot"}`}>
            {!mine && <div className="msg-who">{l.role === "err" ? "error" : assistantName}</div>}
            <div className="bubble">{text}</div>
          </div>
        );
      })}
      {busy && (
        <div className="msg bot">
          <div className="msg-who">{assistantName}</div>
          <div className="bubble typing"><span /><span /><span /></div>
        </div>
      )}
      {lines.length === 0 && !busy && <div className="sys-note">Start a conversation.</div>}
    </div>
  );
}

// ---------- plant analysis ----------
export function AnalysisView({ a }: { a: Analysis }) {
  if (a.status === "idle") return <div className="muted small">Run an analysis to see the Crop.health result here.</div>;
  if (a.status === "loading") return <div className="muted small loading-line">Analysing with Crop.health…</div>;
  if (a.status === "err") return <div className="err small">⚠ {a.message}</div>;

  const top = a.crops[0];
  const d = a.diseases[0];
  const common = top?.details?.common_names?.[0];
  const t = d?.details?.treatment;
  const tip = (t?.biological?.[0] ?? t?.prevention?.[0] ?? "").slice(0, 220);
  const healthy = d?.name.toLowerCase().includes("healthy");

  return (
    <div className="result">
      {top && (
        <div className="result-row">
          <div>
            <div className="result-k">Identified plant</div>
            <div className="result-v">{top.name}</div>
            {common && <div className="muted small">{common}</div>}
          </div>
          <div className="conf">
            <span className="mono">{pct(top.probability)}%</span>
            <Meter value={pct(top.probability)} color="var(--green)" />
          </div>
        </div>
      )}
      {d && (
        <div className="result-row">
          <div>
            <div className="result-k">Health check</div>
            <div className={`result-v ${healthy ? "ok" : "warn-t"}`}>{d.name}</div>
          </div>
          <div className="conf">
            <span className="mono">{pct(d.probability)}%</span>
            <Meter value={pct(d.probability)} color={healthy ? "var(--green)" : "var(--amber)"} />
          </div>
        </div>
      )}
      {tip && <div className="tip">💊 {tip}</div>}
    </div>
  );
}
