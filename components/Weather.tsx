"use client";

import { useEffect, useState } from "react";
import { WEATHER_CITY, WEATHER_INTERVAL_MS } from "@/lib/config";
import { weatherEmoji } from "@/lib/logic";
import { useVerde } from "./VerdeProvider";
import { Badge, Card, Icon, StatusPill } from "./ui";

function Countdown({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (at === null) return <>--</>;
  const left = Math.max(0, Math.round((at - now) / 1000));
  return <>{`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</>;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function Weather() {
  const { weather, checkWeather, status, testWeather, rain } = useVerde();
  const cur = weather.current;
  const icon = cur ? weatherEmoji(cur.id, cur.condition) : "⛅";

  return (
    <div className="page-body">
      <div className="dash-grid">
        <div className="c-8">
          <Card className="wx-hero-card" title={`${WEATHER_CITY} · live conditions`} icon="cloud" right={<Badge tone={weather.rain ? "bad" : "ok"}>{weather.rain ? "rain expected" : "no rain"}</Badge>}>
            <div className="wx-hero">
              <div className="wx-icon" aria-hidden="true">{icon}</div>
              <div className="wx-main">
                <div className="wx-temp mono">{cur ? cur.temp : "--"}<small>°C</small></div>
                <div className="wx-cond">{cur ? cur.description : "Checking…"}</div>
                <div className="muted small">{cur ? `${cur.city} · feels like ${cur.feels_like}°C` : WEATHER_CITY}</div>
              </div>
            </div>
            <div className="metrics">
              <div className="metric"><Icon name="drop" size={16} /><span>Humidity</span><b className="mono">{cur ? `${cur.humidity}%` : "--"}</b></div>
              <div className="metric"><Icon name="flame" size={16} /><span>Wind</span><b className="mono">{cur ? `${cur.wind_speed} m/s` : "--"}</b></div>
              <div className="metric"><Icon name="thermo" size={16} /><span>Feels like</span><b className="mono">{cur ? `${cur.feels_like}°C` : "--"}</b></div>
            </div>

            {weather.error ? (
              <div className="decision bad">⚠ {weather.error}</div>
            ) : cur ? (
              <div className={`decision ${weather.rain ? "bad" : "good"}`}>
                {weather.rain
                  ? <>Rain detected — <b>weather override set to ON</b>, auto-watering is suspended.</>
                  : <>No rain expected — watering allowed, auto override is OFF.</>}
              </div>
            ) : (
              <div className="decision">Auto-checking {WEATHER_CITY} weather. The rain override is set automatically.</div>
            )}

            <div className="section-label">5-day forecast</div>
            <div className="forecast">
              {weather.forecast.length === 0 && <span className="muted small">Run a check to load the forecast.</span>}
              {weather.forecast.map((d) => (
                <div className="fc" key={d.date} title={d.description}>
                  <div className="fc-day">{dayLabel(d.date)}</div>
                  <div className="fc-ico">{weatherEmoji(d.id, d.main)}</div>
                  <div className="fc-max mono">{d.max}°</div>
                  <div className="fc-min mono">{d.min}°</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="c-4 stack">
          <Card title="Rain override" icon="shield">
            <div className="kv">
              <div><span>Override (auto)</span><b className={rain ? "err" : "ok"}>{rain ? "ON" : "OFF"}</b></div>
              <div><span>Last check</span><b className="mono">{weather.lastCheck ?? "--"}</b></div>
              <div><span>Next auto-check</span><b className="mono"><Countdown at={weather.nextCheckAt} /></b></div>
              <div><span>Interval</span><b className="mono">every {WEATHER_INTERVAL_MS / 60000} min</b></div>
            </div>
            <button className="btn green wide" onClick={() => void checkWeather(true)} disabled={weather.loading}>
              <Icon name="refresh" size={15} /> {weather.loading ? "Checking…" : "Check weather now"}
            </button>
          </Card>

          <Card title="Rain rules" icon="drop">
            <p className="muted small">Thunderstorm, drizzle, rain and snow set the override ON. Clear and cloudy skies set it OFF.</p>
            <div className="rules">
              <span><i className="dot bad" />Storm · drizzle · rain · snow</span>
              <span><i className="dot ok" />Clear · clouds · mist</span>
            </div>
          </Card>

          <Card title="Diagnostics" icon="pulse">
            <button className="btn sm" onClick={() => void testWeather()}>Test weather API</button>
            {status.weather && (
              <div className={`api-line ${status.weather.ok ? "ok" : "err"}`}>{status.weather.text}</div>
            )}
            <div className="status-list"><span className="muted small">Weather sync</span><StatusPill status={{ label: weather.error ? "Error" : cur ? "Synced" : "Pending", tone: weather.error ? "bad" : cur ? "ok" : "idle" }} /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
