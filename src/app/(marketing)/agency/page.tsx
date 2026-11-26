import type { Metadata } from "next";
import { Bot, Gauge, LayoutTemplate, MapPin, Megaphone, PenTool, Target, TrendingUp } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ConsultationForm } from "@/components/marketing/consultation-form";
import { getSiteContent } from "@/lib/public-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Work with LTRMarketing — Managed Marketing Services",
  description: "Hand your marketing to LTRMarketing's team: managed advertising, website design, SEO, Google Business Profile, content production and growth consulting. Book a free consultation.",
  alternates: { canonical: "/agency" },
};

const SERVICES = [
  { icon: Megaphone, title: "Managed advertising", body: "Campaign setup, creative testing and ongoing optimization across Meta, Google and more." },
  { icon: LayoutTemplate, title: "Professional website design", body: "Fast, conversion-focused websites built to turn visitors into customers." },
  { icon: Gauge, title: "SEO management", body: "Technical fixes, on-page optimization and content that compounds over time." },
  { icon: MapPin, title: "Google Business Profile", body: "Profile optimization, posting and review management for local visibility." },
  { icon: PenTool, title: "Content production", body: "Social content, video and copy produced by our team in your brand voice." },
  { icon: Target, title: "Marketing strategy", body: "A clear plan built around your goals, budget and market." },
  { icon: TrendingUp, title: "Business growth consulting", body: "Offer, pricing and funnel guidance from people who do this every day." },
  { icon: Bot, title: "AI automation & lead follow-up", body: "Systems that respond to leads quickly and keep follow-up consistent." },
];

export default async function AgencyPage() {
  const caseStudies = await getSiteContent("case_study");
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Work with LTRMarketing</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Prefer to have experts do it for you?</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          LTR Growth is built by LTRMarketing. If you want a dedicated team to execute your marketing, we offer fully managed services with custom pricing.
        </p>
      </section>
      <Section>
        <SectionHeading eyebrow="Services" title="Full-service marketing, tailored to your business" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.title} className="bg-card p-6">
              <s.icon className="size-5 text-accent" />
              <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>
      {caseStudies.length > 0 && (
        <Section>
          <SectionHeading eyebrow="Case studies" title="Verified results" />
          <div className="grid gap-4 md:grid-cols-3">
            {caseStudies.map((c) => {
              const b = c.body as { client?: string; summary?: string; result?: string };
              return (
                <article key={c.id} className="rounded-lg border border-border bg-card p-6">
                  {b.client && <p className="text-xs uppercase tracking-wider text-subtle">{b.client}</p>}
                  <h3 className="mt-2 font-semibold">{c.title}</h3>
                  {b.result && <p className="mt-3 text-2xl font-semibold text-accent">{b.result}</p>}
                  {b.summary && <p className="mt-3 text-sm text-muted">{b.summary}</p>}
                </article>
              );
            })}
          </div>
        </Section>
      )}
      <Section id="consultation">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow="Free consultation" title="Book a strategy call" description="Tell us about your business and goals. We'll review your marketing and recommend the right next step, whether that's our software, our team, or both." />
            <ul className="space-y-3 text-sm text-muted">
              <li>No obligation and no pressure.</li>
              <li>We&apos;ll never exaggerate problems to sell services.</li>
              <li>Your details are only used to respond to your request.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <ConsultationForm source="agency_page" />
          </div>
        </div>
      </Section>
    </>
  );
}
