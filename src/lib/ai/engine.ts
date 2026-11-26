import "server-only";
import { cache } from "react";
import type { Workspace } from "@/lib/workspace";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import type { FeatureKey } from "@/lib/features";
import { rateLimit } from "@/lib/rate-limit";
import { getTextProvider } from "./openai";
import { AIProviderError } from "./provider";
import { businessContext } from "./context";
import { validate, type Schema } from "./schema";

export type EngineError = {
  ok: false;
  status: number;
  code:
    | "NOT_CONFIGURED"
    | "UPGRADE_REQUIRED"
    | "INSUFFICIENT_CREDITS"
    | "RATE_LIMITED"
    | "IN_PROGRESS"
    | "NO_BUSINESS"
    | "AI_FAILED"
    | "VALIDATION";
  message: string;
  extra?: Record<string, unknown>;
};
export type EngineSuccess<T> = { ok: true; generationId: string; output: T; creditsCharged: number; duplicate: boolean };
export type EngineResult<T> = EngineSuccess<T> | EngineError;

export type GenerationRequest = {
  ws: Workspace;
  tool: string;
  feature: FeatureKey;
  title: string;
  input: Record<string, unknown>;
  section?: string | null;
  credits: number;
  /** Client-generated id for this submission; repeating it never charges twice. */
  requestId: string;
  system: string;
  /** Task-specific prompt; business context is prepended automatically. */
  user: string;
  schemaName: string;
  schema: Schema;
  maxOutputTokens: number;
  temperature?: number;
};

type AiSettings = {
  model: string | null;
  maxOutputTokens: number | null;
  pricing: { text_input_per_1m?: number; text_output_per_1m?: number };
};

/** Model and pricing are read from the database so admins can change them without a deploy. */
const loadAiSettings = cache(async (): Promise<AiSettings> => {
  const { data } = await createAdminClient().from("ai_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  return {
    model: (process.env.OPENAI_TEXT_MODEL || (map.get("default_text_model") as string | undefined)) ?? null,
    maxOutputTokens: typeof map.get("max_output_tokens") === "number" ? (map.get("max_output_tokens") as number) : null,
    pricing: (map.get("pricing") as AiSettings["pricing"]) ?? {},
  };
});

/** Admin-managed prompt overrides (prompt_templates). The latest active version wins. */
const loadTemplate = cache(async (tool: string) => {
  const { data } = await createAdminClient()
    .from("prompt_templates")
    .select("id, system_prompt, model, credit_cost")
    .eq("tool", tool)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; system_prompt: string; model: string | null; credit_cost: number } | null;
});

export function estimateCostUsd(pricing: AiSettings["pricing"], inputTokens: number, outputTokens: number) {
  const i = pricing.text_input_per_1m ?? 0;
  const o = pricing.text_output_per_1m ?? 0;
  return Number(((inputTokens * i + outputTokens * o) / 1_000_000).toFixed(5));
}

/** Checks that don't cost anything: configuration, plan access and business profile. */
export function preflight(ws: Workspace, feature: FeatureKey): EngineError | null {
  if (!isServiceRoleConfigured()) {
    return { ok: false, status: 503, code: "NOT_CONFIGURED", message: "AI generation needs SUPABASE_SERVICE_ROLE_KEY on the server to record usage.", extra: { envVars: ["SUPABASE_SERVICE_ROLE_KEY"] } };
  }
  if (!getTextProvider().isConfigured()) {
    return { ok: false, status: 503, code: "NOT_CONFIGURED", message: "The AI provider isn't configured yet. Set OPENAI_API_KEY on the server.", extra: { envVars: ["OPENAI_API_KEY"] } };
  }
  if (!ws.entitlements.has(feature)) {
    return { ok: false, status: 403, code: "UPGRADE_REQUIRED", message: "This tool isn't included in your current plan." };
  }
  if (!ws.activeBusiness) {
    return { ok: false, status: 400, code: "NO_BUSINESS", message: "Set up a business profile first." };
  }
  return null;
}

/**
 * The shared generation workflow (spec §25):
 * auth (caller) → plan access → rate limit → reserve credits (idempotent) →
 * business context → provider call → validate → save → refund on failure.
 */
export async function generate<T>(req: GenerationRequest): Promise<EngineResult<T>> {
  const { ws } = req;
  const pre = preflight(ws, req.feature);
  if (pre) return pre;
  const bp = ws.activeBusiness!;
  const orgId = ws.organization.id;
  const admin = createAdminClient();

  if (!(await rateLimit(`ai:m:${ws.user.id}`, 8, 60)) || !(await rateLimit(`ai:h:${orgId}`, 120, 3600))) {
    return { ok: false, status: 429, code: "RATE_LIMITED", message: "You're generating very quickly. Please wait a minute and try again." };
  }

  const [settings, template] = await Promise.all([loadAiSettings(), loadTemplate(req.tool)]);
  const credits = req.section ? req.credits : (template?.credit_cost ?? req.credits);
  const key = `gen:${orgId}:${req.requestId}`;

  // 1. Record the attempt. The unique idempotency key makes resubmits safe.
  const { data: created, error: insertError } = await admin
    .from("ai_generations")
    .insert({
      organization_id: orgId,
      business_profile_id: bp.id,
      user_id: ws.user.id,
      tool: req.tool,
      section: req.section ?? null,
      input: { ...req.input, _title: req.title },
      status: "pending",
      prompt_template_id: template?.id ?? null,
      idempotency_key: key,
      is_demo: bp.is_demo,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing } = await admin
        .from("ai_generations")
        .select("id, status, output, credits_charged, organization_id")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (existing && existing.organization_id === orgId && existing.status === "succeeded") {
        return { ok: true, generationId: existing.id, output: existing.output as T, creditsCharged: existing.credits_charged, duplicate: true };
      }
      return { ok: false, status: 409, code: "IN_PROGRESS", message: "This request is already being processed." };
    }
    throw new Error(`Failed to record generation: ${insertError.message}`);
  }
  const generationId = created.id as string;

  // 2. Reserve credits before calling the provider so concurrent requests can't overspend.
  if (credits > 0) {
    const { error: creditError } = await admin.rpc("consume_credits", {
      p_org: orgId,
      p_type: "text",
      p_amount: credits,
      p_key: key,
      p_user: ws.user.id,
      p_reference: generationId,
    });
    if (creditError) {
      const insufficient = creditError.message.includes("INSUFFICIENT_CREDITS");
      await admin.from("ai_generations").update({ status: "failed", error_message: insufficient ? "Insufficient credits" : creditError.message.slice(0, 500), completed_at: new Date().toISOString() }).eq("id", generationId);
      if (insufficient) {
        return { ok: false, status: 402, code: "INSUFFICIENT_CREDITS", message: `This needs ${credits} credit${credits > 1 ? "s" : ""} and you don't have enough left this month.`, extra: { required: credits } };
      }
      throw new Error(`Credit reservation failed: ${creditError.message}`);
    }
  }

  // 3. Call the provider with the business context and tool prompt.
  const provider = getTextProvider();
  const system = template?.system_prompt?.trim() ? template.system_prompt : req.system;
  const user = `${businessContext(bp, ws.brandKit)}\n\n---\n\n${req.user}`;
  try {
    const result = await provider.generateJson<T>({
      system,
      user,
      schemaName: req.schemaName,
      schema: req.schema as unknown as Record<string, unknown>,
      model: template?.model || settings.model || undefined,
      maxOutputTokens: Math.min(req.maxOutputTokens, settings.maxOutputTokens ?? Number.POSITIVE_INFINITY),
      temperature: req.temperature,
    });
    const problems = validate(req.schema, result.data);
    if (problems.length) {
      throw new AIProviderError("INVALID_OUTPUT", `The AI response didn't match the expected format (${problems[0]!.path}: ${problems[0]!.message}).`);
    }
    await admin
      .from("ai_generations")
      .update({
        status: "succeeded",
        output: result.data,
        provider: result.provider,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        estimated_cost_usd: estimateCostUsd(settings.pricing, result.inputTokens, result.outputTokens),
        credits_charged: credits,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);
    return { ok: true, generationId, output: result.data, creditsCharged: credits, duplicate: false };
  } catch (e) {
    // 4. Never charge for a failed generation.
    if (credits > 0) await admin.rpc("refund_credits", { p_key: key });
    const message = e instanceof AIProviderError ? e.message : "The AI request failed unexpectedly.";
    await Promise.all([
      admin.from("ai_generations").update({ status: "failed", error_message: message.slice(0, 500), credits_charged: 0, completed_at: new Date().toISOString() }).eq("id", generationId),
      admin.from("api_error_logs").insert({
        service: provider.name,
        route: `ai:${req.tool}`,
        organization_id: orgId,
        message: message.slice(0, 500),
        detail: { generation_id: generationId, code: e instanceof AIProviderError ? e.code : "UNKNOWN" },
      }),
    ]);
    return { ok: false, status: 502, code: "AI_FAILED", message: `${message} You weren't charged any credits.` };
  }
}
