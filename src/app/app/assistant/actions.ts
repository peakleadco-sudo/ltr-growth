"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toolAccess, type ActionResult } from "@/lib/tool-actions";

export async function toggleSavedMessage(id: string, saved: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("assistant");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("ai_messages").update({ is_saved: saved }).eq("id", id).eq("role", "assistant");
  if (error) return { ok: false, error: "Couldn't update." };
  revalidatePath("/app/assistant");
  return { ok: true };
}

export async function renameConversation(id: string, title: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(120) }).safeParse({ id, title });
  if (!parsed.success) return { ok: false, error: "Enter a title." };
  const access = await toolAccess("assistant");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("ai_conversations").update({ title: parsed.data.title }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't rename." };
  revalidatePath("/app/assistant");
  return { ok: true };
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("assistant");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("ai_conversations").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/app/assistant");
  return { ok: true };
}
