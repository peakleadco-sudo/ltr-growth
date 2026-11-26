import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { FreeAuditForm } from "./free-audit-form";

export const metadata: Metadata = {
  title: "Free Marketing Audit for Your Website",
  description: "Get a free marketing audit of your website: performance, technical SEO, conversion readiness and prioritized recommendations, based on real data.",
  alternates: { canonical: "/free-audit" },
};

export default function FreeAuditPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Free marketing audit</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Find out what&apos;s holding your website back</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Enter your website and LTR Growth will analyze it using data retrieved from your site, then show you prioritized opportunities to win more customers.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Page titles, meta descriptions and heading structure",
              "Calls to action, contact details and lead capture",
              "HTTPS, sitemap, robots.txt and structured data",
              "Performance and mobile data from Google PageSpeed Insights",
              "Checks that can't be completed are marked unverified, never guessed",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-sm text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <FreeAuditForm />
        </div>
      </div>
    </section>
  );
}
