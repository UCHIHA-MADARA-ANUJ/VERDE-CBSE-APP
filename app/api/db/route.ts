// Firebase Realtime Database proxy. The DB secret stays on the server.
// Only the nodes/fields the app actually uses are readable or writable.
import { env, fail, HttpError } from "@/lib/server/env";

export const dynamic = "force-dynamic";

const READ_PATHS = new Set(["/", "/sensors", "/controls", "/weather", "/latest_scan"]);

const WRITE_FIELDS: Record<string, Set<string>> = {
  "/controls": new Set([
    "manual_mode",
    "pump_state",
    "light_manual_mode",
    "grow_light_state",
    "weather_override",
    "capture_photo",
    "moisture_threshold",
    "tank_threshold",
    "light_threshold",
  ]),
  "/weather": new Set([
    "city",
    "temp",
    "condition",
    "description",
    "humidity",
    "wind_speed",
    "rain_expected",
    "status",
    "synced_at",
  ]),
};

function dbUrl(path: string): string {
  const host = env("FIREBASE_DB_HOST");
  const secret = env("FIREBASE_DB_SECRET");
  return `https://${host}${path}.json?auth=${encodeURIComponent(secret)}`;
}

export async function GET(req: Request) {
  try {
    const path = new URL(req.url).searchParams.get("path") ?? "/";
    if (!READ_PATHS.has(path)) throw new HttpError(403, `Read not allowed: ${path}`);
    const res = await fetch(dbUrl(path), { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new HttpError(res.status, body?.error ?? `Firebase read failed (HTTP ${res.status})`);
    return Response.json(body ?? {});
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { path, data } = (await req.json().catch(() => ({}))) as {
      path?: string;
      data?: Record<string, unknown>;
    };
    const allowed = path ? WRITE_FIELDS[path] : undefined;
    if (!path || !allowed) throw new HttpError(403, `Write not allowed: ${path ?? "(none)"}`);
    if (!data || typeof data !== "object") throw new HttpError(400, "Missing data");

    const clean = Object.fromEntries(
      Object.entries(data).filter(
        ([k, v]) =>
          allowed.has(k) &&
          (typeof v === "number" || typeof v === "boolean" || typeof v === "string"),
      ),
    );
    if (Object.keys(clean).length === 0) throw new HttpError(400, "No allowed fields in payload");

    const res = await fetch(dbUrl(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new HttpError(res.status, body?.error ?? `Firebase write failed (HTTP ${res.status})`);
    }
    return Response.json(body);
  } catch (e) {
    return fail(e);
  }
}
