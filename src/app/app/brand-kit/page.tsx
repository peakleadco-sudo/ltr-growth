import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/feedback";
import { hasFeature, requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import type { BrandAsset } from "@/lib/types";
import { BrandKitEditor } from "./editor";

export const metadata: Metadata = { title: "Brand Kit" };

export default async function BrandKitPage() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("business_profile_id", ws.activeBusiness!.id)
    .in("kind", ["logo", "product_photo", "brand_imagery"])
    .order("created_at", { ascending: false })
    .limit(60);
  const assets = (data ?? []) as BrandAsset[];
  const storage = isServiceRoleConfigured();
  const urls = storage ? await signedUrls(assets.map((a) => a.storage_path)) : {};

  return (
    <div>
      <PageHeader title="Brand Kit" description="Your approved brand identity. Every AI tool uses this automatically, so content stays on-brand." />
      <BrandKitEditor
        kit={ws.brandKit}
        businessName={ws.activeBusiness!.name}
        businessProfileId={ws.activeBusiness!.id}
        assets={assets.map((a) => ({ id: a.id, kind: a.kind, title: a.title, url: urls[a.storage_path] ?? null }))}
        fullAccess={hasFeature(ws, "brand_kit")}
        storageConfigured={storage}
      />
    </div>
  );
}
