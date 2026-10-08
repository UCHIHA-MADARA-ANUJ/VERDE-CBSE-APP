// Gemini (gemini-flash-latest by default) with optional inline image.
import { env, fail, HttpError } from "@/lib/server/env";
import { loadImage } from "@/lib/server/image";

export const dynamic = "force-dynamic";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

export async function POST(req: Request) {
  try {
    const { prompt, imageSrc } = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      imageSrc?: string;
    };
    if (!prompt?.trim()) throw new HttpError(400, "Empty prompt");

    const key = env("GEMINI_API_KEY");
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

    const parts: Record<string, unknown>[] = [];
    if (imageSrc) {
      const img = await loadImage(imageSrc);
      parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
    }
    parts.push({ text: prompt });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts }] }),
        cache: "no-store",
      },
    );
    const j = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (!res.ok || !j.candidates) {
      throw new HttpError(res.status || 502, j.error?.message ?? "Gemini request failed");
    }
    const text = (j.candidates[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return Response.json({ text: text || "(empty response)" });
  } catch (e) {
    return fail(e);
  }
}
