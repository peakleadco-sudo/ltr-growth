"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";
import { businessProfileSchema } from "@/lib/schemas";
import { BRAND_BUCKET } from "@/lib/storage";
import type { ActionResult } from "@/app/app/actions";

export async function updateAccount(input: unknown): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  const p = z.object({ full_name: z.string().trim().min(1).max(120), marketing_consent: z.boolean() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Enter your name." };
  const supabase = await createClient();
  const consentChanged = p.data.marketing_consent !== ws.profile.marketing_consent;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: p.data.full_name,
      marketing_consent: p.data.marketing_consent,
      ...(consentChanged ? { marketing_consent_at: p.data.marketing_consent ? new Date().toISOString() : null } : {}),
    })
    .eq("id", ws.user.id);
  if (error) return { ok: false, error: "Couldn't save your settings." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateBusinessProfile(id: string, input: unknown): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid business profile." };
  const p = businessProfileSchema.safeParse(input);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: i ? `${String(i.path[0] ?? "Field")}: ${i.message}` : "Invalid input." };
  }
  const supabase = await createClient();
  const { error, count } = await supabase.from("business_profiles").update(p.data, { count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: "Couldn't save the business profile." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function deleteBusinessProfile(id: string, confirmName: string): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  if (!["owner", "admin"].includes(ws.memberRole)) return { ok: false, error: "Only workspace owners can delete business profiles." };
  const supabase = await createClient();
  const { data: bp } = await supabase.from("business_profiles").select("id, name, organization_id").eq("id", id).maybeSingle();
  if (!bp) return { ok: false, error: "Business profile not found." };
  if (bp.name.trim() !== confirmName.trim()) return { ok: false, error: "Type the business name exactly to confirm." };
  if (isServiceRoleConfigured()) {
    const admin = createAdminClient();
    const { data: files } = await admin.from("brand_assets").select("storage_path").eq("business_profile_id", id);
    if (files?.length) await admin.storage.from(BRAND_BUCKET).remove(files.map((f) => f.storage_path));
  }
  const { error } = await supabase.from("business_profiles").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the business profile." };
  revalidatePath("/app", "layout");
  const remaining = ws.businessProfiles.filter((b) => b.id !== id);
  redirect(remaining.length ? "/app" : "/onboarding");
}

/** Permanently deletes the user and any workspace they solely own (with all data and files). */
export async function deleteAccount(confirm: string): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  if (confirm !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server." };
  const admin = createAdminClient();
  const { data: memberships } = await admin.from("organization_members").select("organization_id, role").eq("user_id", ws.user.id);
  for (const m of memberships ?? []) {
    const { count } = await admin.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", m.organization_id);
    if (m.role === "owner" && (count ?? 0) <= 1) {
      const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id, status").eq("organization_id", m.organization_id).maybeSingle();
      if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) {
        return { ok: false, error: "Cancel your paid subscription from the Subscription page before deleting your account." };
      }
      const { data: files } = await admin.from("brand_assets").select("storage_path").eq("organization_id", m.organization_id);
      if (files?.length) await admin.storage.from(BRAND_BUCKET).remove(files.map((f) => f.storage_path));
      await admin.from("organizations").delete().eq("id", m.organization_id);
    }
  }
  const { error } = await admin.auth.admin.deleteUser(ws.user.id);
  if (error) return { ok: false, error: "Couldn't delete your account. Please contact support." };
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/?account=deleted");
}
