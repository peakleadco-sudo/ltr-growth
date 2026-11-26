"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { jsonPayload, optionalUuid, toolAccess, type ActionResult } from "@/lib/tool-actions";
import { HORIZONS, strategyTasks, type Horizon, type StrategyOutput } from "@/lib/ai/tools/strategy";

const schema = z.object({
  generationId: optionalUuid,
  horizon: z.enum(Object.keys(HORIZONS) as [Horizon, ...Horizon[]]),
  title: z.string().trim().min(1).max(200),
  startsOn: z.iso.date(),
  content: jsonPayload,
  addTasks: z.boolean(),
});

export async function saveStrategy(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string; tasks: number }>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const access = await toolAccess("strategy");
  if ("error" in access) return { ok: false, error: access.error };
  const { ws, supabase } = access;
  const d = parsed.data;
  const bp = ws.activeBusiness!;

  const { data: strat, error } = await supabase
    .from("marketing_strategies")
    .insert({ organization_id: ws.organization.id, business_profile_id: bp.id, generation_id: d.generationId ?? null, title: d.title, horizon: d.horizon, content: d.content, status: "active", starts_on: d.startsOn, is_demo: bp.is_demo })
    .select("id")
    .single();
  if (error || !strat) return { ok: false, error: "Couldn't save the strategy." };

  let tasks = 0;
  if (d.addTasks) {
    const parsedTasks = z.array(z.object({ week: z.number(), title: z.string(), description: z.string(), category: z.string(), priority: z.enum(["high", "medium", "low"]) })).safeParse((d.content as StrategyOutput).weekly_tasks);
    if (parsedTasks.success) {
      const rows = strategyTasks({ ...(d.content as StrategyOutput), weekly_tasks: parsedTasks.data }, d.startsOn).map((t) => ({
        ...t,
        organization_id: ws.organization.id,
        business_profile_id: bp.id,
        strategy_id: strat.id,
        source: "strategy",
        status: "todo",
        is_demo: bp.is_demo,
      }));
      if (rows.length) {
        const { error: taskError } = await supabase.from("marketing_tasks").insert(rows);
        if (taskError) return { ok: false, error: "Strategy saved, but its tasks couldn't be added." };
        tasks = rows.length;
      }
    }
  }
  revalidatePath("/app/strategy");
  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return { ok: true, data: { id: strat.id, tasks } };
}

export async function updateStrategyContent(id: string, content: Record<string, unknown>, title: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), content: jsonPayload, title: z.string().trim().min(1).max(200) }).safeParse({ id, content, title });
  if (!parsed.success) return { ok: false, error: "Invalid data." };
  const access = await toolAccess("strategy");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("marketing_strategies").update({ content: parsed.data.content, title: parsed.data.title }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Couldn't save changes." };
  revalidatePath(`/app/strategy/${id}`);
  return { ok: true };
}

export async function setStrategyStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), status: z.enum(["active", "archived"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid data." };
  const access = await toolAccess("strategy");
  if ("error" in access) return { ok: false, error: access.error };
  const { error } = await access.supabase.from("marketing_strategies").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't update the strategy." };
  revalidatePath("/app/strategy");
  revalidatePath(`/app/strategy/${id}`);
  return { ok: true };
}

export async function deleteStrategy(id: string, deleteTasks: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const access = await toolAccess("strategy");
  if ("error" in access) return { ok: false, error: access.error };
  const { supabase } = access;
  if (deleteTasks) await supabase.from("marketing_tasks").delete().eq("strategy_id", id).neq("status", "done");
  const { error } = await supabase.from("marketing_strategies").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the strategy." };
  revalidatePath("/app/strategy");
  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return { ok: true };
}
