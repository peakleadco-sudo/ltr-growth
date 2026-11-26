"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { jsonPayload, optionalUuid, toolAccess, type ActionResult } from "@/lib/tool-actions";
import { EMAIL_TYPES, type EmailType } from "@/lib/ai/tools/email";

const schema = z.object({
  id: optionalUuid,
  generationId: optionalUuid,
  channel: z.enum(["email", "sms"]),
  campaignType: z.enum(Object.keys(EMAIL_TYPES) as [EmailType, ...EmailType[]]),
  title: z.string().trim().min(1).max(200),
  content: jsonPayload,
});

export async function saveEmailCampaign(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const access = await toolAccess("email_sms");
  if ("error" in access) return { ok: false, error: access.error };
  const { ws, supabase } = access;
  const d = parsed.data;
  const q = d.id
    ? supabase.from("email_campaigns").update({ title: d.title, content: d.content }).eq("id", d.id).select("id").single()
    : supabase
        .from("email_campaigns")
        .insert({ organization_id: ws.organization.id, business_profile_id: ws.activeBusiness!.id, generation_id: d.generationId ?? null, channel: d.channel, campaign_type: d.campaignType, title: d.title, content: d.content, is_demo: ws.activeBusiness!.is_demo })
        .select("id")
        .single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: "Couldn't save this campaign." };
  revalidatePath("/app/email");
  return { ok: true, data: { id: data.id } };
}

export async function deleteEmailCampaign(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("email_sms");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("email_campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/app/email");
  return { ok: true };
}
