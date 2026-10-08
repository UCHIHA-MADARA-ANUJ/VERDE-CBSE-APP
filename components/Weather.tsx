"use client";

import { useEffect, useState } from "react";
import { WEATHER_CITY, WEATHER_INTERVAL_MS } from "@/lib/config";
import { weatherEmoji } from "@/lib/logic";
import { useVerde } from "./VerdeProvider";
import { Card } from "./ui";

function Countdown({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (at === null) return <>--</>;
  const left = Math.max(0, Math.round((at - now) / 1000));
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return <>{`${m}:${s}`}</>;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function Weather() {
  const { weather, checkWeather, status, testWeather, rain } = useVerde();
  const cur = weather.current;
  const icon = cur ? weatherEmoji(cur.id, cur.condition) : "⛅";

  return (
    <div className="page-body">
      <div className="grid">
        <Card
          span2
          title={
            <>
              🌦️ Weather auto-override
              {weather.rain && <span className="pill-rain">☔ RAIN</span>}
            </>
          }
          right={<span className="muted mono small">every {WEATHER_INTERVAL_MS / 60000} min</span>}
        >
          <div className="wx-hero">
            <div className="wx-icon">{icon}</div>
            <div className="wx-main">
              <div className="wx-city">{cur ? `${cur.city} — ${cur.condition}` : `${WEATHER_CITY} — checking…`}</div>
              <div className="mono small muted">
                {cur
                  ? `humidity ${cur.humidity}% · wind ${cur.wind_speed} m/s · feels like ${cur.feels_like}°C`
                  : "temp · humidity · wind"}
              </div>
            </div>
            <div className="wx-temp">{cur ? `${cur.temp}°C` : "--°C"}</div>
          </div>

          {weather.error ? (
            <div className="decision bad">❌ {weather.error}</div>
          ) : cur ? (
            <div className={`decision ${weather.rain ? "bad" : "good"}`}>
              {weather.rain ? (
                <>☔ <b>Rain detected</b> ({cur.description}) — <b>weather_override = 1</b>, auto-watering suspended.</>
              ) : (
                <>✅ No rain expected ({cur.description}) — watering allowed, auto-override OFF.</>
              )}
            </div>
          ) : (
            <div className="decision">Auto-checking {WEATHER_CITY} weather — will set rain override automatically.</div>
          )}

          <div className="kv">
            <div className="row"><span className="row-l"><span>🌧️ Rain override (auto-set)</span><small>app writes /controls/weather_override</small></span><span className={`mono ${rain ? "err" : "ok"}`}>{rain ? "ON (auto)" : "OFF"}</span></div>
            <div className="row"><span className="row-l"><span>Last check</span></span><span className="mono small">{weather.lastCheck ?? "--"}</span></div>
            <div className="row"><span className="row-l"><span>Next auto-check</span><small>countdown</small></span><span className="mono small"><Countdown at={weather.nextCheckAt} /></span></div>
          </div>

          <div className="btn-row">
            <button className="btn green wide" onClick={() => void checkWeather(true)} disabled={weather.loading}>
              {weather.loading ? "⏳ CHECKING…" : "🔍 CHECK WEATHER NOW"}
            </button>
          </div>

          <div className="section-label">📅 5-day forecast · {WEATHER_CITY}</div>
          <div className="forecast">
            {weather.forecast.length === 0 && <span className="muted mono small">check weather to load…</span>}
            {weather.forecast.map((d) => (
              <div className="fc-chip" key={d.date} title={d.description}>
                <div className="day">{dayLabel(d.date)}</div>
                <div className="ico">{weatherEmoji(d.id, d.main)}</div>
                <div className="tmp">{d.max}° / {d.min}°</div>
              </div>
            ))}
          </div>

          <div className="card-foot">
            <button className="btn" onClick={() => void testWeather()}>🧪 Test weather API</button>
            {status.weather && <span className={`api-res ${status.weather.ok ? "ok" : "err"}`}>{status.weather.text}</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}
