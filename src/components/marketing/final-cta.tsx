import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-14 text-center sm:px-12">
          <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              See exactly where your marketing stands, for free.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Start with a free marketing audit, then build ads, content and a strategy around what you find.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/free-audit">Get your free marketing audit <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/agency#consultation">Talk to LTRMarketing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
