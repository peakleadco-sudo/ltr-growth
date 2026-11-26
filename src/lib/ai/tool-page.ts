import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { creditSummary, hasFeature, requireWorkspace } from "@/lib/workspace";
import type { FeatureKey } from "@/lib/features";
import { getTextProvider } from "./openai";

export type Reopened = { generationId: string; input: Record<string, unknown>; output: Record<string, unknown> };

/** Common server-side loading for generator pages. */
export async function loadToolPage(feature: FeatureKey, tool: string, generationId?: string | string[]) {
  const ws = await requireWorkspace();
  const included = hasFeature(ws, feature);
  const aiConfigured = getTextProvider().isConfigured() && isServiceRoleConfigured();
  const credits = creditSummary(ws);

  let reopened: Reopened | null = null;
  const gid = typeof generationId === "string" && /^[0-9a-f-]{36}$/i.test(generationId) ? generationId : null;
  if (gid) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_generations")
      .select("id, input, output, status, tool, section")
      .eq("id", gid)
      .eq("tool", tool)
      .eq("status", "succeeded")
      .is("section", null)
      .maybeSingle();
    if (data?.output) reopened = { generationId: data.id, input: (data.input ?? {}) as Record<string, unknown>, output: data.output as Record<string, unknown> };
  }

  return { ws, included, aiConfigured, remaining: credits.textRemaining, reopened };
}
