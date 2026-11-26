"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, hasFeature } from "@/lib/workspace";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/app/app/actions";

export async function submitSupportRequest(input: unknown): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Please sign in again." };
  const p = z.object({ subject: z.string().trim().min(1, "Add a subject").max(200), message: z.string().trim().min(10, "Add a few more details").max(5000) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid request." };
  if (!(await rateLimit(`support:${ws.user.id}`, 10, 3600))) return { ok: false, error: "Too many requests. Please try again later." };
  const supabase = await createClient();
  const { error } = await supabase.from("support_requests").insert({
    user_id: ws.user.id,
    organization_id: ws.organization.id,
    email: ws.profile.email ?? ws.user.email,
    subject: p.data.subject,
    message: p.data.message,
    priority: hasFeature(ws, "priority_support") ? "priority" : "normal",
  });
  if (error) return { ok: false, error: "Couldn't send your request." };
  revalidatePath("/app/help");
  return { ok: true };
}
