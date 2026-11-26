import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/workspace";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, notConfigured, zodMessage } from "@/lib/api";

const SERVICES = [
  "managed_advertising",
  "website_design",
  "seo",
  "google_business_profile",
  "content_production",
  "marketing_strategy",
  "growth_consulting",
  "ai_automation",
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  business_name: z.string().trim().min(1, "Required").max(160),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(2048).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  marketing_budget: z.string().trim().max(60).optional().or(z.literal("")),
  services: z.array(z.enum(SERVICES)).max(SERVICES.length).default([]),
  goals: z.string().trim().max(3000).optional().or(z.literal("")),
  contact_method: z.enum(["email", "phone", "video_call"]).default("email"),
  marketing_consent: z.boolean().default(false),
  source: z.string().trim().max(60).default("agency_page"),
  source_context: z.record(z.string(), z.unknown()).optional(),
  company_url_confirm: z.string().max(0).optional(), // honeypot: must stay empty
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  if (!isServiceRoleConfigured()) return notConfigured("Lead capture database", ["SUPABASE_SERVICE_ROLE_KEY"]);

  const ip = await clientIp();
  if (!(await rateLimit(`consult:${ip}`, 5, 3600))) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "BAD_JSON", "Invalid request body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "VALIDATION", zodMessage(parsed.error));
  const d = parsed.data;
  if (d.company_url_confirm) return NextResponse.json({ ok: true }); // silently drop bots

  const user = await getSessionUser();
  const admin = createAdminClient();
  let organizationId: string | null = null;
  if (user) {
    const { data } = await admin.from("profiles").select("active_organization_id").eq("id", user.id).maybeSingle();
    organizationId = data?.active_organization_id ?? null;
  }

  const { data: request, error } = await admin
    .from("consultation_requests")
    .insert({
      user_id: user?.id ?? null,
      organization_id: organizationId,
      name: d.name,
      business_name: d.business_name,
      email: d.email,
      phone: d.phone || null,
      website: d.website || null,
      industry: d.industry || null,
      marketing_budget: d.marketing_budget || null,
      services: d.services,
      goals: d.goals || null,
      contact_method: d.contact_method,
      source: d.source,
      source_context: d.source_context ?? {},
      marketing_consent: d.marketing_consent,
    })
    .select("id")
    .single();
  if (error) {
    await admin.from("api_error_logs").insert({ service: "database", route: "/api/consultations", message: error.message });
    return jsonError(500, "SAVE_FAILED", "We couldn't save your request. Please try again.");
  }

  await admin.from("agency_leads").insert({
    consultation_request_id: request.id,
    business_name: d.business_name,
    contact_name: d.name,
    email: d.email,
    phone: d.phone || null,
    website: d.website || null,
    industry: d.industry || null,
    interested_services: d.services,
    marketing_budget: d.marketing_budget || null,
    lead_source: d.source,
  });

  return NextResponse.json({ ok: true, id: request.id });
}
