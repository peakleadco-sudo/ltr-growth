"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Badge, Input, NativeSelect } from "@/components/ui/primitives";
import { CopyButton, DeleteIconButton } from "@/components/ai/result-kit";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/ai/tools/social";
import { downloadFile, toCsv } from "@/lib/export";
import { formatDate } from "@/lib/utils";
import { deletePost, updatePost } from "./actions";
import type { Post } from "./studio";

export type SavedPost = {
  id: string;
  platform: SocialPlatform;
  content_type: string;
  title: string | null;
  body: Omit<Post, "platform" | "content_type" | "title">;
  status: "draft" | "approved" | "scheduled" | "published";
  planned_for: string | null;
  created_at: string;
};

const STATUS_LABEL = { draft: "Draft", approved: "Approved", scheduled: "Scheduled (by you)", published: "Published (by you)" } as const;
const STATUS_TONE = { draft: "neutral", approved: "info", scheduled: "warning", published: "success" } as const;

export function SocialLibrary({ posts }: { posts: SavedPost[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [pending, start] = useTransition();
  const filtered = useMemo(() => posts.filter((p) => (status === "all" || p.status === status) && (platform === "all" || p.platform === platform)), [posts, status, platform]);

  if (posts.length === 0) {
    return <EmptyState icon={MessageSquareText} title="No saved posts yet" description="Generate posts or a content plan, then save them as drafts to track them here." action={<Button asChild size="sm"><Link href="/app/social">Create content</Link></Button>} />;
  }

  const change = (id: string, patch: { status?: string; planned_for?: string | null }) =>
    start(async () => {
      const r = await updatePost({ id, ...patch });
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Filter by status" className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Filter by platform" className="w-40" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {Object.entries(SOCIAL_PLATFORMS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => downloadFile("saved-social-posts.csv", toCsv(filtered.map((p) => ({ date: p.planned_for ?? "", platform: SOCIAL_PLATFORMS[p.platform], type: p.content_type, status: p.status, title: p.title ?? "", caption: p.body.caption, hashtags: (p.body.hashtags ?? []).join(" "), cta: p.body.cta ?? "" }))), "text/csv")}>
          <Download /> Export CSV
        </Button>
      </div>
      <p className="text-xs text-subtle">Scheduled and published are statuses you set yourself to track progress; LTR Growth does not post to social networks.</p>
      <div className="overflow-hidden rounded-lg border border-border" aria-busy={pending || undefined}>
        <ul className="divide-y divide-border">
          {filtered.map((p) => (
            <li key={p.id} className="grid gap-3 bg-card p-3 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-start">
              <div className="space-y-1.5">
                <Input type="date" aria-label="Planned date" value={p.planned_for ?? ""} onChange={(e) => change(p.id, { planned_for: e.target.value || null })} className="h-8 text-xs" />
                <NativeSelect aria-label="Status" value={p.status} onChange={(e) => change(p.id, { status: e.target.value })} className="h-8 text-xs">
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </NativeSelect>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{SOCIAL_PLATFORMS[p.platform]}</Badge>
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <span className="text-xs text-subtle">{p.content_type}</span>
                </div>
                {p.title && <p className="mt-1.5 text-sm font-medium">{p.title}</p>}
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] text-muted">{p.body.caption}</p>
                <p className="mt-1 text-[11px] text-subtle">Saved {formatDate(p.created_at)}</p>
              </div>
              <div className="flex gap-1 md:flex-col">
                <CopyButton size="icon-sm" label="Copy caption" text={[p.body.caption, (p.body.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")].filter(Boolean).join("\n\n")} />
                <DeleteIconButton label="Delete post" onClick={() => { if (confirm("Delete this post?")) start(async () => { const r = await deletePost(p.id); if (!r.ok) toast.error(r.error); else router.refresh(); }); }} />
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted">No posts match these filters.</li>}
        </ul>
      </div>
    </div>
  );
}
