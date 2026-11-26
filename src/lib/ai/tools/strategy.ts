import { z } from "zod";
import { s } from "@/lib/ai/schema";
import { formatInputs } from "@/lib/ai/context";
import type { ToolDefinition } from "./types";
import { assumptionsField, systemPrompt } from "./common";

export const HORIZONS = { "30_day": "30-day", "60_day": "60-day", "90_day": "90-day", custom: "Custom campaign" } as const;
export type Horizon = keyof typeof HORIZONS;
export const HORIZON_WEEKS: Record<Horizon, number> = { "30_day": 4, "60_day": 8, "90_day": 12, custom: 6 };

const input = z.object({
  horizon: z.enum(Object.keys(HORIZONS) as [Horizon, ...Horizon[]]),
  focus: z.string().trim().max(600).optional().default(""),
  budget: z.number().min(0).max(10_000_000).nullable().optional().default(null),
  campaign_brief: z.string().trim().max(1500).optional().default(""),
  constraints: z.string().trim().max(800).optional().default(""),
}).refine((v) => v.horizon !== "custom" || v.campaign_brief.length >= 10, { message: "Describe the campaign for a custom strategy", path: ["campaign_brief"] });
export type StrategyInput = z.infer<typeof input>;

const CATEGORIES = ["Advertising", "SEO", "Social", "Email", "Website", "Local", "Content", "Sales", "Retention", "Analytics"] as const;

const output = s.obj({
  title: s.str(),
  positioning: s.obj({ statement: s.str(), differentiators: s.arr(s.str()), messaging_pillars: s.arr(s.str()) }),
  audience_analysis: s.str(),
  personas: s.arr(s.obj({ name: s.str(), description: s.str(), pain_points: s.arr(s.str()), motivations: s.arr(s.str()), where_to_reach: s.arr(s.str()) })),
  channels: s.arr(s.obj({ channel: s.str(), priority: s.enum(["high", "medium", "low"]), rationale: s.str() })),
  advertising_strategy: s.str(),
  budget_allocation: s.obj({
    note: s.str("State whether this is based on the user's budget or a hypothetical example."),
    items: s.arr(s.obj({ channel: s.str(), percent: s.int(), rationale: s.str() })),
  }),
  seo_strategy: s.str(),
  social_strategy: s.str(),
  email_strategy: s.str(),
  lead_generation_strategy: s.str(),
  retention_strategy: s.str(),
  weekly_tasks: s.arr(s.obj({
    week: s.int(),
    title: s.str("Imperative, specific, under 90 characters"),
    description: s.str(),
    category: s.enum(CATEGORIES),
    priority: s.enum(["high", "medium", "low"]),
  })),
  kpis: s.arr(s.obj({ name: s.str(), how_to_measure: s.str(), why_it_matters: s.str() })),
  testing_roadmap: s.arr(s.obj({ week: s.int(), test: s.str(), hypothesis: s.str(), success_metric: s.str() })),
  assumptions: assumptionsField,
});

export const strategyTool: ToolDefinition<StrategyInput> = {
  id: "strategy",
  label: "Marketing Strategy",
  feature: "strategy",
  input: input as unknown as z.ZodType<StrategyInput>,
  output,
  sections: {
    positioning: "Positioning",
    audience_analysis: "Audience analysis",
    personas: "Personas",
    channels: "Channels",
    advertising_strategy: "Advertising",
    budget_allocation: "Budget allocation",
    seo_strategy: "SEO",
    social_strategy: "Social media",
    email_strategy: "Email",
    lead_generation_strategy: "Lead generation",
    retention_strategy: "Retention",
    weekly_tasks: "Weekly tasks",
    kpis: "KPIs",
    testing_roadmap: "Testing roadmap",
  },
  credits: (i) => (i.horizon === "90_day" ? 4 : 3),
  maxOutputTokens: (i) => (i.horizon === "90_day" ? 14000 : 10000),
  temperature: 0.6,
  system: systemPrompt("a fractional CMO who builds practical marketing plans for small and mid-sized businesses", [
    "Plans must be realistic for the business's size and budget. Prefer fewer channels executed well.",
    "Budget allocation percentages must sum to 100. If no budget was given, say the split is a hypothetical example.",
    "KPIs describe what to measure and how; never predict specific numbers the business will achieve.",
    "Weekly tasks must be concrete actions the owner can complete, 3-5 per week, covering every week of the plan.",
  ]),
  user: (i) =>
    [
      i.horizon === "custom"
        ? `Create a custom campaign marketing strategy spanning about ${HORIZON_WEEKS.custom} weeks.`
        : `Create a ${HORIZONS[i.horizon]} marketing strategy with weekly tasks for weeks 1 to ${HORIZON_WEEKS[i.horizon]}.`,
      formatInputs(
        { focus: i.focus, budget: i.budget === null ? "" : `$${i.budget} per month`, campaign_brief: i.campaign_brief, constraints: i.constraints },
        { focus: "Focus / priorities", budget: "Marketing budget", campaign_brief: "Campaign brief", constraints: "Constraints" },
      ),
    ].join("\n\n"),
  title: (i) => `${HORIZONS[i.horizon]} strategy${i.focus ? ` · ${i.focus.slice(0, 50)}` : ""}`,
};

export type StrategyOutput = {
  title: string;
  weekly_tasks: { week: number; title: string; description: string; category: string; priority: "high" | "medium" | "low" }[];
  [k: string]: unknown;
};

/** Converts strategy weekly tasks into marketing_tasks rows with due dates (end of each week). */
export function strategyTasks(out: StrategyOutput, startsOn: string, maxWeeks = 26) {
  const start = new Date(`${startsOn}T00:00:00Z`);
  return out.weekly_tasks
    .filter((t) => t.week >= 1 && t.week <= maxWeeks && t.title.trim())
    .map((t) => {
      const due = new Date(start);
      due.setUTCDate(due.getUTCDate() + t.week * 7 - 1);
      return {
        title: t.title.trim().slice(0, 300),
        description: t.description?.slice(0, 2000) ?? null,
        category: t.category,
        priority: t.priority,
        week_number: t.week,
        due_date: due.toISOString().slice(0, 10),
      };
    });
}
