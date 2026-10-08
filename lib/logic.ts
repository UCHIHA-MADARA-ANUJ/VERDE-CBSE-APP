// Pure logic shared by the UI. Mirrors the original single-file app's rules exactly.
import type { ChatLine, Controls, Sensors } from "./types";

// ---------- tank calibration (app-side, no reflash) ----------
export type TankCal = { empty: number | null; full: number | null };
const TANK_KEY = "verde.tankCal";

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function loadTankCal(): TankCal {
  try {
    const raw = window.localStorage.getItem(TANK_KEY);
    if (!raw) return { empty: null, full: null };
    const p = JSON.parse(raw) as Partial<TankCal>;
    return { empty: numOrNull(p.empty), full: numOrNull(p.full) };
  } catch {
    return { empty: null, full: null };
  }
}

export function saveTankCal(cal: TankCal) {
  try {
    window.localStorage.setItem(TANK_KEY, JSON.stringify(cal));
  } catch {
    /* storage unavailable — calibration just won't persist */
  }
}

/** Raw tank reading → displayed percentage using the empty/full calibration. */
export function tankPercent(raw: number | undefined, cal: TankCal): number | null {
  if (raw === undefined || !Number.isFinite(raw)) return null;
  const { empty, full } = cal;
  if (empty === null || full === null || full === empty) return raw;
  const pct = ((raw - empty) / (full - empty)) * 100;
  return Math.min(100, Math.max(0, pct));
}

// ---------- actuator prediction (app computes; ESP32 untouched) ----------
export type Prediction = {
  pump: boolean;
  light: boolean;
  pumpReason: string;
  lightReason: string;
  reason: string;
  luxPct: number;
};

export function predictActuators(
  s: Sensors,
  c: Controls,
  tankPct: number | null,
  rain: boolean,
): Prediction {
  const m = s.moisture ?? 0;
  const tank = tankPct ?? 0;
  const tankTh = c.tank_threshold ?? 15;
  const moistTh = c.moisture_threshold ?? 35;
  const lightTh = c.light_threshold ?? 35;
  const luxPct = (s.lux ?? 0) / 10; // lux → % (matches firmware)
  const tankLock = tank < tankTh && tankTh > 0;
  const tankOk = tankTh === 0 || tank >= tankTh;

  let pump: boolean;
  let pumpReason: string;
  if (c.manual_mode) {
    pump = !!c.pump_state && tankOk;
    pumpReason = "MANUAL" + (pump ? " → ON" : " → OFF") + (tankLock ? " (tank lock!)" : "");
  } else {
    const dry = m < moistTh;
    pump = dry && tankOk && !rain;
    pumpReason =
      "AUTO" + (dry ? " · dry" : " · wet") + (tankLock ? " · tank lock" : "") + (rain ? " · RAIN" : "");
  }

  const dark = luxPct < lightTh;
  let light: boolean;
  let lightReason: string;
  if (c.light_manual_mode) {
    light = !!c.grow_light_state;
    lightReason = "MANUAL";
  } else {
    light = dark;
    lightReason =
      "AUTO" +
      (dark
        ? ` · dark (${Math.round(luxPct)}% < ${lightTh}%)`
        : ` · bright (${Math.round(luxPct)}%)`);
  }

  return {
    pump,
    light,
    pumpReason,
    lightReason,
    reason: `${pumpReason} · ${lightReason}`,
    luxPct,
  };
}

// ---------- weather ----------
const RAIN_GROUPS = new Set([2, 3, 5, 6]); // thunderstorm, drizzle, rain, snow

export const isRainId = (id: number) => RAIN_GROUPS.has(Math.floor(id / 100));

export function weatherEmoji(id: number, main: string): string {
  switch (Math.floor(id / 100)) {
    case 2:
      return "⛈️";
    case 3:
      return "🌦️";
    case 5:
      return "🌧️";
    case 6:
      return "❄️";
    case 7:
      return "🌫️";
    case 8:
      return main === "Clear" ? "☀️" : "☁️";
    default:
      return "⛅";
  }
}

// ---------- small helpers ----------
export const pct = (p: number) => Math.round(p * 100);

export function trend(values: number[]): { dir: "up" | "down" | "flat"; text: string } {
  if (values.length < 2) return { dir: "flat", text: "— not enough data" };
  const first = values[0];
  const last = values[values.length - 1];
  const d = last - first;
  const eps = Math.max(0.5, Math.abs(first) * 0.02);
  if (Math.abs(d) < eps) return { dir: "flat", text: "■ steady" };
  return d > 0
    ? { dir: "up", text: `▲ +${d.toFixed(1)}` }
    : { dir: "down", text: `▼ ${d.toFixed(1)}` };
}

/** Compact conversation transcript used as memory for follow-up questions. */
export function transcript(lines: ChatLine[], n = 8): string {
  return lines
    .filter((l) => l.role === "user" || l.role === "ai")
    .slice(-n)
    .map((l) => `${l.role === "user" ? "User" : "VERDE AI"}: ${l.text.slice(0, 400)}`)
    .join("\n");
}
