"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/workspace";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function authed() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { user, supabase: await createClient() };
}

export async function setActiveBusiness(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid business profile." };
  const { user, supabase } = await authed();
  // RLS ensures the profile is only visible if the user belongs to its organization.
  const { data: bp } = await supabase.from("business_profiles").select("id, organization_id").eq("id", parsed.data).maybeSingle();
  if (!bp) return { ok: false, error: "Business profile not found." };
  const { error } = await supabase
    .from("profiles")
    .update({ active_business_profile_id: bp.id, active_organization_id: bp.organization_id })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Couldn't switch business." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const { user, supabase } = await authed();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app", "layout");
  return { ok: true };
}
