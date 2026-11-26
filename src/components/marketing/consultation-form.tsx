"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";

export const AGENCY_SERVICES: { value: string; label: string }[] = [
  { value: "managed_advertising", label: "Managed advertising" },
  { value: "website_design", label: "Website design" },
  { value: "seo", label: "SEO management" },
  { value: "google_business_profile", label: "Google Business Profile" },
  { value: "content_production", label: "Content production" },
  { value: "marketing_strategy", label: "Marketing strategy" },
  { value: "growth_consulting", label: "Growth consulting" },
  { value: "ai_automation", label: "AI automation & lead follow-up" },
];

export type ConsultationDefaults = {
  name?: string;
  email?: string;
  business_name?: string;
  website?: string;
  industry?: string;
  services?: string[];
};

export function ConsultationForm({
  source = "agency_page",
  sourceContext,
  defaults,
}: {
  source?: string;
  sourceContext?: Record<string, unknown>;
  defaults?: ConsultationDefaults;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [services, setServices] = useState<string[]>(defaults?.services ?? []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          business_name: fd.get("business_name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          website: fd.get("website"),
          industry: fd.get("industry"),
          marketing_budget: fd.get("marketing_budget"),
          goals: fd.get("goals"),
          contact_method: fd.get("contact_method"),
          marketing_consent: fd.get("marketing_consent") === "on",
          company_url_confirm: fd.get("company_url_confirm") || undefined,
          services,
          source,
          source_context: sourceContext,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <CheckCircle2 className="size-8 text-accent" />
        <p className="mt-4 text-lg font-semibold">Request received</p>
        <p className="mt-2 max-w-sm text-sm text-muted">A member of the LTRMarketing team will contact you using your preferred method to arrange your consultation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name" htmlFor="c-name"><Input id="c-name" name="name" required autoComplete="name" defaultValue={defaults?.name} /></Field>
      <Field label="Business name" htmlFor="c-biz"><Input id="c-biz" name="business_name" required autoComplete="organization" defaultValue={defaults?.business_name} /></Field>
      <Field label="Email" htmlFor="c-email"><Input id="c-email" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} /></Field>
      <Field label="Phone" htmlFor="c-phone" optional><Input id="c-phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Website" htmlFor="c-web" optional><Input id="c-web" name="website" inputMode="url" defaultValue={defaults?.website} /></Field>
      <Field label="Industry" htmlFor="c-ind" optional><Input id="c-ind" name="industry" defaultValue={defaults?.industry} /></Field>
      <Field label="Monthly marketing budget" htmlFor="c-budget" optional>
        <NativeSelect id="c-budget" name="marketing_budget" defaultValue="">
          <option value="">Prefer not to say</option>
          <option>Under $1,000</option>
          <option>$1,000 – $2,500</option>
          <option>$2,500 – $5,000</option>
          <option>$5,000 – $10,000</option>
          <option>$10,000+</option>
        </NativeSelect>
      </Field>
      <Field label="Preferred contact method" htmlFor="c-method">
        <NativeSelect id="c-method" name="contact_method" defaultValue="email">
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="video_call">Video call</option>
        </NativeSelect>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-[13px] font-medium">Services you&apos;re interested in</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {AGENCY_SERVICES.map((s) => {
            const on = services.includes(s.value);
            return (
              <button type="button" key={s.value} aria-pressed={on}
                onClick={() => setServices((v) => (on ? v.filter((x) => x !== s.value) : [...v, s.value]))}
                className={`rounded-md border px-3 py-1.5 text-[13px] transition-colors ${on ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg"}`}>
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="Business goals" htmlFor="c-goals" optional className="sm:col-span-2">
        <Textarea id="c-goals" name="goals" placeholder="What would you like to achieve in the next 6–12 months?" />
      </Field>
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>Leave this empty<input name="company_url_confirm" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2.5 text-[13px] text-muted sm:col-span-2">
        <input type="checkbox" name="marketing_consent" className="mt-0.5 size-4 accent-[#ff2929]" />
        <span>I&apos;d like to receive occasional marketing tips and offers from LTRMarketing. You can unsubscribe anytime. (Optional)</span>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">Request free consultation</Button>
        <p className="mt-3 text-xs text-subtle">We use these details only to respond to your request. See our <a href="/privacy" className="underline">privacy policy</a>.</p>
      </div>
    </form>
  );
}
