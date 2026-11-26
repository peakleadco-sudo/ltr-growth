"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { createTask } from "./actions";

export function NewTaskForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createTask({
            title: fd.get("title"),
            description: fd.get("description") || null,
            category: fd.get("category") || null,
            priority: fd.get("priority"),
            due_date: fd.get("due_date") || null,
          });
          if (!res.ok) toast.error(res.error);
          else {
            toast.success("Task added");
            ref.current?.reset();
          }
        });
      }}
    >
      <Field label="Title" htmlFor="t-title"><Input id="t-title" name="title" required maxLength={300} /></Field>
      <Field label="Details" htmlFor="t-desc" optional><Textarea id="t-desc" name="description" className="min-h-16" maxLength={3000} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority" htmlFor="t-pri">
          <NativeSelect id="t-pri" name="priority" defaultValue="medium"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></NativeSelect>
        </Field>
        <Field label="Due" htmlFor="t-due" optional><Input id="t-due" name="due_date" type="date" /></Field>
      </div>
      <Field label="Category" htmlFor="t-cat" optional><Input id="t-cat" name="category" placeholder="e.g. SEO" maxLength={60} /></Field>
      <Button type="submit" className="w-full" loading={pending}>Add task</Button>
    </form>
  );
}
