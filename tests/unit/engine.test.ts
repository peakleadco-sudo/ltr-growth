import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Fakes ---------------------------------------------------------------
type Call = { table?: string; op: string; payload?: unknown; filters: [string, unknown][] };
const calls: Call[] = [];
const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
let insertError: { code: string; message: string } | null = null;
let existingRow: Record<string, unknown> | null = null;
let consumeError: { message: string } | null = null;

function builder(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  const b = {
    select: () => b,
    insert: (payload: unknown) => { call.op = "insert"; call.payload = payload; calls.push(call); return b; },
    update: (payload: unknown) => { call.op = "update"; call.payload = payload; calls.push(call); return b; },
    eq: (k: string, v: unknown) => { call.filters.push([k, v]); return b; },
    order: () => b,
    limit: () => b,
    single: async () => (call.op === "insert" && table === "ai_generations" ? (insertError ? { data: null, error: insertError } : { data: { id: "gen-1" }, error: null }) : { data: null, error: null }),
    maybeSingle: async () => (table === "ai_generations" ? { data: existingRow, error: null } : { data: null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: table === "ai_settings" ? [{ key: "pricing", value: { text_input_per_1m: 1, text_output_per_1m: 2 } }] : [], error: null }),
  };
  return b;
}

vi.mock("@/lib/supabase/admin", () => ({
  isServiceRoleConfigured: () => true,
  createAdminClient: () => ({
    from: (t: string) => builder(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === "consume_credits" && consumeError) return { data: null, error: consumeError };
      return { data: { ok: true }, error: null };
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));

const provider = { name: "fake", isConfigured: () => true, generateJson: vi.fn() };
vi.mock("@/lib/ai/openai", () => ({ getTextProvider: () => provider }));

const { generate } = await import("@/lib/ai/engine");
const { s } = await import("@/lib/ai/schema");
const { AIProviderError } = await import("@/lib/ai/provider");

// ---- Fixtures --------------------------------------------------------------
const ws = {
  user: { id: "user-1" },
  organization: { id: "org-1" },
  entitlements: new Set(["ad_studio"]),
  activeBusiness: { id: "bp-1", name: "Biz", is_demo: false, service_areas: [], competitors: [], marketing_channels: [], goals: [], social_links: {} },
  brandKit: null,
} as never;

const schema = s.obj({ headline: s.str() });
const base = { ws, tool: "ad_studio", feature: "ad_studio" as const, title: "t", input: { a: 1 }, credits: 2, requestId: "11111111-1111-4111-8111-111111111111", system: "sys", user: "do it", schemaName: "x", schema, maxOutputTokens: 1000 };

beforeEach(() => {
  calls.length = 0;
  rpcCalls.length = 0;
  insertError = null;
  existingRow = null;
  consumeError = null;
  provider.generateJson.mockReset();
});

const updates = () => calls.filter((c) => c.table === "ai_generations" && c.op === "update").map((c) => c.payload as Record<string, unknown>);

describe("generation engine", () => {
  it("reserves credits, calls the provider and records the result", async () => {
    provider.generateJson.mockResolvedValue({ data: { headline: "Hi" }, model: "m", provider: "fake", inputTokens: 1000, outputTokens: 500 });
    const r = await generate(base);
    expect(r).toMatchObject({ ok: true, generationId: "gen-1", creditsCharged: 2, output: { headline: "Hi" } });
    expect(rpcCalls).toEqual([{ fn: "consume_credits", args: expect.objectContaining({ p_org: "org-1", p_amount: 2, p_key: "gen:org-1:11111111-1111-4111-8111-111111111111", p_reference: "gen-1" }) }]);
    const prompt = provider.generateJson.mock.calls[0]![0];
    expect(prompt.user).toContain('<untrusted_data source="business_profile">');
    expect(prompt.user).toContain("do it");
    expect(updates().at(-1)).toMatchObject({ status: "succeeded", credits_charged: 2, estimated_cost_usd: 0.002 });
  });

  it("refunds and reports when the provider fails", async () => {
    provider.generateJson.mockRejectedValue(new AIProviderError("PROVIDER_ERROR", "Boom."));
    const r = await generate(base);
    expect(r).toMatchObject({ ok: false, code: "AI_FAILED" });
    if (!r.ok) expect(r.message).toContain("weren't charged");
    expect(rpcCalls.map((c) => c.fn)).toEqual(["consume_credits", "refund_credits"]);
    expect(updates().at(-1)).toMatchObject({ status: "failed", credits_charged: 0 });
    expect(calls.some((c) => c.table === "api_error_logs" && c.op === "insert")).toBe(true);
  });

  it("refunds when the output doesn't match the schema", async () => {
    provider.generateJson.mockResolvedValue({ data: { wrong: true }, model: "m", provider: "fake", inputTokens: 1, outputTokens: 1 });
    const r = await generate(base);
    expect(r).toMatchObject({ ok: false, code: "AI_FAILED" });
    expect(rpcCalls.map((c) => c.fn)).toEqual(["consume_credits", "refund_credits"]);
  });

  it("stops before calling the provider when credits are insufficient", async () => {
    consumeError = { message: "INSUFFICIENT_CREDITS" };
    const r = await generate(base);
    expect(r).toMatchObject({ ok: false, status: 402, code: "INSUFFICIENT_CREDITS" });
    expect(provider.generateJson).not.toHaveBeenCalled();
    expect(updates().at(-1)).toMatchObject({ status: "failed" });
  });

  it("returns the stored result for a repeated request without charging again", async () => {
    insertError = { code: "23505", message: "duplicate" };
    existingRow = { id: "gen-0", status: "succeeded", output: { headline: "Old" }, credits_charged: 2, organization_id: "org-1" };
    const r = await generate(base);
    expect(r).toMatchObject({ ok: true, duplicate: true, generationId: "gen-0" });
    expect(rpcCalls).toEqual([]);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("rejects tools outside the plan without recording anything", async () => {
    const r = await generate({ ...base, feature: "strategy" });
    expect(r).toMatchObject({ ok: false, status: 403, code: "UPGRADE_REQUIRED" });
    expect(calls).toEqual([]);
  });
});
