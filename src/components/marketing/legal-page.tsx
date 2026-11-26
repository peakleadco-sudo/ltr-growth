import { AlertTriangle } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-10 flex gap-3 rounded-lg border border-warning/30 bg-warning/[0.06] px-4 py-3 text-sm text-warning" role="note">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p><strong>Template — requires legal review before public launch.</strong> This document is an editable starting point and is not legal advice. Have a qualified lawyer review and adapt it for your jurisdiction and business.</p>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-subtle">Last updated: {updated}</p>
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
