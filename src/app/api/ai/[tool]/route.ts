import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/workspace";
import { getTool } from "@/lib/ai/tools";
import { SECTION_REGEN_CREDITS } from "@/lib/ai/tools/types";
import { generate } from "@/lib/ai/engine";
import { sectionSchema } from "@/lib/ai/schema";
import { wrapUntrusted } from "@/lib/ai/prompts/shared";
import { isSameOrigin, jsonError, zodMessage } from "@/lib/api";

export const maxDuration = 300;

const body = z.object({
  requestId: z.uuid(),
  input: z.record(z.string(), z.unknown()),
  section: z.string().max(60).nullable().optional(),
  current: z.unknown().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  const { tool: toolId } = await params;
  const tool = getTool(toolId);
  if (!tool) return jsonError(404, "NOT_FOUND", "Unknown tool.");

  const ws = await getWorkspace();
  if (!ws) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");

  const parsedBody = body.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return jsonError(400, "VALIDATION", zodMessage(parsedBody.error));
  const parsedInput = tool.input.safeParse(parsedBody.data.input);
  if (!parsedInput.success) return jsonError(400, "VALIDATION", zodMessage(parsedInput.error));
  const input = parsedInput.data;

  const section = parsedBody.data.section ?? null;
  if (section && !(section in tool.sections)) return jsonError(400, "VALIDATION", "Unknown section.");

  let userPrompt = tool.user(input);
  if (section) {
    const current = JSON.stringify(parsedBody.data.current ?? null).slice(0, 8000);
    userPrompt += `\n\nRegenerate ONLY the "${section}" part with fresh, improved alternatives. Return an object containing just that key. The current version is shown for reference; do not repeat it.\n${wrapUntrusted("current_version", current)}`;
  }

  try {
    const result = await generate<Record<string, unknown>>({
      ws,
      tool: tool.id,
      feature: tool.feature,
      title: section ? `${tool.title(input)} · ${tool.sections[section]}` : tool.title(input),
      input,
      section,
      credits: section ? SECTION_REGEN_CREDITS : tool.credits(input),
      requestId: parsedBody.data.requestId,
      system: tool.system,
      user: userPrompt,
      schemaName: section ? `${tool.id}_${section}` : tool.id,
      schema: section ? sectionSchema(tool.output, section) : tool.output,
      maxOutputTokens: section ? Math.min(tool.maxOutputTokens(input), 8000) : tool.maxOutputTokens(input),
      temperature: tool.temperature,
    });
    if (!result.ok) return jsonError(result.status, result.code, result.message, result.extra);
    return NextResponse.json({ ok: true, generationId: result.generationId, output: result.output, creditsCharged: result.creditsCharged, duplicate: result.duplicate });
  } catch (e) {
    console.error("[ai]", toolId, e);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. You weren't charged.");
  }
}
