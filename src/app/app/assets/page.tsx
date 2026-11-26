import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { PageHeader, EmptyState, Notice } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import type { BrandAsset } from "@/lib/types";
import { DeleteAssetButton } from "./delete-button";

export const metadata: Metadata = { title: "Saved Assets" };

const KIND_LABEL: Record<string, string> = { logo: "Logo", product_photo: "Product photo", brand_imagery: "Brand image", document: "Document", generated: "Generated", other: "Other" };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ws = await requireWorkspace();
  const supabase = await createClient();
  let q = supabase.from("brand_assets").select("*").eq("business_profile_id", ws.activeBusiness!.id).order("created_at", { ascending: false }).limit(200);
  if (sp.kind && KIND_LABEL[sp.kind]) q = q.eq("kind", sp.kind);
  const { data } = await q;
  const assets = (data ?? []) as BrandAsset[];
  const storage = isServiceRoleConfigured();
  const urls = storage ? await signedUrls(assets.filter((a) => a.mime_type.startsWith("image/")).map((a) => a.storage_path)) : {};

  return (
    <div>
      <PageHeader title="Saved Assets" description="Your media library: logos, product photos, brand imagery and generated creatives." actions={<Button asChild variant="secondary" size="sm"><Link href="/app/brand-kit">Upload in Brand Kit</Link></Button>} />
      {!storage && <Notice tone="integration" className="mb-4" title="File storage isn't configured">Set SUPABASE_SERVICE_ROLE_KEY to enable uploads and previews.</Notice>}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterLink label="All" href="/app/assets" active={!sp.kind} />
        {Object.entries(KIND_LABEL).map(([k, v]) => <FilterLink key={k} label={v} href={`/app/assets?kind=${k}`} active={sp.kind === k} />)}
      </div>
      {assets.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No assets yet" description="Upload your logo and product photos in the Brand Kit. Generated creatives will be saved here too." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <div key={a.id} className="group overflow-hidden rounded-lg border border-border bg-card">
              <a href={`/api/assets/${a.id}`} target="_blank" rel="noopener noreferrer" className="flex aspect-square items-center justify-center bg-bg-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {urls[a.storage_path] ? <img src={urls[a.storage_path]} alt={a.title ?? ""} className="size-full object-contain p-2" loading="lazy" /> : <span className="text-[11px] uppercase text-subtle">{a.mime_type.split("/")[1]}</span>}
              </a>
              <div className="flex items-start justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium">{a.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle"><Badge>{KIND_LABEL[a.kind]}</Badge>{formatDate(a.created_at, { month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={`/api/assets/${a.id}?download=1`} className="rounded p-1 text-[11px] text-subtle hover:text-fg">Download</a>
                  <DeleteAssetButton id={a.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return <Link href={href} className={`rounded-md border px-2.5 py-1 text-[12px] ${active ? "border-accent/50 bg-accent-muted text-fg" : "border-border text-muted hover:text-fg"}`}>{label}</Link>;
}
