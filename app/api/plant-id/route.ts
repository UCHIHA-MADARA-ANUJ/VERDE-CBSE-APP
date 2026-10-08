// Crop.health (Plant.id / kindwise) identification with crop + disease suggestions.
import { env, fail, HttpError } from "@/lib/server/env";
import { loadImage } from "@/lib/server/image";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { imageSrc } = (await req.json().catch(() => ({}))) as { imageSrc?: string };
    if (!imageSrc) throw new HttpError(400, "No image");

    const key = env("PLANTID_API_KEY");
    const img = await loadImage(imageSrc);

    const res = await fetch(
      "https://crop.kindwise.com/api/v1/identification?details=common_names,url,description,treatment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": key },
        body: JSON.stringify({ images: [img.data] }), // pure base64, no data: prefix
        cache: "no-store",
      },
    );
    const j = (await res.json().catch(() => ({}))) as { result?: unknown; message?: string };
    if (!res.ok || !j.result) {
      throw new HttpError(res.status || 502, j.message ?? "Crop.health request failed");
    }
    return Response.json(j);
  } catch (e) {
    return fail(e);
  }
}
