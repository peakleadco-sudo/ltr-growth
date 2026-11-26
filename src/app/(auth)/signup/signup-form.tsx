"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { createClient } from "@/lib/supabase/client";
import { passwordIssues } from "@/lib/password";

export function SignupForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const issues = passwordIssues(password);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const fullName = String(fd.get("full_name") || "").trim();
    if (issues.length) {
      setError(`Password needs ${issues.join(", ")}.`);
      return;
    }
    if (fd.get("terms") !== "on") {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { full_name: fullName, marketing_consent: fd.get("marketing_consent") === "on" },
      },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in Supabase settings: continue straight to onboarding.
      window.location.assign(next);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-8 text-accent" />
        <p className="mt-4 font-medium">Check your email</p>
        <p className="mt-2 text-sm text-muted">We sent a verification link to <span className="text-fg">{sentTo}</span>. Click it to activate your account and continue setup.</p>
        <p className="mt-4 text-xs text-subtle">Didn&apos;t get it? Check spam, or <Link href="/login" className="underline">log in</Link> to resend.</p>
      </div>
    );
  }

  return (
    <div>
      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Notice tone="error" title={error} />}
        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint={password && issues.length ? `Needs ${issues.join(", ")}` : "At least 10 characters, with a letter and a number."}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2.5 text-[13px] text-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[#ff2929]" />
          <span>I agree to the <Link href="/terms" className="text-fg underline">Terms of Service</Link> and <Link href="/privacy" className="text-fg underline">Privacy Policy</Link>.</span>
        </label>
        <label className="flex items-start gap-2.5 text-[13px] text-muted">
          <input type="checkbox" name="marketing_consent" className="mt-0.5 size-4 accent-[#ff2929]" />
          <span>Send me marketing tips and product updates from LTRMarketing. Optional, unsubscribe anytime.</span>
        </label>
        <Button type="submit" className="w-full" loading={pending}>Create account</Button>
      </form>
    </div>
  );
}
