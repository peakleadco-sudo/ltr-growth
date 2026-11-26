import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/api";

const TABLES = [
  "business_profiles", "brand_kits", "brand_assets", "marketing_tasks", "marketing_strategies", "generated_ads", "generated_images",
  "social_content", "content_calendars", "email_campaigns", "marketing_campaigns", "campaign_assets", "competitors", "competitor_reports",
  "website_audits", "audit_findings", "performance_metrics", "imported_data", "ai_generations", "ai_conversations", "ai_messages",
  "credit_transactions", "usage_credits", "subscriptions",
];

/** Data export (portability). Reads through the user's own RLS-scoped session. */
export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");
  if (!(await rateLimit(`export:${ws.user.id}`, 5, 3600))) return jsonError(429, "RATE_LIMITED", "Please wait before exporting again.");
  const supabase = await createClient();
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: ws.user.id, email: ws.profile.email, full_name: ws.profile.full_name, marketing_consent: ws.profile.marketing_consent, created_at: ws.profile.created_at },
    organization: ws.organization,
  };
  for (const t of TABLES) {
    const { data } = await supabase.from(t).select("*").eq("organization_id", ws.organization.id).limit(10000);
    out[t] = data ?? [];
  }
  const { data: notifications } = await supabase.from("notifications").select("*").eq("user_id", ws.user.id);
  out.notifications = notifications ?? [];
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="ltr-growth-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
