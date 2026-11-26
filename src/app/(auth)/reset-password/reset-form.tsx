"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import { passwordIssues } from "@/lib/password";

export function ResetForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") || "");
    if (pw !== String(fd.get("confirm") || "")) return setError("Passwords don't match.");
    const issues = passwordIssues(pw);
    if (issues.length) return setError(`Password needs ${issues.join(", ")}.`);
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPending(false);
    if (error) return setError(error.message);
    window.location.href = "/app?password=updated";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Notice tone="error" title={error} />}
      <Field label="New password" htmlFor="password" hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" className="w-full" loading={pending}>Update password</Button>
    </form>
  );
}
