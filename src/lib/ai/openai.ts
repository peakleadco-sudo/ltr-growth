import "server-only";
import { AIProviderError, type TextGenerationRequest, type TextGenerationResult, type TextProvider } from "./provider";

export class OpenAITextProvider implements TextProvider {
  readonly name = "openai";
  constructor(private defaultModel = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini") {}

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generateJson<T>(req: TextGenerationRequest): Promise<TextGenerationResult<T>> {
    if (!this.isConfigured()) throw new AIProviderError("NOT_CONFIGURED", "OpenAI is not configured. Set OPENAI_API_KEY.");
    const model = req.model || this.defaultModel;
    let res: Response;
    try {
      res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          response_format: { type: "json_schema", json_schema: { name: req.schemaName, strict: true, schema: req.schema } },
          max_completion_tokens: req.maxOutputTokens ?? 2000,
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (e) {
      if ((e as Error).name === "TimeoutError") throw new AIProviderError("TIMEOUT", "The AI provider took too long to respond.");
      throw new AIProviderError("PROVIDER_ERROR", "Couldn't reach the AI provider.");
    }
    if (res.status === 429) throw new AIProviderError("RATE_LIMITED", "The AI provider is busy. Please try again shortly.");
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AIProviderError("PROVIDER_ERROR", `AI provider error (${res.status}). ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string; refusal?: string } ; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = json.choices?.[0];
    if (choice?.message?.refusal) throw new AIProviderError("INVALID_OUTPUT", "The AI declined this request.");
    if (choice?.finish_reason === "length") throw new AIProviderError("INVALID_OUTPUT", "The AI response was cut off. Try a shorter request.");
    let data: T;
    try {
      data = JSON.parse(choice?.message?.content ?? "") as T;
    } catch {
      throw new AIProviderError("INVALID_OUTPUT", "The AI returned an unreadable response.");
    }
    return {
      data,
      model: json.model ?? model,
      provider: this.name,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  }
}

let provider: TextProvider | null = null;
export function getTextProvider(): TextProvider {
  // Extend here to support additional providers (e.g. via AI_TEXT_PROVIDER env or ai_settings).
  if (!provider) provider = new OpenAITextProvider();
  return provider;
}
