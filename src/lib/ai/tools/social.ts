import { z } from "zod";
import { s } from "@/lib/ai/schema";
import { formatInputs } from "@/lib/ai/context";
import type { ToolDefinition } from "./types";
import { assumptionsField, systemPrompt, TONES } from "./common";

export const SOCIAL_PLATFORMS = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
} as const;
export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;
const PLATFORM_KEYS = Object.keys(SOCIAL_PLATFORMS) as [SocialPlatform, ...SocialPlatform[]];

export const SOCIAL_CONTENT_TYPES = [
  "Caption",
  "Carousel",
  "Educational post",
  "Promotional post",
  "Short-form video script",
  "Reel script",
  "TikTok hooks",
  "Story ideas",
  "Engagement prompt",
  "Product announcement",
  "Seasonal campaign",
] as const;

const input = z.object({
  mode: z.enum(["posts", "plan"]),
  platforms: z.array(z.enum(PLATFORM_KEYS)).min(1, "Pick at least one platform").max(6),
  content_types: z.array(z.enum(SOCIAL_CONTENT_TYPES)).max(11).optional().default([]),
  plan_days: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional().default(7),
  post_count: z.number().int().min(1).max(10).optional().default(3),
  topic: z.string().trim().max(500).optional().default(""),
  tone: z.enum(TONES),
  promotion: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type SocialInput = z.infer<typeof input>;

const post = s.obj({
  day: s.int("Day number in the plan, starting at 1. Use 1 for standalone posts."),
  platform: s.enum(PLATFORM_KEYS),
  content_type: s.enum(SOCIAL_CONTENT_TYPES),
  title: s.str("Short internal title"),
  hook: s.str("First line or first 2 seconds"),
  caption: s.str("Full caption ready to paste"),
  script: s.arr(s.obj({ timing: s.str(), visual: s.str(), voiceover: s.str() }), "Shot list for video formats; empty for static posts"),
  slides: s.arr(s.str(), "Slide-by-slide text for carousels; empty otherwise"),
  visual_idea: s.str("What to show. Prefer the business's own photos and footage."),
  hashtags: s.arr(s.str()),
  cta: s.str(),
});

const output = s.obj({
  strategy_summary: s.str("2-4 sentences on the approach. For standalone posts, one sentence."),
  content_pillars: s.arr(s.obj({ name: s.str(), purpose: s.str() })),
  posts: s.arr(post),
  story_ideas: s.arr(s.str()),
  engagement_prompts: s.arr(s.str()),
  assumptions: assumptionsField,
});

export const socialTool: ToolDefinition<SocialInput> = {
  id: "social_studio",
  label: "Social Media Studio",
  feature: "social_studio",
  input: input as z.ZodType<SocialInput>,
  output,
  sections: {
    strategy_summary: "Strategy",
    content_pillars: "Content pillars",
    posts: "Posts",
    story_ideas: "Story ideas",
    engagement_prompts: "Engagement prompts",
  },
  credits: (i) => (i.mode === "plan" ? (i.plan_days === 30 ? 4 : i.plan_days === 14 ? 3 : 2) : 1),
  maxOutputTokens: (i) => (i.mode === "plan" ? (i.plan_days === 30 ? 16000 : i.plan_days === 14 ? 10000 : 7000) : 4000),
  temperature: 0.85,
  system: systemPrompt("a social media strategist and content creator", [
    "Write natively for each platform: platform-appropriate length, hooks and hashtag counts (e.g. 3-5 on Instagram/TikTok, 0-2 on LinkedIn and X).",
    "Never claim content has been published or scheduled. Never write fake customer quotes or reviews.",
  ]),
  user: (i) => {
    const platforms = i.platforms.map((p) => SOCIAL_PLATFORMS[p]).join(", ");
    const task =
      i.mode === "plan"
        ? `Create a ${i.plan_days}-day social media content plan across ${platforms}. Produce one post per day (day 1 to ${i.plan_days}), rotating platforms and content types to build a balanced mix of educational, promotional and engagement content.`
        : `Create ${i.post_count} ready-to-post social media post${i.post_count > 1 ? "s" : ""} for ${platforms}.${i.content_types.length ? ` Content types: ${i.content_types.join(", ")}.` : ""} Use day 1 for every post.`;
    return [
      task,
      formatInputs(
        { topic: i.topic, tone: i.tone, promotion: i.promotion, preferred_types: i.mode === "plan" ? i.content_types : [], notes: i.notes },
        { topic: "Topic or focus", tone: "Tone", promotion: "Current promotion (only mention if provided)", preferred_types: "Preferred content types", notes: "Additional notes" },
      ),
    ].join("\n\n");
  },
  title: (i) => (i.mode === "plan" ? `${i.plan_days}-day content plan` : `${i.post_count} post${i.post_count > 1 ? "s" : ""}${i.topic ? ` · ${i.topic.slice(0, 50)}` : ""}`),
};
