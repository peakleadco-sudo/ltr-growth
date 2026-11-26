"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function ChipSelect({ options, value, onChange, max, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            aria-pressed={on}
            onClick={() => {
              if (on) onChange(value.filter((v) => v !== o));
              else if (!max || value.length < max) onChange([...value, o]);
              else toast.message(`Choose up to ${max}.`);
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[13px] transition-colors",
              on ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function TagInput({ value, onChange, placeholder, max = 30, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; id?: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const parts = draft.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < max) next.push(p);
    onChange(next);
    setDraft("");
  }
  return (
    <div className="rounded-md border border-border bg-bg-2 p-1.5 focus-within:border-accent/70">
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-1">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-0.5 text-[12px]">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="text-subtle hover:text-fg">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length >= max ? `Maximum ${max}` : placeholder ?? "Type and press Enter"}
        disabled={value.length >= max}
        className="h-7 w-full bg-transparent px-1.5 text-sm placeholder:text-subtle focus:outline-none"
      />
    </div>
  );
}

export function ColorListEditor({ value, onChange, max = 8 }: { value: { name: string; hex: string }[]; onChange: (v: { name: string; hex: string }[]) => void; max?: number }) {
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <label className="relative size-9 shrink-0 overflow-hidden rounded-md border border-border" style={{ background: c.hex }}>
            <span className="sr-only">Pick color {i + 1}</span>
            <input type="color" value={c.hex} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <Input value={c.hex} maxLength={7} aria-label="Hex value" className="w-28 font-mono uppercase"
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
          <Input value={c.name} placeholder="Name (e.g. Primary)" aria-label="Color name" maxLength={40}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove color"><Trash2 /></Button>
        </div>
      ))}
      {value.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { name: value.length === 0 ? "Primary" : "", hex: "#FF2929" }])}>
          <Plus /> Add color
        </Button>
      )}
    </div>
  );
}

export function CompetitorsEditor({ value, onChange }: { value: { name: string; url?: string | null }[]; onChange: (v: { name: string; url?: string | null }[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={c.name} placeholder="Competitor name" aria-label="Competitor name" maxLength={160}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <Input value={c.url ?? ""} placeholder="Website (optional)" aria-label="Competitor website" inputMode="url"
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove competitor"><Trash2 /></Button>
        </div>
      ))}
      {value.length < 10 && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { name: "", url: "" }])}>
          <Plus /> Add competitor
        </Button>
      )}
    </div>
  );
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", x: "X", pinterest: "Pinterest", google_business: "Google Business Profile", yelp: "Yelp",
};

export function SocialLinksEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.entries(SOCIAL_LABELS).map(([k, label]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[13px] text-muted">{label}</span>
          <Input value={value[k] ?? ""} inputMode="url" placeholder="https://" aria-label={`${label} URL`}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

export function AssetUploader({
  businessProfileId,
  kind,
  label = "Upload",
  accept = "image/png,image/jpeg,image/webp",
  onUploaded,
  previewUrl,
  compact,
}: {
  businessProfileId: string | null;
  kind: "logo" | "product_photo" | "brand_imagery" | "document" | "other";
  label?: string;
  accept?: string;
  onUploaded?: (r: { asset: { id: string; title: string }; url: string | null }) => void;
  previewUrl?: string | null;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);

  async function upload(file: File) {
    if (!businessProfileId) {
      toast.error("Save your business details first.");
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    fd.set("business_profile_id", businessProfileId);
    fd.set("title", file.name);
    try {
      const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Upload failed.");
        return;
      }
      setPreview(json.url);
      toast.success("Uploaded");
      onUploaded?.(json);
    } catch {
      toast.error("Upload failed. Check your connection.");
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={cn("flex items-center gap-4", compact && "gap-3")}>
      {kind === "logo" && (
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo preview" className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <ImagePlus className="size-5 text-subtle" />
          )}
        </div>
      )}
      <div>
        <input ref={input} type="file" accept={kind === "logo" ? `${accept},image/svg+xml` : accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => input.current?.click()}>
          <Upload /> {label}
        </Button>
        <p className="mt-1.5 text-[11px] text-subtle">PNG, JPG or WebP{kind === "logo" ? " (or plain SVG)" : ""}, up to 10 MB.</p>
      </div>
    </div>
  );
}
