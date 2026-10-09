// OpenWeather current conditions + 5-day forecast for the configured city.
import { WEATHER_CITY } from "@/lib/config";
import { env, fail, HttpError } from "@/lib/server/env";
import type { ForecastDay, WeatherResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type OwmWeather = { id: number; main: string; description: string };
type OwmCurrent = {
  cod: number | string;
  message?: string;
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: OwmWeather[];
};
type OwmForecast = {
  city?: { timezone?: number };
  list?: { dt: number; main: { temp_min: number; temp_max: number }; weather: OwmWeather[] }[];
};

/** Collapse 3-hourly entries into one row per city-local day (noon icon). */
function buildForecast(fc: OwmForecast): ForecastDay[] {
  const tz = fc.city?.timezone ?? 0; // seconds offset from UTC
  const days = new Map<
    string,
    { min: number; max: number; id: number; main: string; description: string; dist: number }
  >();

  for (const item of fc.list ?? []) {
    const local = new Date((item.dt + tz) * 1000);
    const key = local.toISOString().slice(0, 10);
    const hour = local.getUTCHours();
    const w = item.weather[0];
    const day = days.get(key) ?? {
      min: Infinity,
      max: -Infinity,
      id: w.id,
      main: w.main,
      description: w.description,
      dist: Infinity,
    };
    day.min = Math.min(day.min, item.main.temp_min);
    day.max = Math.max(day.max, item.main.temp_max);
    const dist = Math.abs(hour - 13);
    if (dist < day.dist) {
      day.dist = dist;
      day.id = w.id;
      day.main = w.main;
      day.description = w.description;
    }
    days.set(key, day);
  }

  return [...days.entries()].slice(0, 5).map(([date, d]) => ({
    date,
    min: Math.round(d.min),
    max: Math.round(d.max),
    id: d.id,
    main: d.main,
    description: d.description,
  }));
}

export async function GET() {
  try {
    const key = env("OPENWEATHER_API_KEY");
    const base = "https://api.openweathermap.org/data/2.5";
    const q = `q=${encodeURIComponent(WEATHER_CITY)}&units=metric&appid=${key}`;

    const [curRes, fcRes] = await Promise.all([
      fetch(`${base}/weather?${q}`, { cache: "no-store" }),
      fetch(`${base}/forecast?${q}`, { cache: "no-store" }),
    ]);

    const cur = (await curRes.json().catch(() => ({}))) as OwmCurrent;
    if (Number(cur.cod) !== 200 || !cur.weather?.[0]) {
      throw new HttpError(502, cur.message ?? `OpenWeather error (${cur.cod ?? curRes.status})`);
    }

    const fc = fcRes.ok ? ((await fcRes.json()) as OwmForecast) : {};
    const body: WeatherResponse = {
      current: {
        city: cur.name || WEATHER_CITY,
        temp: Math.round(cur.main.temp),
        feels_like: Math.round(cur.main.feels_like),
        humidity: cur.main.humidity,
        wind_speed: cur.wind.speed,
        condition: cur.weather[0].main,
        description: cur.weather[0].description,
        id: cur.weather[0].id,
      },
      forecast: buildForecast(fc),
    };
    return Response.json(body);
  } catch (e) {
    return fail(e);
  }
}
