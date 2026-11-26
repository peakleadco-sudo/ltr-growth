import type { Metadata } from "next";
import { ToolShell } from "@/components/ai/tool-shell";
import { loadToolPage } from "@/lib/ai/tool-page";
import { createClient } from "@/lib/supabase/server";
import { Copywriter, type SavedCopy } from "./studio";

export const metadata: Metadata = { title: "Website Copywriter" };

export default async function CopywriterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ws, included, aiConfigured, remaining, reopened } = await loadToolPage("website_copy", "website_copy", sp.g);
  let saved: SavedCopy[] = [];
  let open: SavedCopy | null = null;
  if (included) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("website_copies")
      .select("id, title, page_type, content, generation_id, updated_at")
      .eq("business_profile_id", ws.activeBusiness!.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    saved = (data ?? []) as SavedCopy[];
    if (typeof sp.copy === "string") open = saved.find((c) => c.id === sp.copy) ?? null;
  }
  return (
    <ToolShell
      title="Website Copywriter"
      description="Conversion-focused page copy with SEO titles and meta descriptions, structured to paste straight into your website builder."
      included={included}
      minPlan="starter"
      aiConfigured={aiConfigured}
      historyTool="website_copy"
    >
      <Copywriter key={open?.id ?? reopened?.generationId ?? "new"} remaining={remaining} reopened={reopened} saved={saved} open={open} defaultLocation={ws.activeBusiness!.location ?? ""} />
    </ToolShell>
  );
}
