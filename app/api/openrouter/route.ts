// OpenRouter chat completions (sensor-aware assistant).
import { env, fail, HttpError } from "@/lib/server/env";
import type { ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) throw new HttpError(400, "No messages");

    const key = env("OPENROUTER_API_KEY");
    const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "VERDE OS",
      },
      body: JSON.stringify({ model, messages }),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    const text = j.choices?.[0]?.message?.content;
    if (!res.ok || text === undefined) {
      throw new HttpError(res.status || 502, j.error?.message ?? "OpenRouter request failed");
    }
    return Response.json({ text });
  } catch (e) {
    return fail(e);
  }
}
