"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";

export function ForgotForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setPending(false);
    // Don't reveal whether the account exists; only surface rate-limit/network errors.
    if (error && error.status === 429) setError("Too many attempts. Please wait a minute and try again.");
    else setSent(true);
  }

  if (sent) {
    return <Notice tone="success" title="Check your email">If an account exists for that address, you&apos;ll receive a password reset link shortly.</Notice>;
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Notice tone="error" title={error} />}
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Button type="submit" className="w-full" loading={pending}>Send reset link</Button>
    </form>
  );
}
