// Server-only: turn an image reference (data URL or https URL) into raw base64.
// Needed because Crop.health wants pure base64 and Gemini wants inline_data.
import { HttpError } from "./env";

const MAX_BYTES = 10 * 1024 * 1024;

/** Refuse URLs that point at localhost / private networks (basic SSRF guard). */
function assertPublicHttps(url: URL) {
  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "::1" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (url.protocol !== "https:" || privateHost) {
    throw new HttpError(400, "Image URL must be a public https:// address");
  }
}

export async function loadImage(src: string): Promise<{ mime: string; data: string }> {
  const dataUrl = /^data:([\w/+.-]+);base64,([\s\S]+)$/.exec(src);
  if (dataUrl) {
    if (dataUrl[2].length > MAX_BYTES * 1.4) throw new HttpError(413, "Image is too large");
    return { mime: dataUrl[1], data: dataUrl[2] };
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new HttpError(400, "Unsupported image source");
  }
  assertPublicHttps(url);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new HttpError(502, `Could not download image (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new HttpError(413, "Image is larger than 10 MB");
  const mime = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
  return { mime, data: buf.toString("base64") };
}
