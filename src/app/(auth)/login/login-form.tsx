"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  auth_callback: "That sign-in link is invalid or has expired. Please try again.",
  verification: "We couldn't verify your email. The link may have expired.",
};

export function LoginForm({ next, googleEnabled, initialError }: { next: string; googleEnabled: boolean; initialError?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError] ?? "Something went wrong. Please try again." : null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    setPending(true);
    setError(null);
    setUnconfirmed(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setPending(false);
      if (error.code === "email_not_confirmed") {
        setUnconfirmed(email);
        return;
      }
      setError(error.code === "invalid_credentials" ? "Incorrect email or password." : error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function resend() {
    if (!unconfirmed) return;
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
    else setResent(true);
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
        {unconfirmed && (
          <Notice tone="warning" title="Please verify your email first"
            action={resent ? <p className="text-xs text-success">Verification email sent. Check your inbox.</p> : <Button type="button" size="sm" variant="secondary" onClick={resend}>Resend verification email</Button>}>
            We sent a verification link to {unconfirmed}.
          </Notice>
        )}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] text-muted hover:text-fg">Forgot password?</Link>
        </div>
        <Button type="submit" className="w-full" loading={pending}>Log in</Button>
      </form>
    </div>
  );
}
