"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { jsonPayload, optionalUuid, toolAccess, type ActionResult } from "@/lib/tool-actions";
import { PAGE_TYPES, type PageType } from "@/lib/ai/tools/copywriter";

const schema = z.object({
  id: optionalUuid,
  generationId: optionalUuid,
  pageType: z.enum(Object.keys(PAGE_TYPES) as [PageType, ...PageType[]]),
  title: z.string().trim().min(1).max(200),
  content: jsonPayload,
});

export async function saveCopy(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const access = await toolAccess("website_copy");
  if ("error" in access) return { ok: false, error: access.error };
  const { ws, supabase } = access;
  const d = parsed.data;
  const q = d.id
    ? supabase.from("website_copies").update({ title: d.title, content: d.content }).eq("id", d.id).select("id").single()
    : supabase
        .from("website_copies")
        .insert({ organization_id: ws.organization.id, business_profile_id: ws.activeBusiness!.id, generation_id: d.generationId ?? null, page_type: d.pageType, title: d.title, content: d.content, is_demo: ws.activeBusiness!.is_demo, created_by: ws.user.id })
        .select("id")
        .single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: "Couldn't save the copy." };
  revalidatePath("/app/copywriter");
  return { ok: true, data: { id: data.id } };
}

export async function deleteCopy(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("website_copy");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("website_copies").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/app/copywriter");
  return { ok: true };
}
