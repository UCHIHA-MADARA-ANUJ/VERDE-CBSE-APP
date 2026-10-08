# VERDE-CBSE-APP — VERDE OS (Next.js)

Next.js (App Router) rebuild of the VERDE "FINAL APP" single-page dashboard. It keeps every
feature, API call and calculation of the original and moves all secrets to the server.

## Features

- **Live ESP32 telemetry** from Firebase Realtime Database (polled every 3 s): moisture, temperature,
  humidity, tank, lux, light, voltage, upload counters.
- **Hover mini-graphs and click-to-expand graphs** (last 10 readings) on each sensor tile, sparklines with trend,
  and a 30-point moisture history chart with the threshold line.
- **Tank calibration** in the browser (set empty / full / reset, no reflash needed).
- **Controls**: pump and grow-light AUTO/MANUAL, pump state, grow light, rain override, and three
  thresholds (moisture, tank lock, light). Actuator states are predicted by the app; the ESP32 is not touched.
- **Weather auto-override** for Delhi (OpenWeather): checks on load and every 10 min, writes `/weather`
  to Firebase, and sets `/controls/weather_override` when rain/drizzle/snow/storm is expected. 5-day forecast.
- **Plant Doctor**: capture a CAM photo (`/controls/capture_photo`), auto-detect new CAM frames from
  `/latest_scan`, analyse CAM or uploaded photos with Crop.health (crop + disease + treatment).
- **Gemini image chat** (image + live telemetry context, with conversation memory).
- **Sensor-aware OpenRouter chat** (live sensors, controls, predictions, weather and last plant result as context).
- Toasts, activity log, fullscreen, Esc-to-close, responsive layout.

## Architecture

```
browser (React)  ──►  /api/db       ──► Firebase RTDB   (secret stays on server; path/field whitelist)
                 ──►  /api/weather  ──► OpenWeather
                 ──►  /api/gemini   ──► Google Gemini   (image fetched + inlined server-side)
                 ──►  /api/openrouter ─► OpenRouter
                 ──►  /api/plant-id ──► Crop.health / Plant.id
```

No API key is ever shipped to the browser.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Required variables (see `.env.example`):

| Variable | Used for |
| --- | --- |
| `FIREBASE_DB_HOST`, `FIREBASE_DB_SECRET` | Firebase Realtime Database |
| `GEMINI_API_KEY` (`GEMINI_MODEL`) | Gemini chat |
| `OPENWEATHER_API_KEY` | Weather + forecast |
| `OPENROUTER_API_KEY` (`OPENROUTER_MODEL`) | Sensor-aware chat |
| `PLANTID_API_KEY` | Crop.health identification |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`.

## Security notes

- `.env*` files are git-ignored (only `.env.example` is committed).
- `/api/db` only reads `/`, `/sensors`, `/controls`, `/weather`, `/latest_scan`, and only writes
  whitelisted fields to `/controls` and `/weather`.
- Image URLs passed to the server must be public `https://` addresses (private/localhost addresses are refused).
- The app itself has **no login**. Anyone who can reach the deployed URL can change pump and light
  controls. Add authentication before exposing it publicly.
