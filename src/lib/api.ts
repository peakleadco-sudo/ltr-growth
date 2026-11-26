import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: { code, message, ...extra } }, { status });
}

export function zodMessage(err: ZodError) {
  const first = err.issues[0];
  if (!first) return "Invalid input.";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

export function notConfigured(service: string, envVars: string[]) {
  return jsonError(503, "NOT_CONFIGURED", `${service} is not configured yet. Set ${envVars.join(", ")} on the server.`, {
    service,
    envVars,
  });
}

/** Rejects cross-site form posts for cookie-authenticated endpoints. */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / server-to-server
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
