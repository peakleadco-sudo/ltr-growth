"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center">
      <AlertTriangle className="size-6 text-accent" />
      <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">This page couldn&apos;t be loaded. Your data is safe. Try again, and if the problem continues contact support.</p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-subtle">Reference: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
