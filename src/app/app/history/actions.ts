"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/workspace";
import type { ActionResult } from "@/lib/tool-actions";

export async function toggleSavedGeneration(id: string, saved: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  if (!(await getSessionUser())) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  // RLS limits this to the user's organization; a trigger only lets is_saved change.
  const { error } = await supabase.from("ai_generations").update({ is_saved: saved }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't update." };
  revalidatePath("/app/history");
  return { ok: true };
}
