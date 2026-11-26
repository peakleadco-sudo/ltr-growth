import type { Metadata } from "next";
import { ToolShell } from "@/components/ai/tool-shell";
import { loadToolPage } from "@/lib/ai/tool-page";
import { createClient } from "@/lib/supabase/server";
import { EmailStudio, type SavedCampaign } from "./studio";

export const metadata: Metadata = { title: "Email & SMS" };

export default async function EmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ws, included, aiConfigured, remaining, reopened } = await loadToolPage("email_sms", "email_sms", sp.g);
  let saved: SavedCampaign[] = [];
  let open: SavedCampaign | null = null;
  if (included) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("email_campaigns")
      .select("id, title, channel, campaign_type, content, generation_id, updated_at")
      .eq("business_profile_id", ws.activeBusiness!.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    saved = (data ?? []) as SavedCampaign[];
    if (typeof sp.campaign === "string") open = saved.find((c) => c.id === sp.campaign) ?? null;
  }
  return (
    <ToolShell
      title="Email & SMS"
      description="Sequences, promotions, follow-ups, reminders and SMS templates with subject lines, preview text and A/B variations. Nothing is sent automatically."
      included={included}
      minPlan="starter"
      aiConfigured={aiConfigured}
      historyTool="email_sms"
    >
      <EmailStudio key={open?.id ?? reopened?.generationId ?? "new"} remaining={remaining} reopened={reopened} saved={saved} open={open} />
    </ToolShell>
  );
}
