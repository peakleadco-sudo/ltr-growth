import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ai/tool-shell";
import { loadToolPage } from "@/lib/ai/tool-page";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SocialStudio } from "./studio";
import { SocialLibrary, type SavedPost } from "./library";

export const metadata: Metadata = { title: "Social Media Studio" };

export default async function SocialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const view = sp.view === "library" ? "library" : "create";
  const { ws, included, aiConfigured, remaining, reopened } = await loadToolPage("social_studio", "social_studio", sp.g);

  let posts: SavedPost[] = [];
  if (included) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("social_content")
      .select("id, platform, content_type, title, body, status, planned_for, created_at")
      .eq("business_profile_id", ws.activeBusiness!.id)
      .order("planned_for", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true })
      .limit(300);
    posts = (data ?? []) as SavedPost[];
  }

  return (
    <ToolShell
      title="Social Media Studio"
      description="Platform-native posts, scripts and 7, 14 or 30-day content plans for Instagram, Facebook, TikTok, LinkedIn, YouTube and X."
      included={included}
      minPlan="starter"
      aiConfigured={aiConfigured}
      historyTool="social_studio"
    >
      <nav className="mb-5 flex gap-1 border-b border-border" aria-label="Social studio views">
        {[["create", "Create"], ["library", `Saved posts (${posts.length})`]].map(([v, label]) => (
          <Link key={v} href={v === "create" ? "/app/social" : "/app/social?view=library"} aria-current={view === v ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm transition-colors", view === v ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}>
            {label}
          </Link>
        ))}
      </nav>
      {view === "library" ? (
        <SocialLibrary posts={posts} />
      ) : (
        <SocialStudio key={reopened?.generationId ?? "new"} remaining={remaining} reopened={reopened} />
      )}
    </ToolShell>
  );
}
