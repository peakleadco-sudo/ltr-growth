"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, Plus, Save, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle, Field, Input, Textarea, Badge } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { AssetUploader, ChipSelect, ColorListEditor, TagInput } from "@/components/app/form-controls";
import { VOICE_TRAITS } from "@/lib/schemas";
import type { BrandKit } from "@/lib/types";
import { saveBrandKit, setLogo } from "./actions";

type AssetView = { id: string; kind: string; title: string | null; url: string | null };

export function BrandKitEditor({ kit, businessName, businessProfileId, assets, fullAccess, storageConfigured }: {
  kit: BrandKit | null;
  businessName: string;
  businessProfileId: string;
  assets: AssetView[];
  fullAccess: boolean;
  storageConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState({
    colors: kit?.colors ?? [],
    fonts: kit?.fonts ?? [],
    brand_voice: kit?.brand_voice ?? "",
    voice_traits: kit?.voice_traits ?? [],
    mission: kit?.mission ?? "",
    tagline: kit?.tagline ?? "",
    unique_selling_propositions: kit?.unique_selling_propositions ?? [],
    approved_claims: kit?.approved_claims ?? [],
    preferred_terms: kit?.preferred_terms ?? [],
    restricted_terms: kit?.restricted_terms ?? [],
    customer_profiles: kit?.customer_profiles ?? [],
  });
  const set = <K extends keyof typeof state>(k: K, v: (typeof state)[K]) => setState((s) => ({ ...s, [k]: v }));
  const logos = assets.filter((a) => a.kind === "logo");
  const media = assets.filter((a) => a.kind !== "logo");
  const currentLogo = assets.find((a) => a.id === kit?.logo_asset_id) ?? null;

  function save() {
    start(async () => {
      const res = await saveBrandKit({ ...state, fonts: state.fonts.filter((f) => f.family.trim()), customer_profiles: state.customer_profiles.filter((c) => c.name.trim()) });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Brand kit saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader><div><CardTitle>Logo</CardTitle><CardDescription>Used on creatives and branded reports.</CardDescription></div></CardHeader>
          <CardBody>
            {storageConfigured ? (
              <div className="space-y-4">
                <AssetUploader businessProfileId={businessProfileId} kind="logo" label={currentLogo ? "Upload new logo" : "Upload logo"} previewUrl={currentLogo?.url} onUploaded={() => router.refresh()} />
                {logos.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {logos.map((l) => (
                      <button key={l.id} type="button" onClick={() => start(async () => { const r = await setLogo(l.id); if (!r.ok) toast.error(r.error); else router.refresh(); })}
                        className={`relative flex size-16 items-center justify-center rounded-md border bg-bg-2 p-1.5 ${l.id === kit?.logo_asset_id ? "border-accent" : "border-border hover:border-border-strong"}`} aria-label={`Use ${l.title ?? "logo"} as primary logo`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {l.url && <img src={l.url} alt="" className="max-h-full max-w-full object-contain" />}
                        {l.id === kit?.logo_asset_id && <Star className="absolute -right-1.5 -top-1.5 size-4 fill-accent text-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Notice tone="integration" title="File storage isn't configured">Set SUPABASE_SERVICE_ROLE_KEY on the server to enable secure uploads.</Notice>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Colors & tagline</CardTitle></div></CardHeader>
          <CardBody className="space-y-5">
            <Field label="Brand colors"><ColorListEditor value={state.colors} onChange={(v) => set("colors", v)} max={12} /></Field>
            <Field label="Tagline" htmlFor="tagline" optional><Input id="tagline" value={state.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Brand voice</CardTitle><CardDescription>How your marketing should sound.</CardDescription></div></CardHeader>
          <CardBody className="space-y-5">
            <ChipSelect label="Voice traits" options={VOICE_TRAITS} value={state.voice_traits} onChange={(v) => set("voice_traits", v)} max={4} />
            <Field label="Voice description" htmlFor="voice" optional><Textarea id="voice" value={state.brand_voice} onChange={(e) => set("brand_voice", e.target.value)} maxLength={1500} /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Positioning</CardTitle><CardDescription>Mission, differentiators and fonts.</CardDescription></div>{!fullAccess && <Badge tone="accent">Starter+</Badge>}</CardHeader>
          <CardBody>
            <Locked full={fullAccess}>
              <div className="space-y-5">
                <Field label="Mission" htmlFor="mission" optional><Textarea id="mission" value={state.mission} onChange={(e) => set("mission", e.target.value)} maxLength={1500} className="min-h-16" /></Field>
                <Field label="Unique selling propositions" optional hint="What genuinely sets you apart. Press Enter after each."><TagInput value={state.unique_selling_propositions} onChange={(v) => set("unique_selling_propositions", v)} max={12} /></Field>
                <Field label="Fonts" optional>
                  <div className="space-y-2">
                    {state.fonts.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={f.role} placeholder="Role (e.g. Headings)" aria-label="Font role" onChange={(e) => set("fonts", state.fonts.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
                        <Input value={f.family} placeholder="Font family" aria-label="Font family" onChange={(e) => set("fonts", state.fonts.map((x, j) => (j === i ? { ...x, family: e.target.value } : x)))} />
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove font" onClick={() => set("fonts", state.fonts.filter((_, j) => j !== i))}><Trash2 /></Button>
                      </div>
                    ))}
                    {state.fonts.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => set("fonts", [...state.fonts, { role: state.fonts.length ? "Body" : "Headings", family: "" }])}><Plus /> Add font</Button>}
                  </div>
                </Field>
              </div>
            </Locked>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Claims & terminology</CardTitle><CardDescription>Guardrails every generator follows.</CardDescription></div>{!fullAccess && <Badge tone="accent">Starter+</Badge>}</CardHeader>
          <CardBody>
            <Locked full={fullAccess}>
              <div className="space-y-5">
                <Field label="Approved marketing claims" optional hint="Only claims you can substantiate, e.g. 'Licensed and insured in Ohio'."><TagInput value={state.approved_claims} onChange={(v) => set("approved_claims", v)} max={30} /></Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Preferred terminology" optional><TagInput value={state.preferred_terms} onChange={(v) => set("preferred_terms", v)} max={50} placeholder="e.g. clients" /></Field>
                  <Field label="Restricted terminology" optional hint="Words generators must never use."><TagInput value={state.restricted_terms} onChange={(v) => set("restricted_terms", v)} max={50} placeholder="e.g. cheap" /></Field>
                </div>
              </div>
            </Locked>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Customer profiles</CardTitle><CardDescription>Who you&apos;re talking to.</CardDescription></div>{!fullAccess && <Badge tone="accent">Starter+</Badge>}</CardHeader>
          <CardBody>
            <Locked full={fullAccess}>
              <div className="space-y-3">
                {state.customer_profiles.map((c, i) => (
                  <div key={i} className="rounded-md border border-border bg-bg-2 p-3">
                    <div className="flex gap-2">
                      <Input value={c.name} placeholder="Profile name (e.g. First-time homeowner)" aria-label="Customer profile name" onChange={(e) => set("customer_profiles", state.customer_profiles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove profile" onClick={() => set("customer_profiles", state.customer_profiles.filter((_, j) => j !== i))}><Trash2 /></Button>
                    </div>
                    <Textarea className="mt-2 min-h-16" value={c.description} placeholder="Needs, objections, where they spend time…" aria-label="Customer profile description" onChange={(e) => set("customer_profiles", state.customer_profiles.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                  </div>
                ))}
                {state.customer_profiles.length < 8 && <Button type="button" variant="outline" size="sm" onClick={() => set("customer_profiles", [...state.customer_profiles, { name: "", description: "" }])}><Plus /> Add customer profile</Button>}
              </div>
            </Locked>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Product photos & brand imagery</CardTitle><CardDescription>Genuine images used by the Creative Studio.</CardDescription></div>{!fullAccess && <Badge tone="accent">Starter+</Badge>}</CardHeader>
          <CardBody>
            {!storageConfigured ? <p className="text-[13px] text-subtle">File storage isn&apos;t configured yet.</p> : (
              <Locked full={fullAccess}>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <AssetUploader businessProfileId={businessProfileId} kind="product_photo" label="Upload product photo" onUploaded={() => router.refresh()} compact />
                    <AssetUploader businessProfileId={businessProfileId} kind="brand_imagery" label="Upload brand image" onUploaded={() => router.refresh()} compact />
                  </div>
                  {media.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {media.map((m) => (
                        <a key={m.id} href={`/api/assets/${m.id}`} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-md border border-border bg-bg-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {m.url && <img src={m.url} alt={m.title ?? ""} className="size-full object-cover" loading="lazy" />}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Locked>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Preview */}
      <div className="xl:sticky xl:top-20 xl:h-fit">
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-white/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {currentLogo?.url ? <img src={currentLogo.url} alt="Logo" className="max-h-full max-w-full object-contain p-1" /> : <span className="text-[10px] text-subtle">Logo</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold" style={{ fontFamily: state.fonts[0]?.family || undefined }}>{businessName}</p>
                {state.tagline && <p className="truncate text-[12px] text-muted">{state.tagline}</p>}
              </div>
            </div>
            {state.colors.length > 0 && (
              <div className="flex overflow-hidden rounded-md border border-border">
                {state.colors.map((c, i) => <div key={i} className="h-12 flex-1" style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />)}
              </div>
            )}
            {state.colors[0] && (
              <div className="rounded-md p-4" style={{ background: state.colors[0].hex, color: contrastText(state.colors[0].hex) }}>
                <p className="text-sm font-semibold" style={{ fontFamily: state.fonts[0]?.family || undefined }}>Sample headline</p>
                <p className="mt-1 text-[12px] opacity-90" style={{ fontFamily: state.fonts[1]?.family || undefined }}>This is how a branded promotion might look.</p>
              </div>
            )}
            {state.voice_traits.length > 0 && <div className="flex flex-wrap gap-1.5">{state.voice_traits.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
            {state.restricted_terms.length > 0 && <p className="text-[12px] text-subtle">Never say: {state.restricted_terms.join(", ")}</p>}
            <Button className="w-full" onClick={save} loading={pending}><Save /> Save brand kit</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function contrastText(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255 > 0.6 ? "#000" : "#fff";
}

function Locked({ full, children }: { full: boolean; children: React.ReactNode }) {
  if (full) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40" aria-hidden inert>{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link href="/app/subscription" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[13px] hover:border-border-strong"><Lock className="size-3.5 text-accent" /> Available on Starter and above</Link>
      </div>
    </div>
  );
}
