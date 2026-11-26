"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalUuid, toolAccess, type ActionResult } from "@/lib/tool-actions";
import { SOCIAL_CONTENT_TYPES, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/ai/tools/social";

const post = z.object({
  day: z.number().int().min(1).max(31),
  platform: z.enum(Object.keys(SOCIAL_PLATFORMS) as [SocialPlatform, ...SocialPlatform[]]),
  content_type: z.enum(SOCIAL_CONTENT_TYPES),
  title: z.string().max(300),
  hook: z.string().max(2000),
  caption: z.string().max(10000),
  script: z.array(z.object({ timing: z.string().max(100), visual: z.string().max(2000), voiceover: z.string().max(2000) })).max(40),
  slides: z.array(z.string().max(2000)).max(20),
  visual_idea: z.string().max(2000),
  hashtags: z.array(z.string().max(100)).max(40),
  cta: z.string().max(300),
});

const schema = z.object({
  generationId: optionalUuid,
  startsOn: z.iso.date(),
  planDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).nullable(),
  title: z.string().trim().min(1).max(200),
  posts: z.array(post).min(1).max(40),
});

export async function savePosts(raw: z.input<typeof schema>): Promise<ActionResult<{ count: number }>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const access = await toolAccess("social_studio");
  if ("error" in access) return { ok: false, error: access.error };
  const { ws, supabase } = access;
  const d = parsed.data;
  const bp = ws.activeBusiness!;

  let calendarId: string | null = null;
  if (d.planDays) {
    const { data: cal, error } = await supabase
      .from("content_calendars")
      .insert({ organization_id: ws.organization.id, business_profile_id: bp.id, title: d.title, starts_on: d.startsOn, length_days: d.planDays, generation_id: d.generationId ?? null, is_demo: bp.is_demo })
      .select("id")
      .single();
    if (error || !cal) return { ok: false, error: "Couldn't create the content calendar." };
    calendarId = cal.id;
  }

  const start = new Date(`${d.startsOn}T00:00:00Z`);
  const rows = d.posts.map((p, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + p.day - 1);
    const { platform, content_type, title, ...body } = p;
    return {
      organization_id: ws.organization.id,
      business_profile_id: bp.id,
      calendar_id: calendarId,
      generation_id: d.generationId ?? null,
      platform,
      content_type,
      title: title || null,
      body,
      status: "draft",
      planned_for: date.toISOString().slice(0, 10),
      position: i,
      is_demo: bp.is_demo,
    };
  });
  const { error } = await supabase.from("social_content").insert(rows);
  if (error) return { ok: false, error: "Couldn't save the posts." };
  revalidatePath("/app/social");
  return { ok: true, data: { count: rows.length } };
}

const STATUSES = ["draft", "approved", "scheduled", "published"] as const;

export async function updatePost(raw: { id: string; status?: string; planned_for?: string | null; caption?: string }): Promise<ActionResult> {
  const parsed = z.object({
    id: z.uuid(),
    status: z.enum(STATUSES).optional(),
    planned_for: z.iso.date().nullable().optional(),
    caption: z.string().max(10000).optional(),
  }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid update." };
  const access = await toolAccess("social_studio");
  if ("error" in access) return { ok: false, error: access.error };
  const { supabase } = access;
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.status) patch.status = d.status;
  if (d.planned_for !== undefined) patch.planned_for = d.planned_for;
  if (d.caption !== undefined) {
    const { data: row } = await supabase.from("social_content").select("body").eq("id", d.id).maybeSingle();
    if (!row) return { ok: false, error: "Post not found." };
    patch.body = { ...(row.body as Record<string, unknown>), caption: d.caption };
  }
  const { error } = await supabase.from("social_content").update(patch).eq("id", d.id);
  if (error) return { ok: false, error: "Couldn't update the post." };
  revalidatePath("/app/social");
  return { ok: true };
}

export async function deletePost(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("social_studio");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("social_content").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/app/social");
  return { ok: true };
}
