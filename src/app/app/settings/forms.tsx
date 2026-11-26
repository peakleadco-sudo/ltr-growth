"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle, Field, Input } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { passwordIssues } from "@/lib/password";
import { deleteAccount, updateAccount } from "./actions";

export function AccountForm({ fullName, marketingConsent }: { fullName: string; marketingConsent: boolean }) {
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const r = await updateAccount({ full_name: fd.get("full_name"), marketing_consent: fd.get("marketing_consent") === "on" });
        if (r.ok) toast.success("Saved");
        else toast.error(r.error);
      });
    }}>
      <Field label="Full name" htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={fullName} maxLength={120} required /></Field>
      <label className="flex items-start gap-2.5 text-[13px] text-muted">
        <input type="checkbox" name="marketing_consent" defaultChecked={marketingConsent} className="mt-0.5 size-4 accent-[#ff2929]" />
        <span>Send me marketing tips and offers from LTRMarketing. You can change this at any time.</span>
      </label>
      <Button type="submit" size="sm" loading={pending}>Save</Button>
    </form>
  );
}

export function PasswordForm() {
  const [pending, setPending] = useState(false);
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const pw = String(fd.get("password"));
      if (pw !== String(fd.get("confirm"))) return void toast.error("Passwords don't match.");
      const issues = passwordIssues(pw);
      if (issues.length) return void toast.error(`Password needs ${issues.join(", ")}.`);
      setPending(true);
      const { error } = await createClient().auth.updateUser({ password: pw });
      setPending(false);
      if (error) toast.error(error.message);
      else { toast.success("Password updated"); form.reset(); }
    }}>
      <Field label="New password" htmlFor="pw"><Input id="pw" name="password" type="password" autoComplete="new-password" required /></Field>
      <Field label="Confirm password" htmlFor="pw2"><Input id="pw2" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <div className="sm:col-span-2"><Button type="submit" size="sm" variant="secondary" loading={pending}>Update password</Button></div>
    </form>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card className="border-accent/30">
      <CardHeader><div><CardTitle>Delete account</CardTitle><CardDescription>Permanently deletes your account and any workspace you solely own, including all business profiles, generated content and uploaded files. This can&apos;t be undone.</CardDescription></div></CardHeader>
      <CardBody>
        {!open ? (
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Delete my account</Button>
        ) : (
          <div className="space-y-3">
            <Field label='Type "DELETE" to confirm' htmlFor="confirm-del"><Input id="confirm-del" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></Field>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" disabled={confirm !== "DELETE"} loading={pending}
                onClick={() => start(async () => { const r = await deleteAccount(confirm); if (r && !r.ok) toast.error(r.error); })}>Permanently delete</Button>
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
