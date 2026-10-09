// Browser-side client. Every call goes to a Next.js route handler; no API keys are used here.
import type {
  ChatMessage,
  PlantIdResponse,
  RootDoc,
  WeatherResponse,
} from "./types";

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error ?? data.message ?? `HTTP ${res.status}`));
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  /** Whole Firebase RTDB root: sensors, controls, latest_scan. */
  root: () => request<RootDoc>("/api/db?path=/"),

  /** PATCH a whitelisted Firebase node (/controls or /weather). */
  patch: (path: "/controls" | "/weather", data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/db", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, data }),
    }),

  /** OpenWeather current + 5-day forecast for Delhi. */
  weather: () => request<WeatherResponse>("/api/weather"),

  /** Gemini with optional image (data URL or https URL). */
  gemini: (prompt: string, imageSrc?: string) =>
    request<{ text: string }>("/api/gemini", json({ prompt, imageSrc })),

  /** OpenRouter chat completion. */
  openrouter: (messages: ChatMessage[]) =>
    request<{ text: string }>("/api/openrouter", json({ messages })),

  /** Crop.health (Plant.id) identification. */
  plantId: (imageSrc: string) =>
    request<PlantIdResponse>("/api/plant-id", json({ imageSrc })),
};
