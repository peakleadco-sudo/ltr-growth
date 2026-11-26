import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, type Workspace } from "@/lib/workspace";
import type { FeatureKey } from "@/lib/features";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Server-action guard: signed in, has a business profile and the plan includes the feature. */
export async function toolAccess(feature: FeatureKey): Promise<{ ws: Workspace; supabase: Awaited<ReturnType<typeof createClient>> } | { error: string }> {
  const ws = await getWorkspace();
  if (!ws) return { error: "Please sign in again." };
  if (!ws.activeBusiness) return { error: "Set up a business profile first." };
  if (!ws.entitlements.has(feature)) return { error: "This feature isn't included in your plan." };
  return { ws, supabase: await createClient() };
}

/** JSON payload that must stay reasonably small. */
export const jsonPayload = z
  .record(z.string(), z.unknown())
  .refine((v) => JSON.stringify(v).length <= 300_000, { message: "Content is too large to save." });

export const optionalUuid = z.uuid().nullable().optional();
