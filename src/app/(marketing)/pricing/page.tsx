import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section } from "@/components/marketing/section";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { getFaqs, getPublicPlans } from "@/lib/public-data";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pricing — Plans for Every Stage of Growth",
  description: "Compare LTR Growth plans: Free, Starter, Growth and Pro, plus Agency Managed services from LTRMarketing. Clear monthly AI credit allowances, cancel anytime.",
  alternates: { canonical: "/pricing" },
};

const MATRIX: { label: string; plans: Record<string, boolean | string> }[] = [
  { label: "LTR AI assistant", plans: { free: "Limited", starter: true, growth: true, pro: true } },
  { label: "Marketing calculators", plans: { free: "Basic", starter: true, growth: true, pro: true } },
  { label: "Website audit", plans: { free: "Limited", starter: "Monthly", growth: "Advanced", pro: "Advanced" } },
  { label: "Ad, social, email & website copy generators", plans: { free: false, starter: true, growth: true, pro: true } },
  { label: "Marketing strategy generator", plans: { free: false, starter: true, growth: true, pro: true } },
  { label: "Brand kit", plans: { free: "Basic", starter: true, growth: true, pro: true } },
  { label: "Competitor intelligence", plans: { free: false, starter: false, growth: true, pro: "Advanced" } },
  { label: "Local business marketing tools", plans: { free: false, starter: false, growth: true, pro: true } },
  { label: "AI image generation", plans: { free: false, starter: false, growth: true, pro: true } },
  { label: "Campaign management & performance dashboard", plans: { free: false, starter: false, growth: true, pro: true } },
  { label: "Branded PDF reports", plans: { free: false, starter: false, growth: true, pro: true } },
  { label: "Priority support", plans: { free: false, starter: false, growth: false, pro: true } },
];

export default async function PricingPage() {
  const [{ plans }, faqs] = await Promise.all([getPublicPlans(), getFaqs()]);
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Pricing</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Plans that grow with you</h1>
        <p className="mx-auto mt-5 max-w-xl text-muted">Start free. Every paid plan is billed monthly and can be cancelled anytime from your billing portal.</p>
      </section>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <PricingTable plans={plans} />
      </div>
      <Section>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Compare plans</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg-2 text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Feature</th>
                {plans.map((p) => <th key={p.id} scope="col" className="px-5 py-3 font-medium text-fg">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              <tr>
                <th scope="row" className="px-5 py-3.5 font-normal text-muted">Business profiles</th>
                {plans.map((p) => <td key={p.id} className="px-5 py-3.5 tabular-nums">{p.max_business_profiles}</td>)}
              </tr>
              <tr>
                <th scope="row" className="px-5 py-3.5 font-normal text-muted">AI text credits / month</th>
                {plans.map((p) => <td key={p.id} className="px-5 py-3.5 tabular-nums">{formatNumber(p.monthly_text_credits)}</td>)}
              </tr>
              <tr>
                <th scope="row" className="px-5 py-3.5 font-normal text-muted">Image credits / month</th>
                {plans.map((p) => <td key={p.id} className="px-5 py-3.5 tabular-nums">{p.monthly_image_credits ? formatNumber(p.monthly_image_credits) : <Minus className="size-4 text-subtle" />}</td>)}
              </tr>
              {MATRIX.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-5 py-3.5 font-normal text-muted">{row.label}</th>
                  {plans.map((p) => {
                    const v = row.plans[p.id];
                    return (
                      <td key={p.id} className="px-5 py-3.5">
                        {v === true ? <Check className="size-4 text-accent" aria-label="Included" /> : !v ? <Minus className="size-4 text-subtle" aria-label="Not included" /> : <span className="text-[13px] text-muted">{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-subtle">Credit allowances reset each billing period. Additional credits can be purchased on paid plans. Usage limits prevent unlimited AI usage.</p>
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Billing questions</h2>
          <Faq items={faqs.filter((f) => /credit|cancel|cost|guarantee/i.test(f.q + f.a)).slice(0, 5)} />
        </div>
      </Section>
      <FinalCta />
    </>
  );
}
