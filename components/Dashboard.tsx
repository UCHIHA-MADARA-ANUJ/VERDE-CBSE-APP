"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HOVER_LEN, SENSOR_META, type HistoryKey } from "@/lib/config";
import {
  humidityStatus,
  luxStatus,
  moistureStatus,
  tankStatus,
  tempStatus,
  trend,
  vitality,
  type Status,
} from "@/lib/logic";
import Shell from "./Shell";
import { useVerde } from "./VerdeProvider";
import { Badge, Card, Gauge, Icon, LineChart, Meter, StatusPill, Terminal, Threshold, Toggle } from "./ui";

export function Uptime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="uptime mono">
      uptime {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  );
}

const toneColor = (t: Status["tone"]) =>
  ({ ok: "var(--green)", warn: "var(--amber)", bad: "var(--red)", info: "var(--sky)", idle: "var(--dim)" })[t];

/** Telemetry card: fixed structure so every card lines up. Click → expanded history. */
function SensorCard({
  id,
  icon,
  title,
  source,
  children,
  status,
  series,
  footer,
}: {
  id?: HistoryKey;
  icon: string;
  title: string;
  source: string;
  children: ReactNode;
  status: Status;
  series?: number[];
  footer?: ReactNode;
}) {
  const { setGraphKey, setHover } = useVerde();
  const t = series ? trend(series.slice(-HOVER_LEN)) : null;
  const color = id ? SENSOR_META[id].color : "var(--green)";
  const hasSeries = !!series && series.length > 1;
  return (
    <article
      className={`sensor ${id ? "clickable" : ""}`}
      onClick={() => id && setGraphKey(id)}
      onKeyDown={(e) => id && (e.key === "Enter" || e.key === " ") && setGraphKey(id)}
      onMouseEnter={(e) => {
        if (!id) return;
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ key: id, x: r.right + 12, y: r.top });
      }}
      onMouseLeave={() => setHover(null)}
      tabIndex={id ? 0 : undefined}
      role={id ? "button" : undefined}
      title={id ? "Click to expand history" : undefined}
    >
      <header className="sensor-h">
        <div className="sensor-ic" style={{ color }}><Icon name={icon} size={18} /></div>
        <div className="sensor-t">
          <div className="sensor-name">{title}</div>
          <div className="sensor-src mono">{source}</div>
        </div>
        <StatusPill status={status} />
      </header>

      <div className="sensor-body">{children}</div>

      <div className="sensor-spark">
        {hasSeries ? (
          <>
            <LineChart values={series!.slice(-HOVER_LEN)} color={color} height={52} grid={false} />
            <div className="spark-foot">
              <span className={`delta ${t?.dir ?? "flat"}`}>{t?.text}</span>
              <span className="muted mono">last {Math.min(series!.length, HOVER_LEN)}</span>
            </div>
          </>
        ) : (
          <div className="spark-empty mono">collecting history…</div>
        )}
      </div>

      {footer && <div className="sensor-foot" onClick={(e) => e.stopPropagation()}>{footer}</div>}
    </article>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: number | string | null | undefined; unit: string }) {
  const shown = value === null || value === undefined ? "—" : value;
  return (
    <div className="mini">
      <span>{label}</span>
      <b className="mono">{shown}{value !== null && value !== undefined && <small>{unit}</small>}</b>
    </div>
  );
}

function Vitality() {
  const { sensors: s, controls, tankPct, pollState } = useVerde();
  const v = vitality(s, controls, tankPct);
  const score = v?.score ?? null;
  const color = score === null ? "var(--dim)" : score >= 80 ? "var(--green)" : score >= 50 ? "var(--amber)" : "var(--red)";
  const liveTone = pollState === "live" ? "ok" : pollState === "offline" ? "bad" : "warn";
  return (
    <Card className="hero" title="Plant vitality" icon="pulse" right={<Badge tone={liveTone}>{pollState === "live" ? "Live system" : pollState === "offline" ? "Needs connection" : "Connecting"}</Badge>}>
      <div className="hero-body">
        <Gauge value={score ?? 0} color={color} size={164} stroke={12}>
          <div className="vit-score mono" style={{ color }}>{score === null ? "—" : score}<small>{score === null ? "" : "/100"}</small></div>
          <div className="vit-label">Vitality</div>
        </Gauge>
        <div className="hero-info">
          <p className="lede">
            {score === null
              ? pollState === "offline" ? "No telemetry connection. Check Firebase configuration and make sure your device is online." : "Waiting for the first readings from your WROOM-32…"
              : "Live readings from your WROOM-32 platform, scored against your thresholds."}
          </p>
          {v && (v.issues.length === 0 ? (
            <p className="ok-line"><Icon name="shield" size={16} /> All readings are within range.</p>
          ) : (
            <ul className="issues">
              {v.issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          ))}
          <div className="mini-grid">
            <MiniStat label="Soil" value={s.moisture} unit="%" />
            <MiniStat label="Air" value={s.temperature} unit="°C" />
            <MiniStat label="Light" value={s.lux} unit=" lx" />
            <MiniStat label="Tank" value={tankPct === null ? null : Math.round(tankPct)} unit="%" />
          </div>
          <p className="fine muted">Vitality is calculated by this app from your thresholds — the device does not measure it.</p>
        </div>
      </div>
    </Card>
  );
}

function Actuators() {
  const { prediction, controls, rain, sensors } = useVerde();
  const p = prediction;
  const known = sensors.moisture !== undefined || sensors.lux !== undefined;
  return (
    <Card title="Irrigation & lighting" icon="bolt" right={<span className="chip">{known ? "app prediction" : "awaiting readings"}</span>}>
      <div className="actuators">
        <div className={`act ${known && p.pump ? "on" : ""}`} style={{ ["--act" as string]: "var(--sky)" }}>
          <Icon name="drop" size={22} />
          <div className="act-k">Pump</div>
          <div className="act-v">{known ? (p.pump ? "ON" : "OFF") : "—"}</div>
        </div>
        <div className={`act ${known && p.light ? "on" : ""}`} style={{ ["--act" as string]: "var(--violet)" }}>
          <Icon name="sun" size={22} />
          <div className="act-k">Grow light</div>
          <div className="act-v">{known ? (p.light ? "ON" : "OFF") : "—"}</div>
        </div>
      </div>
      <div className="kv">
        <div><span>Pump mode</span><b>{controls.manual_mode ? "Manual" : "Auto"}</b></div>
        <div><span>Light mode</span><b>{controls.light_manual_mode ? "Manual" : "Auto"}</b></div>
        <div><span>Rain override</span><b className={rain ? "err" : ""}>{rain ? "Active" : "Off"}</b></div>
      </div>
      <div className="reason mono">{known ? p.reason : "Predictions appear once the device reports readings."}</div>
    </Card>
  );
}

function Sensors() {
  const { sensors: s, history, tankPct, controls, calTank, tankCal } = useVerde();
  const moistTh = controls.moisture_threshold ?? 35;
  const tankTh = controls.tank_threshold ?? 15;
  const lightTh = controls.light_threshold ?? 35;
  const hasLux = s.lux !== undefined;
  const luxPct = Math.min(100, (s.lux ?? 0) / 10);
  const moist = moistureStatus(s.moisture, moistTh);
  const tank = tankStatus(tankPct, tankTh);
  return (
    <div className="sensor-grid">
      <SensorCard id="moisture" icon="drop" title="Soil moisture" source="GPIO 34 · continuous" status={moist} series={history.moisture}>
        <div className="reading-row">
          <Gauge value={s.moisture ?? 0} color={toneColor(moist.tone)} size={104} stroke={9}>
            <span className="gauge-v mono">{s.moisture ?? "—"}{s.moisture !== undefined && <small>%</small>}</span>
          </Gauge>
          <div className="reading-side">
            <span className="muted small">Water below</span>
            <b className="mono">{moistTh}%</b>
          </div>
        </div>
      </SensorCard>

      <SensorCard id="temperature" icon="thermo" title="Atmosphere" source="GPIO 4 · DHT11" status={tempStatus(s.temperature)} series={history.temperature}>
        <div className="dual">
          <div>
            <div className="big mono">{s.temperature ?? "—"}{s.temperature !== undefined && <small>°C</small>}</div>
            <div className="muted small">temperature</div>
          </div>
          <div>
            <div className="big mono">{s.humidity ?? "—"}{s.humidity !== undefined && <small>%</small>}</div>
            <div className="muted small">humidity</div>
          </div>
        </div>
        <Meter value={s.humidity ?? 0} color="var(--sky)" />
        <div className="inline-status muted small">humidity <StatusPill status={humidityStatus(s.humidity)} /></div>
      </SensorCard>

      <SensorCard id="lux" icon="sun" title="Lux intensity" source="GPIO 35 · LDR" status={luxStatus(luxPct, lightTh, hasLux)} series={history.lux}>
        <div className="big mono">{hasLux ? s.lux : "—"}{hasLux && <small>lx</small>}</div>
        {hasLux ? (
          <>
            <Meter value={luxPct} color="var(--violet)" />
            <div className="muted small">{Math.round(luxPct)}% of scale · dark below {lightTh}%</div>
          </>
        ) : (
          <div className="muted small">no light reading yet</div>
        )}
      </SensorCard>

      <SensorCard
        id="tank_level"
        icon="tank"
        title="Reservoir tank"
        source="calibrated in app"
        status={tank}
        series={history.tank_level}
        footer={
          <div className="cal-row">
            <button className="btn sm" onClick={() => calTank("empty")}>Set empty</button>
            <button className="btn sm" onClick={() => calTank("full")}>Set full</button>
            <button className="btn ghost sm" onClick={() => calTank("reset")} disabled={tankCal.empty === null && tankCal.full === null}>Reset</button>
          </div>
        }
      >
        <div className="reading-row">
          <Gauge value={tankPct ?? 0} color={toneColor(tank.tone)} size={104} stroke={9}>
            <span className="gauge-v mono">{tankPct === null ? "—" : Math.round(tankPct)}{tankPct !== null && <small>%</small>}</span>
          </Gauge>
          <div className="reading-side">
            <span className="muted small">raw {s.tank_level ?? "—"}%</span>
            <span className="muted small">lock at</span>
            <b className="mono">{tankTh}%</b>
          </div>
        </div>
      </SensorCard>
    </div>
  );
}

function Analytics() {
  const { history, controls } = useVerde();
  const series = history.moisture;
  const min = series.length ? Math.min(...series) : null;
  const max = series.length ? Math.max(...series) : null;
  const avg = series.length ? series.reduce((a, b) => a + b, 0) / series.length : null;
  const t = trend(series);
  const f = (n: number | null) => (n === null ? "—" : n.toFixed(1));
  return (
    <Card className="analytics" title="Soil moisture history" icon="drop" right={<span className="chip">{series.length} / 30 readings</span>}>
      <div className="stats-row">
        <div className="stat"><span>Latest</span><b className="mono">{series.at(-1) ?? "—"}{series.length ? "%" : ""}</b></div>
        <div className="stat"><span>Average</span><b className="mono">{f(avg)}{avg !== null && "%"}</b></div>
        <div className="stat"><span>Min / Max</span><b className="mono">{f(min)} / {f(max)}</b></div>
        <div className="stat"><span>Trend</span><b className={`mono delta-b ${t.dir}`}>{t.text}</b></div>
      </div>
      <LineChart values={series} color="#3ddc84" height={220} min={0} max={100} threshold={controls.moisture_threshold ?? 35} />
      <div className="legend mono">
        <span><i className="lg-line" /> soil moisture</span>
        <span><i className="lg-dash" /> threshold {controls.moisture_threshold ?? 35}%</span>
      </div>
    </Card>
  );
}

function ControlRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggles">
      <div className="toggle-l"><b>{label}</b><small>{hint}</small></div>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

function Controls() {
  const { controls: c, setCtrl } = useVerde();
  return (
    <Card title="Automation settings" icon="gauge" right={<span className="chip">Firebase controls</span>}>
      <ControlRow label="Pump manual mode" hint="off = automatic" checked={!!c.manual_mode} onChange={(v) => setCtrl("manual_mode", v)} />
      <ControlRow label="Pump on" hint="used in manual mode" checked={!!c.pump_state} onChange={(v) => setCtrl("pump_state", v)} />
      <ControlRow label="Light manual mode" hint="off = automatic" checked={!!c.light_manual_mode} onChange={(v) => setCtrl("light_manual_mode", v)} />
      <ControlRow label="Grow light on" hint="used in manual mode" checked={!!c.grow_light_state} onChange={(v) => setCtrl("grow_light_state", v)} />
      <ControlRow label="☔ Rain override" hint="blocks auto-watering" checked={c.weather_override === 1} onChange={(v) => setCtrl("weather_override", v ? 1 : 0)} />

      <div className="divider" />
      <Threshold label="Moisture threshold" hint="water when soil is drier than this" value={c.moisture_threshold} fallback={35} min={0} max={80} step={5} tone="var(--green)" onCommit={(v) => setCtrl("moisture_threshold", v)} />
      <Threshold label="Tank lock" hint="0 = off · pump blocked below this" value={c.tank_threshold} fallback={15} min={0} max={40} step={5} tone="var(--red)" onCommit={(v) => setCtrl("tank_threshold", v)} />
      <Threshold label="Light threshold" hint="below this = dark → LED on" value={c.light_threshold} fallback={35} min={0} max={90} step={5} tone="var(--violet)" onCommit={(v) => setCtrl("light_threshold", v)} />
    </Card>
  );
}

function DeviceHealth() {
  const { sensors: s, pollState, latestScan } = useVerde();
  const rows: [string, string][] = [
    ["Supply voltage sag", s.voltage_sag !== undefined ? `${s.voltage_sag} V` : "—"],
    ["Uploads ok / failed", s.successful_uploads !== undefined || s.failed_uploads !== undefined ? `${s.successful_uploads ?? 0} / ${s.failed_uploads ?? 0}` : "—"],
    ["Raw light", `${s.light ?? "—"}`],
    ["Watchdog", s.watchdog_status ?? "—"],
    ["Last CAM frame", latestScan.captured_at ? new Date(latestScan.captured_at).toLocaleTimeString("en-GB") : "—"],
    ["Link", pollState],
  ];
  return (
    <Card title="Device health" icon="shield">
      <div className="kv">
        {rows.map(([k, v]) => (
          <div key={k}><span>{k}</span><b className="mono">{v}</b></div>
        ))}
      </div>
    </Card>
  );
}

function ActivityCard() {
  const { activity } = useVerde();
  return (
    <Card title="Activity log" icon="terminal">
      <Terminal lines={activity} height={230} />
    </Card>
  );
}

function ConsoleBanner() {
  const { sensors, tankPct, pollState } = useVerde();
  const display = (value: number | undefined | null, unit = "") => value === null || value === undefined ? "--" : `${Math.round(value)}${unit}`;
  const state = pollState === "live" ? "SYSTEM ONLINE" : pollState === "offline" ? "AWAITING LINK" : "CONNECTING";
  return (
    <section className="console-banner" aria-label="VERDE system overview">
      <span className="banner-scan" aria-hidden="true" />
      <div className="banner-topline">
        <span className="banner-wordmark"><i className="banner-indicator" /> VERDE / PLANT SYSTEMS</span>
        <span className={`banner-state ${pollState}`}>{state}</span>
      </div>
      <div className="banner-copy">
        <p className="banner-kicker">01 — AUTONOMOUS AGRICULTURE</p>
        <h2 className="banner-heading">
          <span className="banner-outline">WE GROW</span>
          <span>THE FUTURE<span className="banner-period">.</span></span>
        </h2>
        <p className="banner-subtitle">Plant intelligence · live telemetry · Delhi, India</p>
      </div>
      <div className="banner-readouts" aria-label="Current sensor readings">
        <div><span>SOIL MOISTURE</span><b>{display(sensors.moisture, "%")}</b></div>
        <div><span>AIR TEMPERATURE</span><b>{display(sensors.temperature, "°C")}</b></div>
        <div><span>RESERVOIR</span><b>{display(tankPct, "%")}</b></div>
        <div><span>CANOPY LIGHT</span><b>{display(sensors.lux, " lx")}</b></div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { pingDB, checkWeather, triggerCamCapture, startedAt, status } = useVerde();
  return (
    <div className="page-body">
      <ConsoleBanner />
      <div className="actionbar">
        <button className="btn sm" onClick={() => void pingDB()}><Icon name="pulse" size={14} /> Ping Firebase</button>
        <button className="btn sm" onClick={() => void checkWeather(true)}><Icon name="cloud" size={14} /> Weather now</button>
        <button className="btn sm" onClick={() => void triggerCamCapture()}><Icon name="camera" size={14} /> Capture</button>
        <span className="grow" />
        {status.db && <span className={`mono small ${status.db.ok ? "ok" : "err"}`}>{status.db.text}</span>}
        <Uptime startedAt={startedAt} />
      </div>

      <div className="dash-grid">
        <div className="c-8"><Vitality /></div>
        <div className="c-4"><Actuators /></div>
        <section className="c-12 sensor-section" aria-labelledby="sensor-overview-title">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Live telemetry</div>
              <h2 id="sensor-overview-title">Sensor overview</h2>
            </div>
            <span className="section-caption">Live updates · adaptive retry when offline · select a tile for history</span>
          </div>
          <Sensors />
        </section>
        <div className="c-8"><Analytics /></div>
        <div className="c-4"><Controls /></div>
        <div className="c-7"><Shell /></div>
        <div className="c-5 stack">
          <DeviceHealth />
          <ActivityCard />
        </div>
      </div>
    </div>
  );
}
