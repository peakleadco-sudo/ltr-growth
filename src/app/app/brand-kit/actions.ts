"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, hasFeature } from "@/lib/workspace";
import { brandKitSchema } from "@/lib/schemas";
import type { ActionResult } from "@/app/app/actions";

const BASIC_FIELDS = ["colors", "brand_voice", "voice_traits", "tagline"] as const;

export async function saveBrandKit(input: unknown): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws?.activeBusiness) return { ok: false, error: "Please sign in again." };
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i ? `${String(i.path[0] ?? "Field")}: ${i.message}` : "Invalid input." };
  }
  // Server-side entitlement enforcement: Free plans can only edit the basic fields.
  const full = hasFeature(ws, "brand_kit");
  const data = full
    ? parsed.data
    : Object.fromEntries(Object.entries(parsed.data).filter(([k]) => (BASIC_FIELDS as readonly string[]).includes(k)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_kits")
    .upsert({ ...data, business_profile_id: ws.activeBusiness.id, organization_id: ws.organization.id }, { onConflict: "business_profile_id" });
  if (error) return { ok: false, error: "Couldn't save your brand kit." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function setLogo(assetId: string | null): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws?.activeBusiness) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  if (assetId) {
    const { data } = await supabase.from("brand_assets").select("id").eq("id", assetId).eq("business_profile_id", ws.activeBusiness.id).maybeSingle();
    if (!data) return { ok: false, error: "Asset not found." };
  }
  const { error } = await supabase.from("brand_kits").update({ logo_asset_id: assetId }).eq("business_profile_id", ws.activeBusiness.id);
  if (error) return { ok: false, error: "Couldn't update the logo." };
  revalidatePath("/app/brand-kit");
  return { ok: true };
}
