import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardBody } from "@/components/ui/primitives";
import { ConsultationForm } from "@/components/marketing/consultation-form";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Work With LTRMarketing" };

/** In-app agency page with recommendations based on the user's real gaps. */
export default async function InAppAgencyPage() {
  const ws = await requireWorkspace();
  const bp = ws.activeBusiness!;
  const supabase = await createClient();
  const { count } = await supabase.from("marketing_strategies").select("id", { count: "exact", head: true }).eq("business_profile_id", bp.id);
  const r = computeReadiness({ business: bp, brandKit: ws.brandKit, hasLogo: Boolean(ws.brandKit?.logo_asset_id), latestAudit: null, openTaskCount: 0, hasStrategy: (count ?? 0) > 0 });

  const recs: { title: string; body: string; service: string }[] = [];
  if (!bp.website_url) recs.push({ title: "Professional website design", body: "You don't have a website on your profile yet. A conversion-focused site is the foundation for ads, SEO and local search.", service: "website_design" });
  if (bp.goals.includes("Get more leads") || bp.goals.includes("Increase online sales")) recs.push({ title: "Managed advertising", body: "Your goals focus on leads and sales. Our team can launch, manage and optimize paid campaigns for you.", service: "managed_advertising" });
  if (bp.goals.includes("Improve local visibility") || bp.service_areas.length) recs.push({ title: "Google Business Profile & local SEO", body: "You serve specific areas. Local profile management and service-area content help you show up nearby.", service: "google_business_profile" });
  if (bp.goals.includes("Rank higher on Google")) recs.push({ title: "SEO management", body: "You want to rank higher. Ongoing technical and content SEO compounds over time.", service: "seo" });
  if (r.gaps.some((g) => g.category === "Brand")) recs.push({ title: "Content production", body: "Your brand kit has gaps. Our creative team can produce on-brand content consistently.", service: "content_production" });
  if (!recs.length) recs.push({ title: "Marketing strategy & growth consulting", body: "Get a dedicated team to execute your growth strategy.", service: "marketing_strategy" });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Work With LTRMarketing" description="Prefer to have experts handle it? LTRMarketing offers fully managed marketing with custom pricing." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {recs.slice(0, 4).map((x) => (
          <Card key={x.title}><CardBody><p className="text-sm font-semibold">{x.title}</p><p className="mt-1.5 text-[13px] text-muted">{x.body}</p></CardBody></Card>
        ))}
      </div>
      <p className="mb-4 text-[12px] text-subtle">These suggestions are based only on what&apos;s in your business profile. We never exaggerate issues to sell services.</p>
      <Card>
        <CardBody className="p-6">
          <h2 className="mb-5 text-lg font-semibold">Request a free strategy call</h2>
          <ConsultationForm
            source="in_app"
            sourceContext={{ business_profile_id: bp.id, readiness: r.score }}
            defaults={{ name: ws.profile.full_name ?? "", email: ws.profile.email ?? "", business_name: bp.name, website: bp.website_url ?? "", industry: bp.industry ?? "", services: recs.map((x) => x.service) }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
