import type { Metadata } from "next";
import { ToolShell } from "@/components/ai/tool-shell";
import { loadToolPage } from "@/lib/ai/tool-page";
import { createClient } from "@/lib/supabase/server";
import { AdStudio, type SavedAd } from "./studio";

export const metadata: Metadata = { title: "Ad Studio" };

export default async function AdStudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ws, included, aiConfigured, remaining, reopened } = await loadToolPage("ad_studio", "ad_studio", sp.g);

  let saved: SavedAd[] = [];
  let openAd: SavedAd | null = null;
  if (included) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("generated_ads")
      .select("id, title, platform, brief, content, generation_id, updated_at")
      .eq("business_profile_id", ws.activeBusiness!.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    saved = (data ?? []) as SavedAd[];
    if (typeof sp.ad === "string") openAd = saved.find((a) => a.id === sp.ad) ?? null;
  }

  return (
    <ToolShell
      title="Ad Studio"
      description="Complete ad packages for Meta, Google, TikTok, Instagram, YouTube and LinkedIn, written for your business and brand voice."
      included={included}
      minPlan="starter"
      aiConfigured={aiConfigured}
      historyTool="ad_studio"
    >
      <AdStudio
        key={openAd?.id ?? reopened?.generationId ?? "new"}
        remaining={remaining}
        saved={saved}
        openAd={openAd}
        reopened={reopened}
        defaults={{ product: ws.activeBusiness!.products_services ?? "", audience: ws.activeBusiness!.target_audience ?? "" }}
      />
    </ToolShell>
  );
}
