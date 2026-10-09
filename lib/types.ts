export type Sensors = {
  moisture?: number;
  temperature?: number;
  humidity?: number;
  tank_level?: number;
  lux?: number;
  light?: number;
  voltage_sag?: number;
  successful_uploads?: number;
  failed_uploads?: number;
  watchdog_status?: string;
};

export type Controls = {
  manual_mode?: boolean;
  pump_state?: boolean;
  light_manual_mode?: boolean;
  grow_light_state?: boolean;
  weather_override?: number;
  capture_photo?: boolean;
  moisture_threshold?: number;
  tank_threshold?: number;
  light_threshold?: number;
};

export type LatestScan = { imageUrl?: string; captured_at?: string | number };

export type RootDoc = {
  sensors?: Sensors;
  controls?: Controls;
  latest_scan?: LatestScan;
  [key: string]: unknown;
};

export type AppImage = { src: string; source: "cam" | "user"; name: string };

export type Suggestion = {
  name: string;
  probability: number;
  details?: {
    common_names?: string[];
    treatment?: { biological?: string[]; prevention?: string[] };
  };
};

export type PlantIdResponse = {
  result?: {
    crop?: { suggestions?: Suggestion[] };
    disease?: { suggestions?: Suggestion[] };
  };
};

export type Analysis = {
  src: string | null;
  status: "idle" | "loading" | "ok" | "err";
  crops: Suggestion[];
  diseases: Suggestion[];
  message?: string;
};

export type PlantResult = { name: string; prob: number; common?: string };

export type WeatherCurrent = {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  description: string;
  id: number;
};

export type ForecastDay = {
  date: string; // YYYY-MM-DD (city local)
  min: number;
  max: number;
  id: number;
  main: string;
  description: string;
};

export type WeatherResponse = { current: WeatherCurrent; forecast: ForecastDay[] };

export type ChatRole = "user" | "ai" | "sys" | "err";
export type ChatLine = { id: number; role: ChatRole; text: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
