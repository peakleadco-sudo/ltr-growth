import "server-only";
import { headers } from "next/headers";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limit. Uses the database (shared across server instances)
 * when the service role is configured; otherwise a per-instance memory window.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (isServiceRoleConfigured()) {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error) return Boolean(data);
  }
  const now = Date.now();
  const entry = memory.get(bucket);
  if (!entry || entry.resetAt < now) {
    memory.set(bucket, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
