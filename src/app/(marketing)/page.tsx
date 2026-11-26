import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  Flag,
  Gauge,
  Image as ImageIcon,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  Minus,
  PenLine,
  ShoppingBag,
  Sparkles,
  Store,
  Swords,
  Target,
  Rocket,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { ProductDemo } from "@/components/marketing/product-demo";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq, FaqJsonLd } from "@/components/marketing/faq";
import { Section, SectionHeading } from "@/components/marketing/section";
import { FinalCta } from "@/components/marketing/final-cta";
import { getFaqs, getPublicPlans, getSiteContent } from "@/lib/public-data";
import { publicEnv } from "@/lib/env";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "LTR Growth — Your entire marketing department. Powered by AI." },
  description:
    "Create better advertisements, improve your SEO, understand your competitors and grow your business with one intelligent AI marketing platform from LTRMarketing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LTR Growth — Your entire marketing department. Powered by AI.",
    description: "Create better advertisements, improve your SEO, understand your competitors and grow your business with one intelligent marketing platform.",
    url: "/",
  },
};

const FEATURES = [
  { icon: Sparkles, title: "LTR AI assistant", body: "A marketing strategist that knows your business profile, brand and history, and separates facts from assumptions." },
  { icon: Megaphone, title: "Ad Studio", body: "Copy, hooks, scripts, audiences, campaign structures and A/B variations for six ad platforms." },
  { icon: ImageIcon, title: "Creative Studio", body: "On-brand static ads and social graphics in every common format, with accurate text and logos." },
  { icon: MessageSquareText, title: "Social Media Studio", body: "Captions, carousels, reels and 7, 14 or 30-day content plans on a drag-and-drop calendar." },
  { icon: Gauge, title: "Website and SEO audit", body: "Performance, technical SEO and conversion checks based on real retrieved data." },
  { icon: Swords, title: "Competitor intelligence", body: "Side-by-side comparisons of public positioning, offers and messaging, with cited sources." },
  { icon: Target, title: "Marketing strategy", body: "30, 60 and 90-day plans that become weekly tasks on your dashboard." },
  { icon: MapPin, title: "Local marketing", body: "Google Business Profile guidance, review responses and service-area content." },
  { icon: Mail, title: "Email & SMS", body: "Sequences, promotions and follow-ups with subject lines and A/B variations." },
  { icon: PenLine, title: "Website copywriter", body: "Home, service, landing and location pages ready to paste into your site builder." },
  { icon: Calculator, title: "Marketing calculators", body: "ROAS, ROI, CPA, LTV and break-even math using exact formulas, not AI guesses." },
  { icon: Flag, title: "Campaigns & performance", body: "Plan campaigns, record real results and get recommendations from your actual numbers." },
];

const STEPS = [
  { n: "01", title: "Tell us about your business", body: "Add your website and LTR Growth suggests answers from your public site. You approve everything before it's saved." },
  { n: "02", title: "See where you stand", body: "Get a marketing readiness score and a website audit with prioritized, explained recommendations." },
  { n: "03", title: "Create what you need", body: "Generate ads, content, emails and a strategy, all personalized with your brand kit." },
  { n: "04", title: "Execute and track", body: "Work through weekly tasks, plan campaigns and record real results in one dashboard." },
];

const COMPARISON: { row: string; ltr: boolean | string; separate: boolean | string; diy: boolean | string }[] = [
  { row: "Ads, social, email and website copy in one place", ltr: true, separate: "Several subscriptions", diy: false },
  { row: "Every tool uses your business profile and brand kit", ltr: true, separate: false, diy: false },
  { row: "Website and SEO audit based on retrieved data", ltr: true, separate: "Separate SEO tool", diy: false },
  { row: "Competitor research with cited sources", ltr: true, separate: "Manual research", diy: "Manual research" },
  { row: "Strategy that turns into weekly tasks", ltr: true, separate: false, diy: false },
  { row: "Deterministic marketing calculators", ltr: true, separate: "Spreadsheets", diy: "Spreadsheets" },
  { row: "Option to hand execution to an expert team", ltr: true, separate: false, diy: false },
];

const INDUSTRIES = [
  { icon: Building2, title: "Local service businesses", body: "Plumbers, roofers, clinics, salons and contractors who win on local search, reviews and fast follow-up.", href: "/solutions/local-business-marketing-software" },
  { icon: ShoppingBag, title: "E-commerce brands", body: "Product ads, UGC scripts, abandoned cart flows and launch content using your real product photos.", href: "/solutions/ecommerce-marketing-software" },
  { icon: Rocket, title: "Startups", body: "Positioning, messaging tests and lean channel plans when every dollar of budget matters.", href: "/solutions/ai-marketing-strategy-generator" },
  { icon: Store, title: "Small businesses", body: "One affordable platform instead of a stack of tools, with clear next steps every week.", href: "/solutions/small-business-marketing-software" },
  { icon: Briefcase, title: "Established companies", body: "Multiple business profiles, consistent branding and reporting across locations or brands.", href: "/pricing" },
];

export default async function HomePage() {
  const [{ plans }, faqs, logos, caseStudies, testimonials] = await Promise.all([
    getPublicPlans(),
    getFaqs(),
    getSiteContent("client_logo"),
    getSiteContent("case_study"),
    getSiteContent("testimonial"),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LTR Growth",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: publicEnv.siteUrl,
    publisher: { "@type": "Organization", name: "LTRMarketing" },
    offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: (p.price_cents / 100).toFixed(2), priceCurrency: p.currency.toUpperCase() })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }} />
      <FaqJsonLd items={faqs} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1fr_1.05fr] lg:pb-28">
          <div className="animate-slide-up">
            <Link href="/free-audit" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg">
              <span className="size-1.5 rounded-full bg-accent" /> Free marketing audit for your website <ArrowRight className="size-3" />
            </Link>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Your entire marketing department. <span className="text-accent">Powered by AI.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted text-pretty">
              Create better advertisements, improve your SEO, understand your competitors and grow your business with one intelligent marketing platform.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/free-audit">Get Your Free Marketing Audit <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#platform">Explore the Platform</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-subtle">Free plan available. No credit card required.</p>
          </div>
          <div className="animate-fade-in [animation-delay:150ms]">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Trusted by: only authorized, verified logos managed in the admin dashboard */}
      {logos.length > 0 && (
        <section className="border-t border-border/60 py-10" aria-label="Trusted by">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-center text-xs uppercase tracking-[0.18em] text-subtle">Trusted by businesses working with LTRMarketing</p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {logos.map((l) => {
                const b = l.body as { image_url?: string; url?: string };
                return (
                  <li key={l.id} className="opacity-60 grayscale transition hover:opacity-100">
                    {b.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image_url} alt={l.title} className="h-7 w-auto" loading="lazy" />
                    ) : (
                      <span className="text-sm font-semibold text-muted">{l.title}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Features */}
      <Section id="platform">
        <SectionHeading
          eyebrow="The platform"
          title="Every marketing tool you need, working from the same playbook"
          description="Describe your business once. Every tool uses your business profile and brand kit, so results are specific to you, not generic marketing advice."
        />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group bg-card p-6 transition-colors hover:bg-card-hover">
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Interactive demo */}
      <Section id="demo">
        <SectionHeading
          eyebrow="See it in action"
          title="From a few inputs to work you can use today"
          description="Explore example outputs from four of the tools. The business here is fictional; your results are built from your own profile."
        />
        <ProductDemo />
      </Section>

      {/* How it works */}
      <Section id="how-it-works">
        <SectionHeading eyebrow="How it works" title="Set up in minutes. Improve every week." />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border border-border bg-card p-6">
              <span className="font-mono text-xs text-accent">{s.n}</span>
              <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Comparison */}
      <Section id="compare">
        <SectionHeading eyebrow="Compare" title="One platform instead of a patchwork" description="How LTR Growth compares with stitching together separate tools or doing it all by hand." />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-bg-2 text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Capability</th>
                <th scope="col" className="px-5 py-3 font-medium text-fg">LTR Growth</th>
                <th scope="col" className="px-5 py-3 font-medium">Separate tools</th>
                <th scope="col" className="px-5 py-3 font-medium">Do it yourself</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {COMPARISON.map((r) => (
                <tr key={r.row}>
                  <th scope="row" className="px-5 py-3.5 font-normal text-muted">{r.row}</th>
                  {[r.ltr, r.separate, r.diy].map((v, i) => (
                    <td key={i} className="px-5 py-3.5">
                      {v === true ? <Check className="size-4 text-accent" aria-label="Yes" /> : v === false ? <Minus className="size-4 text-subtle" aria-label="No" /> : <span className="text-[13px] text-subtle">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Industries */}
      <Section id="industries">
        <SectionHeading eyebrow="Who it's for" title="Built for businesses that want to grow without a full marketing department" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {INDUSTRIES.map((i) => (
            <Link key={i.title} href={i.href} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-border-strong">
              <i.icon className="size-5 text-muted transition-colors group-hover:text-accent" />
              <h3 className="mt-4 text-sm font-semibold">{i.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{i.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Verified case studies only */}
      {caseStudies.length > 0 && (
        <Section id="results">
          <SectionHeading eyebrow="Results" title="Verified work from LTRMarketing" />
          <div className="grid gap-4 md:grid-cols-3">
            {caseStudies.map((c) => {
              const b = c.body as { client?: string; summary?: string; result?: string; link?: string };
              return (
                <article key={c.id} className="rounded-lg border border-border bg-card p-6">
                  {b.client && <p className="text-xs uppercase tracking-wider text-subtle">{b.client}</p>}
                  <h3 className="mt-2 text-[15px] font-semibold">{c.title}</h3>
                  {b.result && <p className="mt-3 text-2xl font-semibold text-accent">{b.result}</p>}
                  {b.summary && <p className="mt-3 text-sm leading-relaxed text-muted">{b.summary}</p>}
                </article>
              );
            })}
          </div>
        </Section>
      )}

      {/* Pricing */}
      <Section id="pricing">
        <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when you're ready." description="Simple monthly plans with clear AI credit allowances. Cancel anytime." />
        <PricingTable plans={plans} />
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/pricing" className="text-fg underline-offset-4 hover:underline">Compare plans in detail</Link>
        </p>
      </Section>

      {/* Genuine testimonials only */}
      {testimonials.length > 0 && (
        <Section id="testimonials">
          <SectionHeading eyebrow="Customers" title="What customers say" />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => {
              const b = t.body as { quote?: string; name?: string; role?: string };
              return (
                <figure key={t.id} className="rounded-lg border border-border bg-card p-6">
                  <blockquote className="text-sm leading-relaxed text-fg">&ldquo;{b.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 text-xs text-muted">{b.name}{b.role ? `, ${b.role}` : ""}</figcaption>
                </figure>
              );
            })}
          </div>
        </Section>
      )}

      {/* FAQ */}
      <Section id="faq">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading eyebrow="FAQ" title="Questions, answered honestly" description="Can't find what you're looking for? Reach the team from the Work with LTRMarketing page." />
          <Faq items={faqs} />
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
