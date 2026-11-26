"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Globe, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Badge } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { AssetUploader, ChipSelect, ColorListEditor, CompetitorsEditor, SocialLinksEditor, TagInput } from "@/components/app/form-controls";
import { BUSINESS_GOALS, INDUSTRIES, MARKETING_CHANNELS, VOICE_TRAITS } from "@/lib/schemas";
import type { BrandKit, BusinessProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { completeOnboarding, saveOnboardingDraft } from "./actions";

const STEPS = [
  { id: "website", label: "Website" },
  { id: "basics", label: "Business" },
  { id: "offer", label: "Offer & audience" },
  { id: "market", label: "Market & goals" },
  { id: "brand", label: "Brand" },
  { id: "review", label: "Review" },
] as const;

type Suggestion = { key: string; label: string; value: string | string[] | Record<string, string>; basis: "stated" | "inferred"; source: "website" | "ai" };
type Extraction = {
  source: { url: string; retrievedAt: string; via: string };
  facts: { title: string | null; logoCandidates: string[]; wordCount: number };
  suggestions: Suggestion[];
  ai: { configured: boolean; used: boolean; error?: string };
};

type ProfileState = {
  name: string; website_url: string; industry: string; description: string; location: string; service_areas: string[];
  products_services: string; target_audience: string; average_customer_value: string; monthly_marketing_budget: string;
  competitors: { name: string; url?: string | null }[]; marketing_channels: string[]; goals: string[]; social_links: Record<string, string>;
};
type BrandState = { colors: { name: string; hex: string }[]; brand_voice: string; voice_traits: string[]; unique_selling_propositions: string[] };

export function OnboardingWizard(props: {
  firstName: string | null;
  existing: BusinessProfile | null;
  existingKit: BrandKit | null;
  logoUrl: string | null;
  initialWebsite: string;
  aiConfigured: boolean;
  uploadsConfigured: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  const e = props.existing;
  const k = props.existingKit;
  const [bpId, setBpId] = useState<string | null>(e?.id ?? null);
  const resumeIdx = Math.max(0, STEPS.findIndex((s) => s.id === e?.onboarding_step));
  const [step, setStep] = useState(e ? Math.min(resumeIdx + 1, STEPS.length - 1) : 0);
  const [saving, startSaving] = useTransition();
  const [profile, setProfile] = useState<ProfileState>({
    name: e?.name ?? "", website_url: e?.website_url ?? props.initialWebsite, industry: e?.industry ?? "", description: e?.description ?? "",
    location: e?.location ?? "", service_areas: e?.service_areas ?? [], products_services: e?.products_services ?? "", target_audience: e?.target_audience ?? "",
    average_customer_value: e?.average_customer_value?.toString() ?? "", monthly_marketing_budget: e?.monthly_marketing_budget?.toString() ?? "",
    competitors: e?.competitors ?? [], marketing_channels: e?.marketing_channels ?? [], goals: e?.goals ?? [], social_links: e?.social_links ?? {},
  });
  const [brand, setBrand] = useState<BrandState>({
    colors: k?.colors ?? [], brand_voice: k?.brand_voice ?? "", voice_traits: k?.voice_traits ?? [], unique_selling_propositions: k?.unique_selling_propositions ?? [],
  });
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<string[]>([]);

  const set = <K extends keyof ProfileState>(key: K, v: ProfileState[K]) => setProfile((p) => ({ ...p, [key]: v }));

  async function analyze() {
    if (!profile.website_url.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setExtraction(null);
    try {
      const res = await fetch("/api/onboarding/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: profile.website_url }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setExtractError(json?.error?.message ?? "We couldn't analyze that website.");
        return;
      }
      setExtraction(json);
      setProfile((p) => ({ ...p, website_url: json.source.url }));
      setAccepted(Object.fromEntries((json.suggestions as Suggestion[]).map((s) => [s.key, s.basis === "stated"])));
    } catch {
      setExtractError("Network error. You can continue and fill in details manually.");
    } finally {
      setExtracting(false);
    }
  }

  function applySuggestions() {
    if (!extraction) return;
    const next = { ...profile };
    const nextBrand = { ...brand };
    const used: string[] = [];
    for (const s of extraction.suggestions) {
      if (!accepted[s.key]) continue;
      used.push(s.key);
      const v = s.value;
      switch (s.key) {
        case "name": next.name = String(v); break;
        case "industry": next.industry = String(v); break;
        case "description": next.description = String(v); break;
        case "location": next.location = String(v); break;
        case "service_areas": next.service_areas = (v as string[]).slice(0, 30); break;
        case "products_services": next.products_services = String(v); break;
        case "target_audience": next.target_audience = String(v); break;
        case "social_links": next.social_links = { ...next.social_links, ...(v as Record<string, string>) }; break;
        case "brand_voice": nextBrand.brand_voice = String(v); break;
        case "usps": nextBrand.unique_selling_propositions = (v as string[]).slice(0, 12); break;
        case "brand_colors": nextBrand.colors = (v as string[]).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).map((hex, i) => ({ name: i === 0 ? "Primary" : "", hex: hex.toUpperCase() })); break;
      }
    }
    setProfile(next);
    setBrand(nextBrand);
    setApplied(used);
    toast.success(used.length ? "Approved details added. You can edit anything." : "Nothing selected.");
    setStep(1);
  }

  function payload(stepId: string) {
    return {
      id: bpId,
      step: stepId,
      profile: {
        ...profile,
        website_url: profile.website_url || null,
        competitors: profile.competitors.filter((c) => c.name.trim()),
      },
      brand: { colors: brand.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex)), brand_voice: brand.brand_voice, voice_traits: brand.voice_traits, unique_selling_propositions: brand.unique_selling_propositions },
      extraction: extraction && applied.length ? { source: extraction.source, accepted: applied } : null,
    };
  }

  function next() {
    const current = STEPS[step]!.id;
    if (current === "website") {
      setStep(1);
      return;
    }
    if (current === "basics" && (!profile.name.trim() || !profile.industry.trim())) {
      toast.error("Business name and industry are required.");
      return;
    }
    startSaving(async () => {
      const res = await saveOnboardingDraft(payload(current));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBpId(res.data!.id);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function finish() {
    startSaving(async () => {
      const saved = await saveOnboardingDraft(payload("review"));
      if (!saved.ok) return void toast.error(saved.error);
      const res = await completeOnboarding(saved.data!.id);
      if (!res.ok) return void toast.error(res.error);
      router.replace(props.redirectTo);
      router.refresh();
    });
  }

  const current = STEPS[step]!.id;

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted">{props.firstName ? `Welcome, ${props.firstName}.` : "Welcome."} Let&apos;s set up your business.</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This becomes the context for every tool</h1>
        <ol className="mt-6 flex gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex-1">
              <button type="button" disabled={i > step || (!bpId && i > 1)} onClick={() => setStep(i)} className="group w-full text-left disabled:cursor-default" aria-current={i === step ? "step" : undefined}>
                <span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-white/[0.08]")} />
                <span className={cn("mt-2 hidden text-[11px] sm:block", i === step ? "text-fg" : "text-subtle")}>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-7 animate-fade-in" key={current}>
        {current === "website" && (
          <div>
            <h2 className="text-lg font-semibold">Do you have a website?</h2>
            <p className="mt-1 text-sm text-muted">We&apos;ll read your public site and suggest answers. You review and approve everything before it&apos;s saved.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input className="pl-9" placeholder="yourbusiness.com" inputMode="url" aria-label="Website URL" value={profile.website_url}
                  onChange={(ev) => set("website_url", ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && (ev.preventDefault(), analyze())} />
              </div>
              <Button type="button" onClick={analyze} loading={extracting} disabled={!profile.website_url.trim()}>
                <Sparkles /> Analyze website
              </Button>
            </div>
            {!props.aiConfigured && (
              <p className="mt-3 text-xs text-subtle">AI suggestions aren&apos;t configured on this server yet, so we&apos;ll only pull details stated directly on your site.</p>
            )}
            {extracting && (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-bg-2 px-4 py-3 text-sm text-muted">
                <Loader2 className="size-4 animate-spin text-accent" /> Reading your website…
              </div>
            )}
            {extractError && <Notice tone="warning" className="mt-6" title="We couldn't analyze that website">{extractError} You can continue and enter details manually.</Notice>}
            {extraction && (
              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Review suggested details</p>
                  <a href={extraction.source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg">
                    Source: {new URL(extraction.source.url).hostname} · retrieved {new Date(extraction.source.retrievedAt).toLocaleString()} <ExternalLink className="size-3" />
                  </a>
                </div>
                {extraction.ai.error && <p className="mt-2 text-xs text-warning">{extraction.ai.error} Showing details found directly on the site.</p>}
                {extraction.suggestions.length === 0 ? (
                  <Notice tone="info" className="mt-4" title="We didn't find much to pre-fill">The site loaded, but didn&apos;t contain clear business details. Continue to enter them manually.</Notice>
                ) : (
                  <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                    {extraction.suggestions.map((s) => (
                      <li key={s.key} className="flex gap-3 px-4 py-3">
                        <input type="checkbox" id={`sg-${s.key}`} checked={Boolean(accepted[s.key])} onChange={(ev) => setAccepted((a) => ({ ...a, [s.key]: ev.target.checked }))} className="mt-1 size-4 accent-[#ff2929]" />
                        <label htmlFor={`sg-${s.key}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                            {s.label}
                            {s.basis === "stated" ? <Badge tone="success">Found on site</Badge> : <Badge tone="warning">AI suggestion — please verify</Badge>}
                          </span>
                          <SuggestionValue s={s} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={applySuggestions}><Check /> Use selected details</Button>
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>Skip and enter manually</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {current === "basics" && (
          <div className="grid gap-5">
            <StepTitle title="About your business" />
            <Field label="Business name" htmlFor="name"><Input id="name" value={profile.name} onChange={(ev) => set("name", ev.target.value)} maxLength={160} /></Field>
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" list="industries" value={profile.industry} onChange={(ev) => set("industry", ev.target.value)} placeholder="e.g. Residential plumbing" maxLength={120} />
              <datalist id="industries">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
            </Field>
            <Field label="Business description" htmlFor="description" optional hint="What you do and who you serve, in a few sentences.">
              <Textarea id="description" value={profile.description} onChange={(ev) => set("description", ev.target.value)} maxLength={4000} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Location" htmlFor="location" optional><Input id="location" value={profile.location} onChange={(ev) => set("location", ev.target.value)} placeholder="City, region" /></Field>
              <Field label="Service areas" optional hint="Press Enter after each area."><TagInput value={profile.service_areas} onChange={(v) => set("service_areas", v)} placeholder="e.g. Riverside" /></Field>
            </div>
          </div>
        )}

        {current === "offer" && (
          <div className="grid gap-5">
            <StepTitle title="Your offer and audience" skippable />
            <Field label="Products or services" htmlFor="ps" optional><Textarea id="ps" value={profile.products_services} onChange={(ev) => set("products_services", ev.target.value)} placeholder="List your main offerings" /></Field>
            <Field label="Target audience" htmlFor="ta" optional hint="Who buys from you, what they care about, and why they choose you.">
              <Textarea id="ta" value={profile.target_audience} onChange={(ev) => set("target_audience", ev.target.value)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Average customer value" htmlFor="acv" optional hint="Typical revenue per customer, if known.">
                <Input id="acv" inputMode="decimal" value={profile.average_customer_value} onChange={(ev) => set("average_customer_value", ev.target.value)} placeholder="$" />
              </Field>
              <Field label="Monthly marketing budget" htmlFor="budget" optional>
                <Input id="budget" inputMode="decimal" value={profile.monthly_marketing_budget} onChange={(ev) => set("monthly_marketing_budget", ev.target.value)} placeholder="$" />
              </Field>
            </div>
          </div>
        )}

        {current === "market" && (
          <div className="grid gap-6">
            <StepTitle title="Your market and goals" skippable />
            <Field label="Business goals" optional><ChipSelect label="Business goals" options={BUSINESS_GOALS} value={profile.goals} onChange={(v) => set("goals", v)} max={5} /></Field>
            <Field label="Current marketing channels" optional><ChipSelect label="Marketing channels" options={MARKETING_CHANNELS} value={profile.marketing_channels} onChange={(v) => set("marketing_channels", v)} /></Field>
            <Field label="Primary competitors" optional hint="Used later for competitor comparisons."><CompetitorsEditor value={profile.competitors} onChange={(v) => set("competitors", v)} /></Field>
          </div>
        )}

        {current === "brand" && (
          <div className="grid gap-6">
            <StepTitle title="Your brand" skippable />
            <Field label="Logo" optional>
              {props.uploadsConfigured ? (
                <AssetUploader businessProfileId={bpId} kind="logo" label="Upload logo" previewUrl={props.logoUrl} />
              ) : (
                <p className="text-[13px] text-subtle">File storage isn&apos;t configured on this server yet. You can add your logo later in the Brand Kit.</p>
              )}
            </Field>
            <Field label="Brand colors" optional><ColorListEditor value={brand.colors} onChange={(v) => setBrand((b) => ({ ...b, colors: v }))} /></Field>
            <Field label="Brand voice" optional><ChipSelect label="Voice traits" options={VOICE_TRAITS} value={brand.voice_traits} onChange={(v) => setBrand((b) => ({ ...b, voice_traits: v }))} max={4} /></Field>
            <Field label="Describe your voice" htmlFor="voice" optional hint="e.g. Friendly and plain-spoken. We avoid jargon and never use pressure tactics.">
              <Textarea id="voice" value={brand.brand_voice} onChange={(ev) => setBrand((b) => ({ ...b, brand_voice: ev.target.value }))} maxLength={1500} />
            </Field>
            <Field label="Social media links" optional><SocialLinksEditor value={profile.social_links} onChange={(v) => set("social_links", v)} /></Field>
          </div>
        )}

        {current === "review" && (
          <div>
            <StepTitle title="Review and finish" />
            <dl className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
              {[
                ["Business", profile.name],
                ["Website", profile.website_url],
                ["Industry", profile.industry],
                ["Location", [profile.location, profile.service_areas.join(", ")].filter(Boolean).join(" · ")],
                ["Offer", profile.products_services],
                ["Audience", profile.target_audience],
                ["Budget", profile.monthly_marketing_budget && `$${profile.monthly_marketing_budget}/month`],
                ["Goals", profile.goals.join(", ")],
                ["Channels", profile.marketing_channels.join(", ")],
                ["Competitors", profile.competitors.map((c) => c.name).filter(Boolean).join(", ")],
                ["Brand voice", [brand.voice_traits.join(", "), brand.brand_voice].filter(Boolean).join(" — ")],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5">
                  <dt className="text-subtle">{k}</dt>
                  <dd className={cn("min-w-0 break-words", v ? "text-fg" : "text-subtle")}>{v || "Not provided — you can add this later"}</dd>
                </div>
              ))}
            </dl>
            {applied.length > 0 && <p className="mt-3 text-xs text-subtle">Includes {applied.length} detail{applied.length === 1 ? "" : "s"} you approved from your website.</p>}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}><ArrowLeft /> Back</Button>
        <div className="flex gap-2">
          {["offer", "market", "brand"].includes(current) && <Button type="button" variant="ghost" onClick={next} disabled={saving}>Skip for now</Button>}
          {current === "review" ? (
            <Button type="button" onClick={finish} loading={saving}>Finish setup <ArrowRight /></Button>
          ) : current === "website" && extraction ? null : (
            <Button type="button" onClick={next} loading={saving}>{current === "website" ? (profile.website_url ? "Continue without analysis" : "I don't have a website") : "Continue"} <ArrowRight /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepTitle({ title, skippable }: { title: string; skippable?: boolean }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {skippable && <p className="mt-1 text-sm text-muted">Everything here is optional and can be updated later.</p>}
    </div>
  );
}

function SuggestionValue({ s }: { s: Suggestion }) {
  if (s.key === "brand_colors" && Array.isArray(s.value)) {
    return (
      <span className="mt-1.5 flex gap-1.5">
        {(s.value as string[]).map((c) => <span key={c} className="size-5 rounded border border-border" style={{ background: c }} title={c} />)}
      </span>
    );
  }
  if (Array.isArray(s.value)) return <span className="mt-1 block text-[13px] text-muted">{s.value.join(", ")}</span>;
  if (typeof s.value === "object") {
    return <span className="mt-1 block break-all text-[13px] text-muted">{Object.entries(s.value).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>;
  }
  return <span className="mt-1 block text-[13px] text-muted">{s.value}</span>;
}
