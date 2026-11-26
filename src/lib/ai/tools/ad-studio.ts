import { z } from "zod";
import { s } from "@/lib/ai/schema";
import { formatInputs } from "@/lib/ai/context";
import type { ToolDefinition } from "./types";
import { assumptionsField, systemPrompt, TONES } from "./common";

export const AD_PLATFORMS = {
  meta: "Meta (Facebook) Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  instagram: "Instagram Ads",
  youtube: "YouTube Ads",
  linkedin: "LinkedIn Ads",
} as const;
export type AdPlatform = keyof typeof AD_PLATFORMS;

export const AD_OBJECTIVES = ["Leads", "Sales", "Website traffic", "Calls", "Bookings", "Brand awareness", "App installs", "Store visits", "Engagement"] as const;
export const AD_FORMATS = ["Single image", "Carousel", "Short video (under 30s)", "Long video", "UGC video", "Search text ad", "Story / vertical"] as const;

const PLATFORM_RULES: Record<AdPlatform, string> = {
  google: "Google responsive search ads: headlines max 30 characters, descriptions max 90 characters. Provide at least 10 headlines and 4 descriptions.",
  meta: "Meta: primary text should front-load the hook in the first 125 characters; headlines max 40 characters; descriptions max 30 characters.",
  instagram: "Instagram: visual-first, hook in the first line, headlines max 40 characters.",
  tiktok: "TikTok: native, creator-style; the first 2 seconds of a script must hook. Ad text max 100 characters.",
  youtube: "YouTube: the first 5 seconds must hook before the skip button; include a clear spoken CTA.",
  linkedin: "LinkedIn: professional tone, introductory text up to 150 characters before truncation, headline max 70 characters.",
};

const input = z.object({
  platform: z.enum(Object.keys(AD_PLATFORMS) as [AdPlatform, ...AdPlatform[]]),
  product: z.string().trim().min(2, "Describe the product or service").max(500),
  objective: z.enum(AD_OBJECTIVES),
  audience: z.string().trim().max(500).optional().default(""),
  offer: z.string().trim().max(300).optional().default(""),
  budget: z.number().min(0).max(10_000_000).nullable().optional().default(null),
  tone: z.enum(TONES),
  format: z.enum(AD_FORMATS),
  cta: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type AdInput = z.infer<typeof input>;

const output = s.obj({
  primary_texts: s.arr(s.str(), "3-5 primary ad copy variations"),
  headlines: s.arr(s.str()),
  descriptions: s.arr(s.str()),
  hooks: s.arr(s.str(), "5-8 scroll-stopping opening hooks"),
  video_script: s.obj({ duration_seconds: s.int(), scenes: s.arr(s.obj({ timing: s.str(), visual: s.str(), voiceover: s.str(), on_screen_text: s.str() })) }),
  ugc_script: s.obj({ creator_brief: s.str(), script: s.arr(s.obj({ timing: s.str(), line: s.str(), direction: s.str() })) }),
  voiceover_script: s.str(),
  creative_concepts: s.arr(s.obj({ name: s.str(), visual_description: s.str(), copy_angle: s.str() })),
  audience_segments: s.arr(s.obj({ name: s.str(), targeting: s.str(), rationale: s.str() })),
  campaign_structure: s.obj({
    summary: s.str(),
    ad_sets: s.arr(s.obj({ name: s.str(), audience: s.str(), ads: s.arr(s.str()), budget_share_percent: s.int() })),
  }),
  ab_tests: s.arr(s.obj({ variable: s.str(), variant_a: s.str(), variant_b: s.str(), success_metric: s.str() })),
  landing_page_recommendations: s.arr(s.str()),
  budget_suggestion: s.obj({
    daily_budget_guidance: s.str(),
    test_period: s.str(),
    rationale: s.str(),
  }),
  assumptions: assumptionsField,
});

export const adStudioTool: ToolDefinition<AdInput> = {
  id: "ad_studio",
  label: "Ad Studio",
  feature: "ad_studio",
  input: input as z.ZodType<AdInput>,
  output,
  sections: {
    primary_texts: "Primary copy",
    headlines: "Headlines",
    descriptions: "Descriptions",
    hooks: "Hooks",
    video_script: "Video script",
    ugc_script: "UGC script",
    voiceover_script: "Voiceover",
    creative_concepts: "Creative concepts",
    audience_segments: "Audience segments",
    campaign_structure: "Campaign structure",
    ab_tests: "A/B tests",
    landing_page_recommendations: "Landing page",
    budget_suggestion: "Budget",
  },
  credits: () => 2,
  maxOutputTokens: () => 6000,
  temperature: 0.8,
  system: systemPrompt("a senior direct-response advertising strategist and copywriter", [
    "Respect each ad platform's character limits and advertising policies. Avoid prohibited claims (health cures, guaranteed income, before/after implications) and personal-attribute targeting language.",
    "Budget guidance must be framed as a starting test budget with rationale, never a promise of results. Do not quote expected CPCs, conversion rates or ROAS as facts.",
  ]),
  user: (i) =>
    [
      `Create a complete ad package for ${AD_PLATFORMS[i.platform]}.`,
      PLATFORM_RULES[i.platform],
      formatInputs(
        { ...i, platform: AD_PLATFORMS[i.platform], budget: i.budget === null ? "" : `$${i.budget} total` },
        { product: "Product or service", objective: "Campaign objective", audience: "Target audience", offer: "Offer", budget: "Budget", tone: "Tone", format: "Creative format", cta: "Call to action", notes: "Additional notes" },
      ),
    ].join("\n\n"),
  title: (i) => `${AD_PLATFORMS[i.platform]} · ${i.product.slice(0, 60)}`,
};
