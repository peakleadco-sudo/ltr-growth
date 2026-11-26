"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSavedGeneration } from "./actions";

export function SaveToggle({ id, saved }: { id: string; saved: boolean }) {
  const [, start] = useTransition();
  const [value, set] = useOptimistic(saved);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={value}
      aria-label={value ? "Remove from saved" : "Save"}
      onClick={() =>
        start(async () => {
          set(!value);
          const r = await toggleSavedGeneration(id, !value);
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      <Star className={value ? "fill-accent text-accent" : undefined} />
    </Button>
  );
}
