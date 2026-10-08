"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SENSOR_META } from "@/lib/config";
import { useVerde, type PageId } from "./VerdeProvider";
import { Card, Icon } from "./ui";

type Line = { id: number; kind: "in" | "out" | "err" | "ok"; text: string };
let uid = 0;
const ln = (kind: Line["kind"], text: string): Line => ({ id: ++uid, kind, text });

const HELP = [
  "Commands:",
  "  status                 summary of all sensors and actuators",
  "  moisture | temp | humidity | tank | lux | voltage",
  "  pump on | pump off | pump auto      (on = manual mode, pump on)",
  "  light on | light off | light auto   (on = manual mode, light on)",
  "  rain on | rain off                  rain override",
  "  capture                              trigger CAM photo",
  "  weather                              refresh Delhi weather",
  "  ping                                 check Firebase link",
  "  goto dashboard | weather | doctor | ai",
  "  clear",
];

export default function Shell() {
  const v = useVerde();
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    ln("ok", "VERDE SHELL V3.0 ONLINE. SECURE THREAD ACTIVE."),
    ln("out", "Type `help` to list commands."),
  ]);
  const history = useRef<string[]>([]);
  const hIdx = useRef<number>(-1);
  const bodyRef = useRef<HTMLDivElement>(null);

  const print = (...items: Line[]) => {
    setLines((l) => [...l.slice(-300), ...items]);
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const show = (k: keyof typeof SENSOR_META | "voltage" | "light") => {
    const s = v.sensors;
    switch (k) {
      case "moisture":
        return `soil moisture: ${s.moisture ?? "--"}% (threshold ${v.controls.moisture_threshold ?? 35}%)`;
      case "temperature":
        return `temperature: ${s.temperature ?? "--"}°C`;
      case "humidity":
        return `humidity: ${s.humidity ?? "--"}%`;
      case "tank_level":
        return `tank: ${v.tankPct === null ? "--" : Math.round(v.tankPct) + "%"} (raw ${s.tank_level ?? "--"}%)`;
      case "lux":
        return `lux: ${s.lux ?? "--"} (${Math.round(v.prediction.luxPct)}% of scale)`;
      case "voltage_sag":
        return `voltage sag: ${s.voltage_sag ?? "--"} V`;
      default:
        return "";
    }
  };

  const run = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    print(ln("in", `$ ${cmd}`));
    const [head, ...rest] = cmd.toLowerCase().split(/\s+/);
    const arg = rest.join(" ");
    const p = v.prediction;

    switch (head) {
      case "help":
        return print(...HELP.map((t) => ln("out", t)));
      case "clear":
        return setLines([]);
      case "status":
        return print(
          ln("out", `system: ${v.pollState === "live" ? "ONLINE" : v.pollState.toUpperCase()}`),
          ln("out", show("moisture")),
          ln("out", show("temperature")),
          ln("out", show("humidity")),
          ln("out", show("tank_level")),
          ln("out", show("lux")),
          ln("out", `pump: ${p.pump ? "ON" : "OFF"} (${p.pumpReason})`),
          ln("out", `light: ${p.light ? "ON" : "OFF"} (${p.lightReason})`),
          ln("out", `rain override: ${v.rain ? "ACTIVE" : "off"}`),
        );
      case "moisture":
        return print(ln("out", show("moisture")));
      case "temp":
      case "temperature":
        return print(ln("out", show("temperature")));
      case "humidity":
        return print(ln("out", show("humidity")));
      case "tank":
        return print(ln("out", show("tank_level")));
      case "lux":
        return print(ln("out", show("lux")));
      case "voltage":
        return print(ln("out", show("voltage_sag")));
      case "pump":
      case "light":
      case "rain": {
        if (arg !== "on" && arg !== "off" && !(head !== "rain" && arg === "auto")) {
          return print(ln("err", `usage: ${head} ${head === "rain" ? "on|off" : "on|off|auto"}`));
        }
        if (head === "pump") {
          if (arg === "auto") await v.setCtrl("manual_mode", false);
          else {
            await v.setCtrl("manual_mode", true);
            await v.setCtrl("pump_state", arg === "on");
          }
          return print(ln("ok", `pump → ${arg}`));
        }
        if (head === "light") {
          if (arg === "auto") await v.setCtrl("light_manual_mode", false);
          else {
            await v.setCtrl("light_manual_mode", true);
            await v.setCtrl("grow_light_state", arg === "on");
          }
          return print(ln("ok", `light → ${arg}`));
        }
        await v.setCtrl("weather_override", arg === "on" ? 1 : 0);
        return print(ln("ok", `rain override → ${arg}`));
      }
      case "capture":
        await v.triggerCamCapture();
        return print(ln("ok", "capture requested — waiting for CAM frame"));
      case "weather":
        await v.checkWeather(true);
        return print(ln("ok", v.weather.current ? `weather: ${v.weather.current.temp}°C ${v.weather.current.description}` : "weather requested"));
      case "ping":
        await v.pingDB();
        return print(ln("ok", "ping sent — see Dashboard status"));
      case "goto": {
        const map: Record<string, PageId> = { dashboard: "dashboard", weather: "weather", doctor: "doctor", ai: "ai" };
        const target = map[arg];
        if (!target) return print(ln("err", "usage: goto dashboard|weather|doctor|ai"));
        v.setPage(target);
        return print(ln("ok", `opened ${arg}`));
      }
      default:
        return print(ln("err", `command not found: ${head}. Type "help".`));
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const text = input;
      if (text.trim()) history.current.push(text);
      hIdx.current = -1;
      setInput("");
      void run(text);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = history.current;
      if (!h.length) return;
      hIdx.current = hIdx.current < 0 ? h.length - 1 : Math.max(0, hIdx.current - 1);
      setInput(h[hIdx.current]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      if (hIdx.current < 0) return;
      hIdx.current += 1;
      if (hIdx.current >= h.length) {
        hIdx.current = -1;
        setInput("");
      } else setInput(h[hIdx.current]);
    }
  };

  return (
    <Card title="Active terminal shell" icon="terminal" right={<span className="chip">interactive</span>} className="shell-card">
      <div className="term-screen" ref={bodyRef} onClick={() => document.getElementById("shell-in")?.focus()}>
        {lines.map((l) => (
          <div key={l.id} className={`ln ${l.kind}`}>{l.text}</div>
        ))}
      </div>
      <div className="term-input">
        <span className="prompt mono">verde@os:~$</span>
        <input
          id="shell-in"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="type a command…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Shell command"
        />
        <button className="btn green sm" onClick={() => { const t = input; setInput(""); void run(t); }}>
          <Icon name="send" size={14} /> Execute
        </button>
      </div>
    </Card>
  );
}

