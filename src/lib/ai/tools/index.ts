import type { ToolDefinition, ToolId } from "./types";
import { adStudioTool } from "./ad-studio";
import { socialTool } from "./social";
import { strategyTool } from "./strategy";
import { copywriterTool } from "./copywriter";
import { emailTool } from "./email";

export const TOOLS: Record<ToolId, ToolDefinition<never>> = {
  ad_studio: adStudioTool as unknown as ToolDefinition<never>,
  social_studio: socialTool as unknown as ToolDefinition<never>,
  strategy: strategyTool as unknown as ToolDefinition<never>,
  website_copy: copywriterTool as unknown as ToolDefinition<never>,
  email_sms: emailTool as unknown as ToolDefinition<never>,
};

export function getTool(id: string): ToolDefinition<Record<string, unknown>> | null {
  return (TOOLS as Record<string, unknown>)[id] ? (TOOLS[id as ToolId] as unknown as ToolDefinition<Record<string, unknown>>) : null;
}

/** Human labels for every tool id stored in ai_generations. */
export const TOOL_LABELS: Record<string, string> = {
  ad_studio: "Ad Studio",
  social_studio: "Social Media Studio",
  strategy: "Marketing Strategy",
  website_copy: "Website Copywriter",
  email_sms: "Email & SMS",
  assistant: "LTR AI",
  onboarding_extraction: "Onboarding",
};

export const TOOL_PATHS: Record<string, string> = {
  ad_studio: "/app/ads",
  social_studio: "/app/social",
  strategy: "/app/strategy",
  website_copy: "/app/copywriter",
  email_sms: "/app/email",
  assistant: "/app/assistant",
};
