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

/** Telemetry card: title + source, big reading, status, sparkline. Click → expanded graph. */
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
      {series && (
        <div className="sensor-spark">
          <LineChart values={series.slice(-HOVER_LEN)} color={color} height={44} grid={false} />
          {t && <div className={`delta ${t.dir}`}>{t.text} <span className="muted">· last {HOVER_LEN}</span></div>}
        </div>
      )}
      {footer && <div className="sensor-foot" onClick={(e) => e.stopPropagation()}>{footer}</div>}
    </article>
  );
}

function Vitality() {
  const { sensors, controls, tankPct, pollState } = useVerde();
  const v = vitality(sensors, controls, tankPct);
  const score = v?.score ?? null;
  const color = score === null ? "var(--dim)" : score >= 80 ? "var(--green)" : score >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <Card className="hero" title="Sensory telemetry overview" icon="pulse" right={<Badge tone={pollState === "live" ? "ok" : pollState === "offline" ? "bad" : "warn"}>{pollState === "live" ? "live" : pollState}</Badge>}>
      <div className="hero-body">
        <Gauge value={score ?? 0} color={color} size={156} stroke={12}>
          <div className="vit-score mono" style={{ color }}>{score === null ? "--" : `${score}%`}</div>
          <div className="vit-label">Vitality</div>
        </Gauge>
        <div className="hero-info">
          <p className="lede">Live readings from your WROOM-32 platform, scored against your thresholds.</p>
          {v === null ? (
            <p className="muted">Waiting for sensor data…</p>
          ) : v.issues.length === 0 ? (
            <p className="ok-line"><Icon name="shield" size={16} /> All readings are within range.</p>
          ) : (
            <ul className="issues">
              {v.issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}
          <p className="fine muted">Vitality is derived by this app from thresholds, not measured by the device.</p>
        </div>
      </div>
    </Card>
  );
}

function Actuators() {
  const { prediction, controls, rain } = useVerde();
  const p = prediction;
  return (
    <Card title="Actuator states" icon="bolt" right={<span className="chip">predicted</span>}>
      <div className="actuators">
        <div className={`act ${p.pump ? "on" : ""}`} style={{ ["--act" as string]: "var(--sky)" }}>
          <Icon name="drop" size={22} />
          <div className="act-k">Pump</div>
          <div className="act-v">{p.pump ? "ON" : "OFF"}</div>
        </div>
        <div className={`act ${p.light ? "on" : ""}`} style={{ ["--act" as string]: "var(--violet)" }}>
          <Icon name="sun" size={22} />
          <div className="act-k">Grow light</div>
          <div className="act-v">{p.light ? "ON" : "OFF"}</div>
        </div>
      </div>
      <div className="kv">
        <div><span>Pump mode</span><b>{controls.manual_mode ? "Manual" : "Auto"}</b></div>
        <div><span>Light mode</span><b>{controls.light_manual_mode ? "Manual" : "Auto"}</b></div>
        <div><span>Rain override</span><b className={rain ? "err" : ""}>{rain ? "Active" : "Off"}</b></div>
      </div>
      <div className="reason mono">{p.reason}</div>
    </Card>
  );
}

function Sensors() {
  const { sensors: s, history, tankPct, controls, calTank, tankCal } = useVerde();
  const moistTh = controls.moisture_threshold ?? 35;
  const tankTh = controls.tank_threshold ?? 15;
  const lightTh = controls.light_threshold ?? 35;
  const luxPct = Math.min(100, (s.lux ?? 0) / 10);
  return (
    <div className="sensor-grid">
      <SensorCard
        id="moisture"
        icon="drop"
        title="Soil moisture"
        source="GPIO 34 · continuous read"
        status={moistureStatus(s.moisture, moistTh)}
        series={history.moisture}
      >
        <div className="reading-row">
          <Gauge value={s.moisture ?? 0} color={toneColor(moistureStatus(s.moisture, moistTh).tone)} size={96} stroke={9}>
            <span className="gauge-v mono">{s.moisture ?? "--"}<small>%</small></span>
          </Gauge>
          <div className="reading-side">
            <div className="muted small">Threshold</div>
            <div className="mono">{moistTh}%</div>
          </div>
        </div>
      </SensorCard>

      <SensorCard
        id="temperature"
        icon="thermo"
        title="Atmosphere"
        source="GPIO 4 · DHT11 core"
        status={tempStatus(s.temperature)}
        series={history.temperature}
      >
        <div className="dual">
          <div>
            <div className="big mono">{s.temperature ?? "--"}<small>°C</small></div>
            <div className="muted small">temperature</div>
          </div>
          <div>
            <div className="big mono">{s.humidity ?? "--"}<small>%</small></div>
            <div className="muted small">humidity</div>
          </div>
        </div>
        <div className="meter-row">
          <Meter value={s.humidity ?? 0} color="var(--sky)" />
        </div>
        <div className="muted small">Humidity <StatusPill status={humidityStatus(s.humidity)} /></div>
      </SensorCard>

      <SensorCard
        id="lux"
        icon="sun"
        title="Lux intensity"
        source="GPIO 35 · analog LDR"
        status={luxStatus(luxPct, lightTh, s.lux !== undefined)}
        series={history.lux}
      >
        <div className="big mono">{s.lux ?? "--"}<small>lx</small></div>
        <div className="meter-row"><Meter value={luxPct} color="var(--violet)" /></div>
        <div className="muted small">{Math.round(luxPct)}% of scale · dark below {lightTh}%</div>
      </SensorCard>

      <SensorCard
        id="tank_level"
        icon="tank"
        title="Reservoir tank"
        source="calibrated in app · no reflash"
        status={tankStatus(tankPct, tankTh)}
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
          <Gauge value={tankPct ?? 0} color={toneColor(tankStatus(tankPct, tankTh).tone)} size={96} stroke={9}>
            <span className="gauge-v mono">{tankPct === null ? "--" : Math.round(tankPct)}<small>%</small></span>
          </Gauge>
          <div className="reading-side">
            <div className="muted small">raw</div>
            <div className="mono">{s.tank_level ?? "--"}%</div>
            <div className="muted small">lock at</div>
            <div className="mono">{tankTh}%</div>
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
  const f = (n: number | null) => (n === null ? "--" : n.toFixed(1));
  return (
    <Card className="analytics" title="Soil hydration analytics" icon="drop" right={<span className="chip">last {series.length} readings</span>}>
      <div className="stats-row">
        <div className="stat"><span>Latest</span><b className="mono">{series.at(-1) ?? "--"}%</b></div>
        <div className="stat"><span>Average</span><b className="mono">{f(avg)}%</b></div>
        <div className="stat"><span>Min / Max</span><b className="mono">{f(min)} / {f(max)}</b></div>
        <div className="stat"><span>Trend</span><b className={`mono delta-b ${t.dir}`}>{t.text}</b></div>
      </div>
      <LineChart
        values={series}
        color="#3ddc84"
        height={210}
        min={0}
        max={100}
        threshold={controls.moisture_threshold ?? 35}
      />
      <div className="legend mono">
        <span><i className="lg-line" /> soil moisture</span>
        <span><i className="lg-dash" /> threshold {controls.moisture_threshold ?? 35}%</span>
      </div>
    </Card>
  );
}

function Controls() {
  const { controls: c, setCtrl } = useVerde();
  return (
    <Card title="Controls" icon="gauge" right={<span className="chip">live</span>}>
      <div className="toggles">
        <Toggle label="Pump manual mode" checked={!!c.manual_mode} onChange={(v) => setCtrl("manual_mode", v)} />
        <div className="toggle-l"><b>Pump manual mode</b><small>off = automatic</small></div>
      </div>
      <div className="toggles">
        <Toggle label="Pump state" checked={!!c.pump_state} onChange={(v) => setCtrl("pump_state", v)} />
        <div className="toggle-l"><b>Pump on</b><small>used in manual mode</small></div>
      </div>
      <div className="toggles">
        <Toggle label="Light manual mode" checked={!!c.light_manual_mode} onChange={(v) => setCtrl("light_manual_mode", v)} />
        <div className="toggle-l"><b>Light manual mode</b><small>off = automatic</small></div>
      </div>
      <div className="toggles">
        <Toggle label="Grow light" checked={!!c.grow_light_state} onChange={(v) => setCtrl("grow_light_state", v)} />
        <div className="toggle-l"><b>Grow light on</b><small>used in manual mode</small></div>
      </div>
      <div className="toggles">
        <Toggle label="Rain override" checked={c.weather_override === 1} onChange={(v) => setCtrl("weather_override", v ? 1 : 0)} />
        <div className="toggle-l"><b>☔ Rain override</b><small>blocks auto-watering</small></div>
      </div>

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
    ["Supply voltage sag", s.voltage_sag !== undefined ? `${s.voltage_sag} V` : "--"],
    ["Uploads ok / failed", `${s.successful_uploads ?? 0} / ${s.failed_uploads ?? 0}`],
    ["Raw light", `${s.light ?? "--"}`],
    ["Watchdog", s.watchdog_status ?? "--"],
    ["Last CAM frame", latestScan.captured_at ? new Date(latestScan.captured_at).toLocaleTimeString("en-GB") : "--"],
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

export default function Dashboard() {
  const { pingDB, checkWeather, triggerCamCapture, startedAt, status } = useVerde();
  return (
    <div className="page-body">
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
        <div className="c-12"><Sensors /></div>
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
