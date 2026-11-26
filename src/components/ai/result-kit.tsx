"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Lightbulb, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { GenError } from "./use-generator";

export function CopyButton({ text, label = "Copy", size = "sm", className }: { text: string; label?: string; size?: "sm" | "icon-sm"; className?: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label={size === "icon-sm" ? label : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't access the clipboard.");
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {size !== "icon-sm" && (done ? "Copied" : label)}
    </Button>
  );
}

export function SectionCard({
  title,
  description,
  copyText,
  onRegenerate,
  regenerating,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  copyText?: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)} aria-busy={regenerating || undefined}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-subtle">{description}</p>}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {copyText !== undefined && <CopyButton text={copyText} />}
          {onRegenerate && (
            <Button type="button" variant="ghost" size="sm" onClick={onRegenerate} loading={regenerating} disabled={regenerating} title="Regenerate this section (1 credit)">
              {!regenerating && <RefreshCw />} Regenerate
            </Button>
          )}
        </div>
      </header>
      <div className={cn("p-4 transition-opacity", regenerating && "pointer-events-none opacity-40")}>{children}</div>
    </section>
  );
}

/** Inline-editable text that looks like plain copy until focused. */
export function EditableText({ value, onChange, multiline, className, label, maxChars }: { value: string; onChange: (v: string) => void; multiline?: boolean; className?: string; label: string; maxChars?: number }) {
  const over = maxChars !== undefined && value.length > maxChars;
  const common = "w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed text-fg transition-colors hover:border-border focus:border-accent/60 focus:bg-bg-2 focus:outline-none";
  return (
    <div className="group relative">
      {multiline ? (
        <AutoTextarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(common, className)} />
      ) : (
        <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(common, className)} />
      )}
      {maxChars !== undefined && (
        <span className={cn("pointer-events-none absolute right-2 top-2 text-[10px] tabular-nums opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100", over ? "text-accent opacity-100" : "text-subtle")}>
          {value.length}/{maxChars}
        </span>
      )}
    </div>
  );
}

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

/** Editable list of strings with copy per item, add and remove. */
export function EditableList({ items, onChange, label, maxChars, multiline, numbered }: { items: string[]; onChange: (v: string[]) => void; label: string; maxChars?: number; multiline?: boolean; numbered?: boolean }) {
  return (
    <div>
      <ul className="divide-y divide-border">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1 py-1">
            {numbered && <span className="mt-2 w-5 shrink-0 text-right text-xs tabular-nums text-subtle">{i + 1}</span>}
            <div className="min-w-0 flex-1">
              <EditableText label={`${label} ${i + 1}`} value={item} multiline={multiline} maxChars={maxChars} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
            </div>
            <CopyButton text={item} size="icon-sm" label={`Copy ${label.toLowerCase()} ${i + 1}`} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => onChange([...items, ""])}>
        <Plus /> Add
      </Button>
    </div>
  );
}

export function Assumptions({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-warning/25 bg-warning/[0.05] px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium text-warning"><Lightbulb className="size-4" /> Assumptions to verify</p>
      <p className="mt-1 text-xs text-muted">The AI filled these gaps itself. Check them before publishing, or add the details to your business profile.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">
        {items.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

export function GenerationError({ error }: { error: GenError }) {
  if (error.code === "NOT_CONFIGURED") {
    return (
      <Notice tone="integration" title="AI isn't configured yet">
        {error.message}{" "}
        {error.envVars && <>Required: {error.envVars.map((v) => <code key={v} className="mx-0.5 rounded bg-white/5 px-1 font-mono text-xs">{v}</code>)}. </>}
        No credits were used.
      </Notice>
    );
  }
  if (error.code === "UPGRADE_REQUIRED") {
    return <Notice tone="warning" title="Upgrade required" action={<Button asChild size="sm"><Link href="/app/subscription">Compare plans</Link></Button>}>{error.message}</Notice>;
  }
  if (error.code === "INSUFFICIENT_CREDITS") {
    return <Notice tone="warning" title="Not enough credits" action={<Button asChild size="sm"><Link href="/app/subscription">View plans and credits</Link></Button>}>{error.message}</Notice>;
  }
  return <Notice tone="error" title="Generation failed">{error.message}</Notice>;
}

export function CreditCost({ credits, remaining }: { credits: number; remaining: number }) {
  const enough = remaining >= credits;
  return (
    <span className={cn("text-xs", enough ? "text-subtle" : "text-accent")}>
      Uses {credits} credit{credits === 1 ? "" : "s"} · {remaining} left{!enough && " · not enough"}
    </span>
  );
}

export function AgencyCta({ title, body, service, source }: { title: string; body: string; service: string; source: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{body}</p>
      </div>
      <Button asChild variant="secondary" size="sm" className="shrink-0">
        <Link href={`/app/agency?service=${encodeURIComponent(service)}&source=${encodeURIComponent(source)}`}>
          Talk to LTRMarketing <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

export function GeneratingState({ label, steps }: { label: string; steps: string[] }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 4000);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="rounded-lg border border-border bg-card p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-accent" /></span>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 text-[13px] text-muted">{steps[i]}</p>
      <div className="mt-5 space-y-2">
        {[80, 95, 60, 88, 70].map((w, k) => <div key={k} className="h-3 animate-pulse-soft rounded bg-white/[0.06]" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  );
}

export function SavedBadge({ saved }: { saved: boolean }) {
  return saved ? <Badge tone="success"><Check className="size-3" /> Saved</Badge> : null;
}

export function DeleteIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
      <Trash2 />
    </Button>
  );
}
