import type { z } from "zod";
import type { FeatureKey } from "@/lib/features";
import type { Schema } from "@/lib/ai/schema";

/** A server-side AI tool definition. One per marketing tool; prompts live with the tool. */
export type ToolDefinition<I extends Record<string, unknown> = Record<string, unknown>> = {
  id: ToolId;
  label: string;
  feature: FeatureKey;
  input: z.ZodType<I>;
  output: Schema;
  /** Top-level output keys that can be regenerated on their own. */
  sections: Record<string, string>;
  credits: (input: I) => number;
  maxOutputTokens: (input: I) => number;
  temperature?: number;
  system: string;
  /** Task-specific request text. Business context is added by the engine. */
  user: (input: I) => string;
  /** Short title for history lists. */
  title: (input: I) => string;
};

export type ToolId = "ad_studio" | "social_studio" | "strategy" | "website_copy" | "email_sms";

export const SECTION_REGEN_CREDITS = 1;
