import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Faq, FaqJsonLd } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { SOLUTIONS, getSolution } from "@/content/solutions";

export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSolution(slug);
  if (!s) return {};
  return {
    title: s.title,
    description: s.metaDescription,
    alternates: { canonical: `/solutions/${s.slug}` },
    openGraph: { title: s.title, description: s.metaDescription, url: `/solutions/${s.slug}` },
  };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSolution(slug);
  if (!s) notFound();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "LTR Growth", item: "/" },
      { "@type": "ListItem", position: 2, name: s.navLabel, item: `/solutions/${s.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <FaqJsonLd items={s.faqs} />
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-subtle">
            <Link href="/" className="hover:text-fg">Home</Link> <span aria-hidden>/</span> <span className="text-muted">{s.navLabel}</span>
          </nav>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{s.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{s.h1}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-pretty">{s.intro}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/free-audit">Get Your Free Marketing Audit <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/signup">Start free</Link></Button>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.problem.heading}</h2>
            <p className="mt-4 leading-relaxed text-muted">{s.problem.body}</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {s.capabilities.map((c) => (
              <div key={c.title} className="bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-accent" />{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="How it works" title="Get started in four steps" />
        <ol className="grid gap-4 md:grid-cols-4">
          {s.steps.map((step, i) => (
            <li key={step} className="rounded-lg border border-border bg-card p-5">
              <span className="font-mono text-xs text-accent">0{i + 1}</span>
              <p className="mt-3 text-sm font-medium">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <Faq items={s.faqs} />
        </div>
      </Section>

      <Section>
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">More solutions</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SOLUTIONS.filter((o) => o.slug !== s.slug).map((o) => (
            <li key={o.slug}>
              <Link href={`/solutions/${o.slug}`} className="inline-block rounded-md border border-border px-3 py-1.5 text-[13px] text-muted hover:border-border-strong hover:text-fg">
                {o.navLabel.charAt(0).toUpperCase() + o.navLabel.slice(1)}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <FinalCta />
    </>
  );
}
