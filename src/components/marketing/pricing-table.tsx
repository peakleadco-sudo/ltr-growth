import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PricingTable({ plans, highlight = "growth" }: { plans: Plan[]; highlight?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {plans.map((p) => {
        const featured = p.id === highlight;
        return (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-6",
              featured ? "border-accent/60 shadow-[0_0_0_1px_rgba(255,41,41,0.25),0_20px_60px_-20px_rgba(255,41,41,0.25)]" : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{p.name}</h3>
              {featured && <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Popular</span>}
            </div>
            <p className="mt-1 min-h-10 text-[13px] text-muted">{p.description}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">${(p.price_cents / 100).toFixed(0)}</span>
              <span className="text-sm text-subtle">/{p.interval}</span>
            </p>
            <Button asChild className="mt-5" variant={featured ? "primary" : "secondary"}>
              <Link href={p.price_cents === 0 ? "/signup" : `/signup?plan=${p.id}`}>
                {p.price_cents === 0 ? "Start free" : `Choose ${p.name}`}
              </Link>
            </Button>
            <ul className="mt-6 space-y-2.5">
              {p.marketing_bullets.map((b) => (
                <li key={b} className="flex gap-2 text-[13px] text-muted">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="flex flex-col rounded-lg border border-border bg-bg-2 p-6">
        <h3 className="text-base font-semibold">Agency Managed</h3>
        <p className="mt-1 min-h-10 text-[13px] text-muted">Let the LTRMarketing team run your marketing for you.</p>
        <p className="mt-5 text-3xl font-semibold tracking-tight">Custom</p>
        <Button asChild className="mt-5" variant="white">
          <Link href="/agency#consultation">Book a consultation</Link>
        </Button>
        <ul className="mt-6 space-y-2.5">
          {["Managed advertising", "Professional website design", "SEO management", "Google Business Profile management", "Content production", "Marketing strategy", "Business growth consulting", "AI automation and lead follow-up systems"].map((b) => (
            <li key={b} className="flex gap-2 text-[13px] text-muted">
              <Check className="mt-0.5 size-3.5 shrink-0 text-fg" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
