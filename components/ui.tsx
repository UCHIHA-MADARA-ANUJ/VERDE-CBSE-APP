"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { pct } from "@/lib/logic";
import type { Analysis, ChatLine } from "@/lib/types";

export function Card({
  title,
  right,
  children,
  span2 = false,
  className = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  span2?: boolean;
  className?: string;
}) {
  return (
    <section className={`card ${span2 ? "span-2" : ""} ${className}`}>
      {(title || right) && (
        <header className="card-h">
          {title && <h2>{title}</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="switch" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

/** Range slider that only commits on release (mirrors the original onchange behaviour). */
export function Threshold({
  label,
  hint,
  value,
  fallback,
  min,
  max,
  step,
  accent,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number | undefined;
  fallback: number;
  min: number;
  max: number;
  step: number;
  accent: string;
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
  return (
    <div className="row threshold">
      <div className="row-l">
        <span>
          {label} <span className="badge" style={{ color: accent, borderColor: accent }}>{shown}%</span>
        </span>
        {hint && <small>{hint}</small>}
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        style={{ accentColor: accent }}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        aria-label={label}
      />
    </div>
  );
}

/** Canvas line chart; redraws on resize and whenever values change. */
export function LineChart({
  values,
  color = "#22c55e",
  height = 110,
  min,
  max,
  threshold,
  className = "",
}: {
  values: number[];
  color?: string;
  height?: number;
  min?: number;
  max?: number;
  threshold?: number;
  className?: string;
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

      ctx.strokeStyle = "rgba(148,163,184,0.09)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (h * i) / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (values.length === 0) {
        ctx.fillStyle = "#475569";
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText("waiting for readings…", 8, h / 2 + 4);
        return;
      }

      const lo = min ?? Math.min(...values);
      let hi = max ?? Math.max(...values);
      if (hi === lo) hi = lo + 1;
      const pad = 6;
      const x = (i: number) =>
        values.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (values.length - 1);
      const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - 2 * pad);

      if (threshold !== undefined && threshold >= lo && threshold <= hi) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "rgba(245,158,11,0.75)";
        ctx.beginPath();
        ctx.moveTo(0, y(threshold));
        ctx.lineTo(w, y(threshold));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${color}55`);
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
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [values, color, min, max, threshold]);

  return <canvas ref={ref} className={`chart ${className}`} style={{ height }} />;
}

/** Scrolling monospace terminal used by the chat panels and the activity log. */
export function Terminal({
  lines,
  busy = false,
  tone = "green",
  height = 180,
}: {
  lines: (ChatLine | string)[];
  busy?: boolean;
  tone?: "green" | "sky";
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, busy]);

  return (
    <div className={`term ${tone}`} ref={ref} style={{ height }}>
      {lines.map((l, i) => {
        if (typeof l === "string") return <div key={i} className="ln sys">{l}</div>;
        const label = l.role === "user" ? "YOU › " : "";
        return (
          <div key={l.id} className={`ln ${l.role}`}>
            {label && <b>{label}</b>}
            {l.text}
          </div>
        );
      })}
      {busy && <div className="ln sys blink">VERDE AI is thinking…</div>}
    </div>
  );
}

export function AnalysisView({ a }: { a: Analysis }) {
  if (a.status === "idle") return <div className="muted small">Plant.id result will appear here</div>;
  if (a.status === "loading") return <div className="muted small">⏳ analysing with crop.health…</div>;
  if (a.status === "err") return <div className="err">❌ {a.message}</div>;

  const top = a.crops[0];
  const d = a.diseases[0];
  const common = top?.details?.common_names?.[0];
  const t = d?.details?.treatment;
  const tip = (t?.biological?.[0] ?? t?.prevention?.[0] ?? "").slice(0, 140);
  const healthy = d?.name.toLowerCase().includes("healthy");

  return (
    <div className="result">
      {top && (
        <div className="ok">
          ✅ <b>{top.name}</b>
          {common ? ` (${common})` : ""} — {pct(top.probability)}%
        </div>
      )}
      {d && (
        <div className={healthy ? "ok" : "err"}>
          🩺 disease: <b>{d.name}</b> ({pct(d.probability)}%)
        </div>
      )}
      {tip && <div className="muted small">💊 {tip}</div>}
    </div>
  );
}
