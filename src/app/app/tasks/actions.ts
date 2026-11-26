"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import type { ActionResult } from "@/app/app/actions";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(3000).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
});

function refresh() {
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws?.activeBusiness) return { ok: false, error: "Please sign in again." };
  const p = taskSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid task." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_tasks").insert({
    ...p.data,
    due_date: p.data.due_date || null,
    organization_id: ws.organization.id,
    business_profile_id: ws.activeBusiness.id,
    source: "manual",
    created_by: ws.user.id,
  });
  if (error) return { ok: false, error: "Couldn't create the task." };
  refresh();
  return { ok: true };
}

export async function updateTaskStatus(id: string, status: "todo" | "in_progress" | "done" | "skipped"): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success || !["todo", "in_progress", "done", "skipped"].includes(status)) return { ok: false, error: "Invalid task." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("marketing_tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { ok: false, error: "Couldn't update the task." };
  refresh();
  return { ok: true };
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid task." };
  const p = taskSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid task." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_tasks").update({ ...p.data, due_date: p.data.due_date || null }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't save the task." };
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid task." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the task." };
  refresh();
  return { ok: true };
}
