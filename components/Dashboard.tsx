"use client";

import { useEffect, useState } from "react";
import { HOVER_LEN, SENSOR_META, type HistoryKey } from "@/lib/config";
import { trend } from "@/lib/logic";
import { useVerde } from "./VerdeProvider";
import { Card, LineChart, Terminal, Threshold, Toggle } from "./ui";

export function Uptime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="uptime">
      uptime {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  );
}

function SensorTile({
  id,
  label,
  value,
  color,
}: {
  id?: HistoryKey;
  label: string;
  value: string;
  color?: string;
}) {
  const { history, setHover, setGraphKey } = useVerde();
  const series = id ? history[id] : undefined;
  const t = series ? trend(series.slice(-HOVER_LEN)) : null;
  const interactive = !!id;

  return (
    <div
      className={`tile ${interactive ? "clickable" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onMouseEnter={(e) => {
        if (!id) return;
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ key: id, x: r.right + 10, y: r.top });
      }}
      onMouseLeave={() => setHover(null)}
      onClick={() => id && setGraphKey(id)}
      onKeyDown={(e) => {
        if (id && (e.key === "Enter" || e.key === " ")) setGraphKey(id);
      }}
      title={interactive ? "Hover for trend · click to expand" : undefined}
    >
      <div className="lbl">{label}</div>
      <div className="val" style={{ color }}>{value}</div>
      {series && (
        <>
          <LineChart values={series.slice(-HOVER_LEN)} color={color ?? "#22c55e"} height={26} className="spark" />
          <div className={`delta ${t?.dir ?? "flat"}`}>{t?.text}</div>
        </>
      )}
    </div>
  );
}

function SystemStrip() {
  const { sensors, prediction, rain, pollState, weather } = useVerde();
  const online = pollState === "live" && Object.keys(sensors).length > 0;
  const cells: { label: string; value: string; color: string }[] = [
    {
      label: "System",
      value: pollState === "offline" ? "OFFLINE" : online ? "ONLINE ✅" : "CONNECTING",
      color: pollState === "offline" ? "var(--red)" : online ? "var(--green-2)" : "var(--amber)",
    },
    {
      label: "Pump (expected)",
      value: prediction.pump ? "ON 💦" : "OFF",
      color: prediction.pump ? "var(--sky)" : "var(--dim)",
    },
    {
      label: "Light (expected)",
      value: prediction.light ? "ON 💡" : "OFF",
      color: prediction.light ? "var(--purple)" : "var(--dim)",
    },
    {
      label: "Rain",
      value: rain ? "☔ ACTIVE" : "none",
      color: rain ? "#f87171" : "var(--dim)",
    },
    {
      label: "Weather",
      value: weather.current ? `${weather.current.temp}°C ${weather.current.description}` : "--",
      color: "var(--text)",
    },
  ];
  return (
    <div className="status-strip">
      {cells.map((c) => (
        <div className="tile" key={c.label}>
          <div className="lbl">{c.label}</div>
          <div className="val small" style={{ color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function TankCalibration() {
  const { sensors, tankPct, tankCal, calTank } = useVerde();
  const raw = sensors.tank_level;
  const shown = tankPct === null ? "--" : `${Math.round(tankPct)}%`;
  return (
    <div className="panel">
      <div className="panel-t">🛢️ Tank calibration <span className="muted">· app-side, no reflash</span></div>
      <div className="small">
        Raw <b className="mono">{raw ?? "--"}%</b> → Displayed <b className="mono">{shown}</b>
        {(tankCal.empty !== null || tankCal.full !== null) && (
          <span className="muted mono"> · empty={tankCal.empty ?? "–"} full={tankCal.full ?? "–"}</span>
        )}
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => calTank("empty")}>📉 Set empty (0%)</button>
        <button className="btn" onClick={() => calTank("full")}>📈 Set full (100%)</button>
        <button className="btn ghost" onClick={() => calTank("reset")}>↺ Reset</button>
      </div>
      <div className="hint">Empty the bucket → Set empty · fill to desired max → Set full. Applied instantly.</div>
    </div>
  );
}

function TelemetryCard() {
  const { sensors, history, tankPct, controls } = useVerde();
  const s = sensors;
  const tiles: { id?: HistoryKey; label: string; value: string; color?: string }[] = [
    { id: "moisture", label: "Moisture", value: `${s.moisture ?? "--"}%`, color: SENSOR_META.moisture.color },
    { id: "temperature", label: "Temp", value: `${s.temperature ?? "--"}°C`, color: SENSOR_META.temperature.color },
    { id: "humidity", label: "Humidity", value: `${s.humidity ?? "--"}%`, color: SENSOR_META.humidity.color },
    {
      id: "tank_level",
      label: "Tank",
      value: tankPct === null ? "--" : `${Math.round(tankPct)}%`,
      color: SENSOR_META.tank_level.color,
    },
    { id: "lux", label: "Lux", value: `${s.lux ?? "--"}`, color: SENSOR_META.lux.color },
    { label: "Light", value: `${s.light ?? "--"}` },
    { id: "voltage_sag", label: "Volt", value: `${s.voltage_sag ?? "--"}V`, color: SENSOR_META.voltage_sag.color },
    { label: "Uploads ✓/✗", value: `${s.successful_uploads ?? 0}/${s.failed_uploads ?? 0}` },
  ];

  return (
    <Card title="📡 Live ESP32 telemetry" right={<span className="muted mono small">hover · click to expand</span>}>
      <div className="tiles">
        {tiles.map((t) => (
          <SensorTile key={t.label} id={t.id} label={t.label} value={t.value} color={t.color} />
        ))}
      </div>

      <div className="chart-head">
        <span>📈 Moisture history <span className="muted">(last 30 readings · amber = threshold)</span></span>
        <span className="mono small muted">{history.moisture.length ? `${history.moisture.at(-1)}% · ${history.moisture.length} pts` : "--"}</span>
      </div>
      <LineChart
        values={history.moisture}
        color={SENSOR_META.moisture.color}
        height={120}
        min={0}
        max={100}
        threshold={controls.moisture_threshold ?? 35}
      />

      <TankCalibration />
    </Card>
  );
}

function ControlsCard() {
  const { controls, setCtrl, prediction } = useVerde();
  const c = controls;
  const pumpOn = prediction.pump;
  const lightOn = prediction.light;
  return (
    <Card title="🎛️ Controls & thresholds">
      <div className="ctrl-list">
        <div className="row">
          <div className="row-l"><span>Pump AUTO / MANUAL</span></div>
          <Toggle label="Pump manual mode" checked={!!c.manual_mode} onChange={(v) => setCtrl("manual_mode", v)} />
        </div>
        <div className="row">
          <div className="row-l"><span>Pump state</span><small>used in MANUAL mode</small></div>
          <Toggle label="Pump state" checked={!!c.pump_state} onChange={(v) => setCtrl("pump_state", v)} />
        </div>
        <div className="row">
          <div className="row-l"><span>Light AUTO / MANUAL</span></div>
          <Toggle label="Light manual mode" checked={!!c.light_manual_mode} onChange={(v) => setCtrl("light_manual_mode", v)} />
        </div>
        <div className="row">
          <div className="row-l"><span>Grow light</span><small>used in MANUAL mode</small></div>
          <Toggle label="Grow light" checked={!!c.grow_light_state} onChange={(v) => setCtrl("grow_light_state", v)} />
        </div>
        <div className="row">
          <div className="row-l"><span>☔ Rain override</span><small>blocks auto-watering</small></div>
          <Toggle label="Rain override" checked={c.weather_override === 1} onChange={(v) => setCtrl("weather_override", v ? 1 : 0)} />
        </div>
      </div>

      <div className="section-label">⚡ Actuator states <span className="muted">— predicted by the app (ESP32 untouched)</span></div>
      <div className="predict">
        <span className={pumpOn ? "on-sky" : "off"}>pump {pumpOn ? "ON 💦" : "OFF"}</span>
        <span className={lightOn ? "on-purple" : "off"}>light {lightOn ? "ON 💡" : "OFF"}</span>
        <span className="muted">mode pump:{c.manual_mode ? "MAN" : "AUTO"} · light:{c.light_manual_mode ? "MAN" : "AUTO"}</span>
      </div>
      <div className="mono small muted reason">{prediction.reason}</div>

      <div className="section-label">Thresholds</div>
      <Threshold
        label="Moisture threshold"
        hint="water when soil is drier than this"
        value={c.moisture_threshold}
        fallback={35}
        min={0}
        max={80}
        step={5}
        accent="var(--green)"
        onCommit={(v) => setCtrl("moisture_threshold", v)}
      />
      <Threshold
        label="Tank lock"
        hint="0 = off · pump blocked below this"
        value={c.tank_threshold}
        fallback={15}
        min={0}
        max={40}
        step={5}
        accent="var(--red)"
        onCommit={(v) => setCtrl("tank_threshold", v)}
      />
      <Threshold
        label="Light threshold"
        hint="below = dark → LED auto-on"
        value={c.light_threshold}
        fallback={35}
        min={0}
        max={90}
        step={5}
        accent="var(--purple)"
        onCommit={(v) => setCtrl("light_threshold", v)}
      />
    </Card>
  );
}

function ActivityCard() {
  const { activity } = useVerde();
  return (
    <Card title="🧾 Activity log" className="span-2">
      <Terminal lines={activity} height={160} />
    </Card>
  );
}

export default function Dashboard() {
  const { toggleFullscreen, pingDB, checkWeather, triggerCamCapture, startedAt, status } = useVerde();
  return (
    <div className="page-body">
      <div className="demobar">
        <button className="btn" onClick={toggleFullscreen}>⛶ Fullscreen</button>
        <button className="btn" onClick={() => void pingDB()}>🔥 Firebase</button>
        <button className="btn" onClick={() => void checkWeather(true)}>🔍 Weather now</button>
        <button className="btn" onClick={() => void triggerCamCapture()}>📸 Capture</button>
        <span className="grow" />
        <Uptime startedAt={startedAt} />
      </div>
      {status.db && <div className={`api-res ${status.db.ok ? "ok" : "err"}`}>{status.db.text}</div>}

      <SystemStrip />

      <div className="grid">
        <TelemetryCard />
        <ControlsCard />
        <ActivityCard />
      </div>
    </div>
  );
}
