import "server-only";

/**
 * Provider-agnostic AI interface. Swap implementations without touching tools.
 * All calls are server-side; API keys never reach the browser.
 */
export type JsonSchema = Record<string, unknown>;

export type TextGenerationRequest = {
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type TextGenerationResult<T> = {
  data: T;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
};

export interface TextProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateJson<T>(req: TextGenerationRequest): Promise<TextGenerationResult<T>>;
}

export class AIProviderError extends Error {
  constructor(public code: "NOT_CONFIGURED" | "PROVIDER_ERROR" | "INVALID_OUTPUT" | "RATE_LIMITED" | "TIMEOUT", message: string) {
    super(message);
  }
}
