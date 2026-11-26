import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/workspace";
import { BRAND_BUCKET, signedUrl } from "@/lib/storage";
import { isSameOrigin, jsonError, notConfigured } from "@/lib/api";

async function authorize(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  // RLS: only returns assets belonging to the user's organizations.
  const { data } = await supabase.from("brand_assets").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Returns a short-lived signed URL (redirect) for an asset the user can access. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isServiceRoleConfigured()) return notConfigured("File storage", ["SUPABASE_SERVICE_ROLE_KEY"]);
  const { id } = await params;
  const asset = await authorize(id);
  if (!asset) return jsonError(404, "NOT_FOUND", "File not found.");
  const url = await signedUrl(asset.storage_path, 300);
  if (!url) return jsonError(500, "SIGN_FAILED", "Couldn't open this file.");
  const download = new URL(req.url).searchParams.get("download") === "1";
  return NextResponse.redirect(download ? `${url}&download=${encodeURIComponent(asset.title || "file")}` : url);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  if (!isServiceRoleConfigured()) return notConfigured("File storage", ["SUPABASE_SERVICE_ROLE_KEY"]);
  const { id } = await params;
  const asset = await authorize(id);
  if (!asset) return jsonError(404, "NOT_FOUND", "File not found.");
  const admin = createAdminClient();
  await admin.storage.from(BRAND_BUCKET).remove([asset.storage_path]);
  await admin.from("brand_assets").delete().eq("id", asset.id);
  return NextResponse.json({ ok: true });
}
