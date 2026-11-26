"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { submitSupportRequest } from "./actions";

export function SupportForm({ email }: { email: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form ref={ref} className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const r = await submitSupportRequest({ subject: fd.get("subject"), message: fd.get("message") });
        if (r.ok) { toast.success("Message sent. We'll reply by email."); ref.current?.reset(); }
        else toast.error(r.error);
      });
    }}>
      <p className="text-[12px] text-subtle">We&apos;ll reply to {email}.</p>
      <Field label="Subject" htmlFor="s-sub"><Input id="s-sub" name="subject" required maxLength={200} /></Field>
      <Field label="Message" htmlFor="s-msg"><Textarea id="s-msg" name="message" required maxLength={5000} /></Field>
      <Button type="submit" loading={pending}>Send message</Button>
    </form>
  );
}
