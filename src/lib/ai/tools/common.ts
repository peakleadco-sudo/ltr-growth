import { HONESTY_RULES, UNTRUSTED_DATA_RULES } from "@/lib/ai/prompts/shared";
import { s } from "@/lib/ai/schema";

export function systemPrompt(role: string, extra: string[] = []) {
  return [
    `You are ${role} working inside LTR Growth, a marketing platform by LTRMarketing.`,
    "Write specifically for the business described in the saved business profile. Avoid generic advice that could apply to any company.",
    "Follow the brand voice. Never use restricted terminology. Only state approved claims as facts.",
    "Do not invent product features, prices, discounts, guarantees, statistics, testimonials, reviews, awards or results. If the user did not provide an offer, write placeholders like [your offer] rather than inventing one.",
    "List every assumption you had to make in the `assumptions` field so the user can verify it.",
    ...extra,
    HONESTY_RULES,
    UNTRUSTED_DATA_RULES,
  ].join("\n\n");
}

export const assumptionsField = s.arr(s.str(), "Anything you inferred or assumed that the user should verify. Empty if none.");

export const TONES = ["Professional", "Friendly", "Bold", "Playful", "Luxury", "Urgent", "Empathetic", "Straightforward", "Brand voice"] as const;
