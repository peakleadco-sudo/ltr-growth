import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/workspace";
import { BRAND_BUCKET, signedUrl, validateUpload } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, notConfigured } from "@/lib/api";

const metaSchema = z.object({
  business_profile_id: z.string().uuid(),
  kind: z.enum(["logo", "product_photo", "brand_imagery", "document", "other"]),
  title: z.string().trim().max(160).optional(),
  set_as_logo: z.enum(["true", "false"]).optional(),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  if (!isServiceRoleConfigured()) return notConfigured("File storage", ["SUPABASE_SERVICE_ROLE_KEY"]);
  const user = await getSessionUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");
  if (!(await rateLimit(`upload:${user.id}`, 60, 3600))) return jsonError(429, "RATE_LIMITED", "Too many uploads. Please try again later.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "BAD_FORM", "Invalid upload.");
  }
  const meta = metaSchema.safeParse({
    business_profile_id: form.get("business_profile_id"),
    kind: form.get("kind"),
    title: form.get("title") || undefined,
    set_as_logo: form.get("set_as_logo") || undefined,
  });
  if (!meta.success) return jsonError(400, "VALIDATION", "Missing or invalid upload details.");
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "NO_FILE", "Choose a file to upload.");

  // Authorization: the business profile must be visible to this user under RLS.
  const supabase = await createClient();
  const { data: bp } = await supabase.from("business_profiles").select("id, organization_id").eq("id", meta.data.business_profile_id).maybeSingle();
  if (!bp) return jsonError(404, "NOT_FOUND", "Business profile not found.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const allow: ("image" | "svg" | "pdf")[] = meta.data.kind === "document" ? ["pdf", "image"] : meta.data.kind === "logo" ? ["image", "svg"] : ["image"];
  const v = validateUpload(bytes, { allow, maxBytes: meta.data.kind === "document" ? 20 * 1024 * 1024 : 10 * 1024 * 1024 });
  if ("error" in v) return jsonError(422, "INVALID_FILE", v.error);

  const path = `${bp.organization_id}/${bp.id}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from(BRAND_BUCKET).upload(path, v.bytes, { contentType: v.mime, upsert: false });
  if (upErr) {
    await admin.from("api_error_logs").insert({ service: "storage", route: "/api/assets/upload", organization_id: bp.organization_id, message: upErr.message });
    return jsonError(500, "UPLOAD_FAILED", "Upload failed. Please try again.");
  }
  const title = (meta.data.title || file.name || "Untitled").replace(/[^\w .\-()]/g, "").slice(0, 160);
  const { data: asset, error } = await admin
    .from("brand_assets")
    .insert({
      organization_id: bp.organization_id,
      business_profile_id: bp.id,
      kind: meta.data.kind,
      title,
      storage_path: path,
      mime_type: v.mime,
      size_bytes: v.bytes.byteLength,
      width: v.width,
      height: v.height,
      uploaded_by: user.id,
    })
    .select("*")
    .single();
  if (error) {
    await admin.storage.from(BRAND_BUCKET).remove([path]);
    return jsonError(500, "SAVE_FAILED", "Upload failed. Please try again.");
  }
  if (meta.data.kind === "logo" && meta.data.set_as_logo !== "false") {
    await admin
      .from("brand_kits")
      .upsert({ business_profile_id: bp.id, organization_id: bp.organization_id, logo_asset_id: asset.id }, { onConflict: "business_profile_id" });
  }
  return NextResponse.json({ ok: true, asset, url: await signedUrl(path) });
}
