import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generate } from "@/lib/ai/engine";
import { wrapUntrusted } from "@/lib/ai/prompts/shared";
import { TOOL_LABELS } from "@/lib/ai/tools";
import {
  ASSISTANT_CREDITS,
  ASSISTANT_OUTPUT,
  ASSISTANT_SYSTEM,
  MAX_ATTACHMENT_CHARS,
  MAX_HISTORY_MESSAGES,
  assistantUserPrompt,
  conversationTitle,
  sanitizeAttachmentText,
  type AssistantOutput,
} from "@/lib/ai/assistant";
import { isSameOrigin, jsonError, zodMessage } from "@/lib/api";

export const maxDuration = 120;

const body = z.object({
  requestId: z.uuid(),
  conversationId: z.uuid().nullable(),
  message: z.string().trim().min(1, "Type a message").max(6000),
  attachments: z
    .array(z.object({ name: z.string().trim().min(1).max(120), text: z.string().max(MAX_ATTACHMENT_CHARS) }))
    .max(3)
    .default([]),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  const ws = await getWorkspace();
  if (!ws) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION", zodMessage(parsed.error));
  const d = parsed.data;
  if (d.attachments.reduce((n, a) => n + a.text.length, 0) > MAX_ATTACHMENT_CHARS) {
    return jsonError(413, "VALIDATION", "Attached documents are too long. Keep them under about 60,000 characters in total.");
  }

  const supabase = await createClient();

  // Existing conversation: must be visible to this user through RLS.
  let history: { role: "user" | "assistant"; content: string; attachments: { name: string; text?: string }[] }[] = [];
  if (d.conversationId) {
    const { data: conv } = await supabase.from("ai_conversations").select("id, organization_id").eq("id", d.conversationId).maybeSingle();
    if (!conv || conv.organization_id !== ws.organization.id) return jsonError(404, "NOT_FOUND", "Conversation not found.");
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("role, content, attachments, created_at")
      .eq("conversation_id", d.conversationId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);
    history = ((msgs ?? []) as typeof history).reverse();
  }

  // Titles of recent work give LTR AI context without sending full outputs.
  const [{ data: gens }, { data: strategies }, { data: tasks }] = await Promise.all([
    supabase.from("ai_generations").select("tool, input, created_at").eq("status", "succeeded").is("section", null).neq("tool", "assistant").order("created_at", { ascending: false }).limit(8),
    supabase.from("marketing_strategies").select("title, horizon").eq("status", "active").order("created_at", { ascending: false }).limit(3),
    supabase.from("marketing_tasks").select("title, status").neq("status", "done").order("created_at", { ascending: false }).limit(8),
  ]);
  const recentWork = [
    ...(gens ?? []).map((g) => `${TOOL_LABELS[g.tool] ?? g.tool}: ${String((g.input as Record<string, unknown>)?._title ?? "").slice(0, 120)}`),
    ...(strategies ?? []).map((s) => `Active strategy: ${s.title}`),
    ...(tasks ?? []).map((t) => `Open task: ${t.title}`),
  ];

  const earlierAttachments = history
    .flatMap((m) => m.attachments ?? [])
    .filter((a) => a.text)
    .slice(-2)
    .map((a) => wrapUntrusted(`document:${a.name.replace(/["<>]/g, "").slice(0, 80)}`, sanitizeAttachmentText(a.text!).slice(0, 15_000)));

  const result = await generate<AssistantOutput>({
    ws,
    tool: "assistant",
    feature: "assistant",
    title: `LTR AI · ${conversationTitle(d.message)}`,
    input: { message: d.message.slice(0, 500), conversation_id: d.conversationId, attachments: d.attachments.map((a) => a.name) },
    credits: ASSISTANT_CREDITS,
    requestId: d.requestId,
    system: ASSISTANT_SYSTEM,
    user: assistantUserPrompt({
      history: history.map((m) => ({ role: m.role, content: m.content })),
      message: d.message,
      attachments: d.attachments,
      recentWork,
      earlierAttachments,
    }),
    schemaName: "ltr_ai_answer",
    schema: ASSISTANT_OUTPUT,
    maxOutputTokens: 2500,
    temperature: 0.5,
  });
  if (!result.ok) return jsonError(result.status, result.code, result.message, result.extra);
  if (result.duplicate) return jsonError(409, "IN_PROGRESS", "This message was already answered. Refresh to see it.");

  // Messages are written server-side so assistant replies can't be forged.
  const admin = createAdminClient();
  let conversationId = d.conversationId;
  if (!conversationId) {
    const { data: conv, error } = await admin
      .from("ai_conversations")
      .insert({ organization_id: ws.organization.id, business_profile_id: ws.activeBusiness!.id, user_id: ws.user.id, title: conversationTitle(d.message) })
      .select("id")
      .single();
    if (error || !conv) return jsonError(500, "SERVER_ERROR", "Couldn't start the conversation.");
    conversationId = conv.id as string;
  }
  const out = result.output;
  const now = Date.now();
  const { data: inserted, error: msgError } = await admin
    .from("ai_messages")
    .insert([
      { conversation_id: conversationId, organization_id: ws.organization.id, role: "user", content: d.message, attachments: d.attachments.map((a) => ({ name: a.name, chars: a.text.length, text: sanitizeAttachmentText(a.text) })), created_at: new Date(now).toISOString() },
      {
        conversation_id: conversationId,
        organization_id: ws.organization.id,
        role: "assistant",
        content: out.answer_markdown,
        metadata: { based_on_profile: out.based_on_profile, assumptions: out.assumptions, suggested_follow_ups: out.suggested_follow_ups.slice(0, 3) },
        generation_id: result.generationId,
        created_at: new Date(now + 1).toISOString(),
      },
    ])
    .select("id, role, content, attachments, metadata, is_saved, created_at");
  if (msgError) return jsonError(500, "SERVER_ERROR", "The answer was generated but couldn't be saved.");
  await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  const strip = (m: Record<string, unknown>) => ({ ...m, attachments: ((m.attachments as { name: string; chars?: number }[]) ?? []).map((a) => ({ name: a.name, chars: a.chars })) });
  return NextResponse.json({ ok: true, conversationId, messages: (inserted ?? []).map(strip), creditsCharged: result.creditsCharged });
}
