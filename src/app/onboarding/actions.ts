"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { brandKitSchema, businessProfileSchema } from "@/lib/schemas";
import type { ActionResult } from "@/app/app/actions";
import { notify } from "@/lib/notify";

const draftSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  step: z.string().max(40),
  profile: businessProfileSchema,
  brand: brandKitSchema.partial().optional(),
  extraction: z
    .object({
      source: z.object({ url: z.string().max(2048), retrievedAt: z.string().max(64), via: z.string().max(20) }),
      accepted: z.array(z.string().max(40)).max(30),
    })
    .nullable()
    .optional(),
});

function firstIssue(err: z.ZodError) {
  const i = err.issues[0];
  return i ? `${String(i.path.slice(-1)[0] ?? "Field")}: ${i.message}` : "Invalid input.";
}

/** Creates or updates the business profile + brand kit as the user moves through onboarding. */
export async function saveOnboardingDraft(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, step, profile, brand, extraction } = parsed.data;
  const supabase = await createClient();

  const row = {
    ...profile,
    onboarding_step: step,
    ...(extraction ? { website_extraction: extraction, website_extraction_approved_at: new Date().toISOString() } : {}),
  };

  let bpId = id ?? null;
  if (bpId) {
    const { error } = await supabase.from("business_profiles").update(row).eq("id", bpId);
    if (error) return { ok: false, error: "Couldn't save your business profile." };
  } else {
    const { data, error } = await supabase
      .from("business_profiles")
      .insert({ ...row, organization_id: ws.organization.id, created_by: ws.user.id })
      .select("id")
      .single();
    if (error) {
      if (error.message.includes("PLAN_LIMIT")) return { ok: false, error: "Your plan's business profile limit has been reached. Upgrade to add another business." };
      return { ok: false, error: "Couldn't create your business profile." };
    }
    bpId = data.id as string;
    await supabase.from("profiles").update({ active_business_profile_id: bpId }).eq("id", ws.user.id);
  }

  if (brand && Object.keys(brand).length) {
    const { error } = await supabase
      .from("brand_kits")
      .upsert({ ...brand, business_profile_id: bpId, organization_id: ws.organization.id }, { onConflict: "business_profile_id" });
    if (error) return { ok: false, error: "Couldn't save your brand details." };
  } else {
    await supabase
      .from("brand_kits")
      .upsert({ business_profile_id: bpId, organization_id: ws.organization.id }, { onConflict: "business_profile_id", ignoreDuplicates: true });
  }
  return { ok: true, data: { id: bpId! } };
}

/** Marks onboarding complete and creates starter tasks based only on what we actually know. */
export async function completeOnboarding(bpId: string): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  if (!z.string().uuid().safeParse(bpId).success) return { ok: false, error: "Invalid business profile." };
  const supabase = await createClient();
  const { data: bp } = await supabase.from("business_profiles").select("*").eq("id", bpId).maybeSingle();
  if (!bp) return { ok: false, error: "Business profile not found." };
  const { data: kit } = await supabase.from("brand_kits").select("*").eq("business_profile_id", bpId).maybeSingle();

  const now = new Date().toISOString();
  await supabase.from("business_profiles").update({ onboarding_completed_at: now, onboarding_step: "done" }).eq("id", bpId);
  await supabase.from("profiles").update({ onboarding_completed_at: now, active_business_profile_id: bpId }).eq("id", ws.user.id);

  const { count } = await supabase.from("marketing_tasks").select("id", { count: "exact", head: true }).eq("business_profile_id", bpId).eq("source", "onboarding");
  if (!count) {
    const tasks: { title: string; description: string; category: string; priority: "high" | "medium" | "low" }[] = [];
    if (bp.website_url) tasks.push({ title: "Run your first website audit", description: "See how your website performs on speed, SEO and conversion readiness.", category: "Website", priority: "high" });
    else tasks.push({ title: "Add your website to your business profile", description: "Most tools work better when LTR Growth can review your website.", category: "Profile", priority: "high" });
    if (!bp.target_audience) tasks.push({ title: "Describe your target audience", description: "Who buys from you and why? This sharpens every ad and post we generate.", category: "Profile", priority: "high" });
    if (!kit?.logo_asset_id) tasks.push({ title: "Upload your logo to the Brand Kit", description: "Used in creatives and branded reports.", category: "Brand", priority: "medium" });
    if (!kit?.brand_voice && !(kit?.voice_traits?.length)) tasks.push({ title: "Define your brand voice", description: "Pick a few traits so generated content sounds like you.", category: "Brand", priority: "medium" });
    if (!(bp.competitors as unknown[])?.length) tasks.push({ title: "Add two or three competitors", description: "Needed for competitor comparisons and differentiation ideas.", category: "Research", priority: "low" });
    if (bp.monthly_marketing_budget === null) tasks.push({ title: "Set a monthly marketing budget", description: "Lets the strategy generator suggest a realistic channel mix.", category: "Planning", priority: "low" });
    const ext = bp.website_extraction as { accepted?: string[] } | null;
    if (ext && !ext.accepted?.includes("description") && !bp.description) tasks.push({ title: "Write a short business description", description: "One or two sentences about what you do and who you serve.", category: "Profile", priority: "medium" });
    if (tasks.length) {
      await supabase.from("marketing_tasks").insert(
        tasks.map((t) => ({ ...t, organization_id: ws.organization.id, business_profile_id: bpId, source: "onboarding", created_by: ws.user.id })),
      );
    }
  }
  await notify({
    userId: ws.user.id,
    organizationId: ws.organization.id,
    kind: "success",
    title: "Your workspace is ready",
    body: "Your business profile is saved and will personalize every tool.",
    link: "/app",
  });

  revalidatePath("/app", "layout");
  return { ok: true };
}
