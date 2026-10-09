// Server-only helpers. Import from route handlers only.

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Read a required secret from the environment (.env.local in development). */
export function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(500, `Missing ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

/** Uniform JSON error response for route handlers. */
export function fail(e: unknown): Response {
  const status = e instanceof HttpError ? e.status : 500;
  const message = e instanceof Error ? e.message : "Unexpected server error";
  return Response.json({ error: message }, { status });
}
