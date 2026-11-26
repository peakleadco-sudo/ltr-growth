"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle, Field, Input, Textarea } from "@/components/ui/primitives";
import { ChipSelect, CompetitorsEditor, SocialLinksEditor, TagInput } from "@/components/app/form-controls";
import { BUSINESS_GOALS, INDUSTRIES, MARKETING_CHANNELS } from "@/lib/schemas";
import type { BusinessProfile } from "@/lib/types";
import { deleteBusinessProfile, updateBusinessProfile } from "../actions";

export function BusinessProfileForm({ bp, canDelete }: { bp: BusinessProfile; canDelete: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState({
    name: bp.name, website_url: bp.website_url ?? "", industry: bp.industry ?? "", description: bp.description ?? "", location: bp.location ?? "",
    service_areas: bp.service_areas, products_services: bp.products_services ?? "", target_audience: bp.target_audience ?? "",
    average_customer_value: bp.average_customer_value?.toString() ?? "", monthly_marketing_budget: bp.monthly_marketing_budget?.toString() ?? "",
    competitors: bp.competitors, marketing_channels: bp.marketing_channels, goals: bp.goals, social_links: bp.social_links,
  });
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));
  const [confirm, setConfirm] = useState("");

  function save() {
    start(async () => {
      const r = await updateBusinessProfile(bp.id, { ...s, website_url: s.website_url || null, competitors: s.competitors.filter((c) => c.name.trim()) });
      if (r.ok) { toast.success("Business profile saved"); router.refresh(); }
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="name"><Input id="name" value={s.name} onChange={(e) => set("name", e.target.value)} maxLength={160} /></Field>
          <Field label="Website" htmlFor="web" optional><Input id="web" value={s.website_url} onChange={(e) => set("website_url", e.target.value)} inputMode="url" /></Field>
          <Field label="Industry" htmlFor="ind" optional>
            <Input id="ind" list="ind-list" value={s.industry} onChange={(e) => set("industry", e.target.value)} />
            <datalist id="ind-list">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
          </Field>
          <Field label="Location" htmlFor="loc" optional><Input id="loc" value={s.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Description" htmlFor="desc" optional className="sm:col-span-2"><Textarea id="desc" value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} /></Field>
          <Field label="Service areas" optional className="sm:col-span-2"><TagInput value={s.service_areas} onChange={(v) => set("service_areas", v)} /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Offer & audience</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Products or services" htmlFor="ps" optional className="sm:col-span-2"><Textarea id="ps" value={s.products_services} onChange={(e) => set("products_services", e.target.value)} /></Field>
          <Field label="Target audience" htmlFor="ta" optional className="sm:col-span-2"><Textarea id="ta" value={s.target_audience} onChange={(e) => set("target_audience", e.target.value)} /></Field>
          <Field label="Average customer value" htmlFor="acv" optional><Input id="acv" inputMode="decimal" value={s.average_customer_value} onChange={(e) => set("average_customer_value", e.target.value)} placeholder="$" /></Field>
          <Field label="Monthly marketing budget" htmlFor="mb" optional><Input id="mb" inputMode="decimal" value={s.monthly_marketing_budget} onChange={(e) => set("monthly_marketing_budget", e.target.value)} placeholder="$" /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Market & goals</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <Field label="Goals" optional><ChipSelect label="Goals" options={BUSINESS_GOALS} value={s.goals} onChange={(v) => set("goals", v)} max={5} /></Field>
          <Field label="Current channels" optional><ChipSelect label="Channels" options={MARKETING_CHANNELS} value={s.marketing_channels} onChange={(v) => set("marketing_channels", v)} /></Field>
          <Field label="Competitors" optional><CompetitorsEditor value={s.competitors} onChange={(v) => set("competitors", v)} /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Social profiles</CardTitle></CardHeader>
        <CardBody><SocialLinksEditor value={s.social_links} onChange={(v) => set("social_links", v)} /></CardBody>
      </Card>
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button onClick={save} loading={pending} className="shadow-xl shadow-black/50"><Save /> Save changes</Button>
      </div>
      {canDelete && (
        <Card className="border-accent/30">
          <CardHeader><div><CardTitle>Delete business profile</CardTitle><CardDescription>Removes this profile with its brand kit, tasks, content and files. This can&apos;t be undone.</CardDescription></div></CardHeader>
          <CardBody className="flex flex-col gap-2 sm:flex-row">
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={`Type "${bp.name}" to confirm`} aria-label="Confirm business name" />
            <Button variant="danger" disabled={confirm.trim() !== bp.name.trim()} onClick={() => start(async () => { const r = await deleteBusinessProfile(bp.id, confirm); if (r && !r.ok) toast.error(r.error); })}>Delete profile</Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
