"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { normalizeWebsiteUrl } from "@/lib/url";

export function FreeAuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeWebsiteUrl(url);
    if (!normalized.ok) {
      setError(normalized.error);
      return;
    }
    setError(null);
    router.push(`/signup?website=${encodeURIComponent(normalized.url)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="text-lg font-semibold">Start your audit</h2>
      <p className="mt-1 text-sm text-muted">Create a free account and we&apos;ll analyze your website during setup.</p>
      <Field label="Website URL" htmlFor="audit-url" error={error} className="mt-6">
        <Input id="audit-url" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" value={url}
          onChange={(e) => setUrl(e.target.value)} aria-invalid={Boolean(error)} />
      </Field>
      <Button type="submit" size="lg" className="mt-4 w-full">Continue <ArrowRight /></Button>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        The instant, no-signup audit preview is being finalized. For now, your site is analyzed as part of free account setup, and you approve everything before it&apos;s saved.
      </p>
    </form>
  );
}
