import { z } from "zod";
import { s } from "@/lib/ai/schema";
import { formatInputs } from "@/lib/ai/context";
import type { ToolDefinition } from "./types";
import { assumptionsField, systemPrompt, TONES } from "./common";

export const EMAIL_TYPES = {
  welcome: "Welcome sequence",
  promotional: "Promotional email",
  follow_up: "Customer follow-up",
  nurture: "Lead nurturing sequence",
  abandoned_cart: "Abandoned cart sequence",
  appointment_reminder: "Appointment reminders",
  review_request: "Review request",
  reactivation: "Customer reactivation",
  seasonal: "Seasonal promotion",
  cold_outreach: "Cold outreach draft",
  sms_follow_up: "SMS follow-up templates",
} as const;
export type EmailType = keyof typeof EMAIL_TYPES;

const input = z.object({
  campaign_type: z.enum(Object.keys(EMAIL_TYPES) as [EmailType, ...EmailType[]]),
  channel: z.enum(["email", "sms"]),
  message_count: z.number().int().min(1).max(7),
  audience: z.string().trim().max(400).optional().default(""),
  offer: z.string().trim().max(300).optional().default(""),
  goal: z.string().trim().max(300).optional().default(""),
  tone: z.enum(TONES),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type EmailInput = z.infer<typeof input>;

const output = s.obj({
  sequence_name: s.str(),
  messages: s.arr(s.obj({
    order: s.int(),
    send_timing: s.str("e.g. 'Immediately after sign-up', 'Day 3'"),
    purpose: s.str(),
    subject_lines: s.arr(s.str(), "3 options for email; empty for SMS"),
    preview_text: s.str("Empty for SMS"),
    body: s.str("Email body in plain text with line breaks, or SMS text under 320 characters including opt-out language"),
    cta: s.str(),
  })),
  ab_variations: s.arr(s.obj({ element: s.str(), variant_a: s.str(), variant_b: s.str() })),
  compliance_notes: s.arr(s.str("Consent, unsubscribe/opt-out, sender identification and quiet-hours reminders relevant to this campaign")),
  assumptions: assumptionsField,
});

export const emailTool: ToolDefinition<EmailInput> = {
  id: "email_sms",
  label: "Email & SMS",
  feature: "email_sms",
  input: input as z.ZodType<EmailInput>,
  output,
  sections: { messages: "Messages", ab_variations: "A/B variations", compliance_notes: "Compliance" },
  credits: (i) => (i.message_count > 3 ? 2 : 1),
  maxOutputTokens: (i) => 1500 + i.message_count * 900,
  temperature: 0.7,
  system: systemPrompt("an email and SMS marketing specialist", [
    "Every email must leave room for an unsubscribe link and the sender's physical address (write [unsubscribe link] / [business address] placeholders). Every SMS must include opt-out language such as 'Reply STOP to opt out'.",
    "Cold outreach must be honest about who is sending and why, without deceptive subject lines.",
    "Review requests must ask for honest reviews and must never offer incentives for positive reviews or filter who is asked.",
    "Use merge tags like {first_name} rather than invented names.",
  ]),
  user: (i) =>
    [
      `Write a ${EMAIL_TYPES[i.campaign_type]} for ${i.channel === "sms" ? "SMS" : "email"} with ${i.message_count} message${i.message_count > 1 ? "s" : ""}.`,
      formatInputs(
        { audience: i.audience, offer: i.offer, goal: i.goal, tone: i.tone, notes: i.notes },
        { audience: "Audience", offer: "Offer (only mention if provided)", goal: "Goal", tone: "Tone", notes: "Additional notes" },
      ),
    ].join("\n\n"),
  title: (i) => `${EMAIL_TYPES[i.campaign_type]} · ${i.message_count} ${i.channel === "sms" ? "SMS" : "email"}${i.message_count > 1 ? "s" : ""}`,
};
