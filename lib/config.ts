// Client-safe constants. Secrets never live here — see .env.example and /app/api/*.

export const APP_VERSION = "FINAL-DEMO-v1.0";
export const POLL_MS = 3000; // Firebase poll interval
export const WEATHER_CITY = "Delhi";
export const WEATHER_INTERVAL_MS = 10 * 60 * 1000; // auto weather check every 10 min
export const HISTORY_LEN = 30; // readings kept for the moisture chart / sparklines
export const HOVER_LEN = 10; // readings shown in hover + expanded graphs
export const CAM_HOLD_MS = 4000; // capture_photo stays true this long, then resets
export const EXPECT_PHOTO_MS = 60_000; // window in which the next CAM frame counts as "new"
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const SENSOR_META = {
  moisture: { label: "Moisture", unit: "%", color: "#22c55e" },
  temperature: { label: "Temperature", unit: "°C", color: "#f59e0b" },
  humidity: { label: "Humidity", unit: "%", color: "#38bdf8" },
  tank_level: { label: "Tank level", unit: "%", color: "#a855f7" },
  lux: { label: "Lux", unit: " lx", color: "#facc15" },
  voltage_sag: { label: "Voltage sag", unit: " V", color: "#f87171" },
} as const;

export type HistoryKey = keyof typeof SENSOR_META;
export const HISTORY_KEYS = Object.keys(SENSOR_META) as HistoryKey[];
