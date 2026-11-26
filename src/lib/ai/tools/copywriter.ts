import { z } from "zod";
import { s } from "@/lib/ai/schema";
import { formatInputs } from "@/lib/ai/context";
import type { ToolDefinition } from "./types";
import { assumptionsField, systemPrompt, TONES } from "./common";

export const PAGE_TYPES = {
  home: "Home page",
  about: "About Us page",
  service: "Service page",
  product: "Product description",
  landing: "Landing page",
  faq: "FAQ section",
  ctas: "Calls to action",
  headlines: "Headlines",
  seo_meta: "SEO titles & meta descriptions",
  location: "Location-specific service page",
  lead_form: "Lead capture form recommendations",
} as const;
export type PageType = keyof typeof PAGE_TYPES;

export const CONVERSION_GOALS = ["Get leads / quote requests", "Phone calls", "Bookings / appointments", "Online purchases", "Newsletter sign-ups", "Store visits", "Build trust / awareness"] as const;

const input = z.object({
  page_type: z.enum(Object.keys(PAGE_TYPES) as [PageType, ...PageType[]]),
  subject: z.string().trim().max(500).optional().default(""),
  audience: z.string().trim().max(400).optional().default(""),
  goal: z.enum(CONVERSION_GOALS),
  tone: z.enum(TONES),
  location: z.string().trim().max(120).optional().default(""),
  keywords: z.string().trim().max(300).optional().default(""),
  variants: z.union([z.literal(1), z.literal(2)]).optional().default(2),
  notes: z.string().trim().max(1000).optional().default(""),
}).refine((v) => v.page_type !== "location" || v.location.length > 1, { message: "Enter the location for this page", path: ["location"] });
export type CopyInput = z.infer<typeof input>;

const variant = s.obj({
  label: s.str("Short name for the angle of this version, e.g. 'Trust-led'"),
  seo_title: s.str("Max 60 characters"),
  meta_description: s.str("Max 155 characters"),
  h1: s.str(),
  sections: s.arr(s.obj({
    purpose: s.str("e.g. Hero, Problem, Services, Process, Proof, FAQ, Final CTA"),
    heading: s.str(),
    body: s.str("Plain text. Use line breaks between paragraphs and '- ' for bullets."),
    cta_label: s.str("Button text, empty if none"),
  })),
  faqs: s.arr(s.obj({ question: s.str(), answer: s.str() })),
  ctas: s.arr(s.str()),
  form_recommendations: s.arr(s.str("Fields, placement and friction advice for lead capture")),
});

const output = s.obj({
  variants: s.arr(variant),
  implementation_notes: s.arr(s.str()),
  assumptions: assumptionsField,
});

export const copywriterTool: ToolDefinition<CopyInput> = {
  id: "website_copy",
  label: "Website Copywriter",
  feature: "website_copy",
  input: input as unknown as z.ZodType<CopyInput>,
  output,
  sections: { variants: "All versions", implementation_notes: "Implementation notes" },
  credits: (i) => (i.variants === 2 ? 2 : 1),
  maxOutputTokens: (i) => (i.variants === 2 ? 9000 : 5000),
  temperature: 0.7,
  system: systemPrompt("a conversion copywriter and SEO specialist", [
    "Write scannable copy: short paragraphs, specific benefits, one primary CTA repeated consistently.",
    "Use target keywords naturally; never keyword-stuff. Never fabricate testimonials, ratings, years in business, licences or customer counts; use [placeholder] where proof belongs.",
    "Sections that do not apply to the requested page type may be omitted; for FAQ / CTA / headline / meta / form requests, put the requested items in the matching fields and keep sections minimal.",
  ]),
  user: (i) =>
    [
      `Write ${PAGE_TYPES[i.page_type]} copy. Produce ${i.variants} distinct version${i.variants > 1 ? "s with different angles so they can be compared side by side" : ""}.`,
      formatInputs(
        { subject: i.subject, audience: i.audience, goal: i.goal, tone: i.tone, location: i.location, keywords: i.keywords, notes: i.notes },
        { subject: "Page subject (service/product)", audience: "Audience", goal: "Conversion goal", tone: "Tone", location: "Location", keywords: "Target keywords", notes: "Additional notes" },
      ),
    ].join("\n\n"),
  title: (i) => `${PAGE_TYPES[i.page_type]}${i.subject ? ` · ${i.subject.slice(0, 50)}` : ""}`,
};
