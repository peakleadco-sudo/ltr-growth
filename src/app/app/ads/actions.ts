"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { jsonPayload, optionalUuid, toolAccess, type ActionResult } from "@/lib/tool-actions";
import { AD_PLATFORMS, type AdPlatform } from "@/lib/ai/tools/ad-studio";

const schema = z.object({
  id: optionalUuid,
  generationId: optionalUuid,
  platform: z.enum(Object.keys(AD_PLATFORMS) as [AdPlatform, ...AdPlatform[]]),
  title: z.string().trim().min(1).max(200),
  brief: jsonPayload,
  content: jsonPayload,
});

export async function saveAd(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const access = await toolAccess("ad_studio");
  if ("error" in access) return { ok: false, error: access.error };
  const { ws, supabase } = access;
  const d = parsed.data;
  const row = {
    organization_id: ws.organization.id,
    business_profile_id: ws.activeBusiness!.id,
    generation_id: d.generationId ?? null,
    platform: d.platform,
    title: d.title,
    brief: d.brief,
    content: d.content,
    is_demo: ws.activeBusiness!.is_demo,
    created_by: ws.user.id,
  };
  const q = d.id
    ? supabase.from("generated_ads").update({ title: d.title, brief: d.brief, content: d.content }).eq("id", d.id).select("id").single()
    : supabase.from("generated_ads").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: "Couldn't save this campaign." };
  revalidatePath("/app/ads");
  revalidatePath("/app");
  return { ok: true, data: { id: data.id } };
}

export async function deleteAd(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("ad_studio");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("generated_ads").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/app/ads");
  return { ok: true };
}
