"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PlanButton({ planId, current, free, stripeReady }: { planId: string; current: boolean; free: boolean; stripeReady: boolean }) {
  if (current) return <Button size="sm" variant="secondary" className="w-full" disabled>Current plan</Button>;
  if (free) return <Button size="sm" variant="ghost" className="w-full" disabled title="Downgrades are handled in the billing portal">Downgrade in billing portal</Button>;
  return (
    <Button
      size="sm"
      className="w-full"
      variant={stripeReady ? "primary" : "secondary"}
      onClick={() =>
        toast.info(stripeReady ? "Checkout is being enabled in the billing release." : "Billing isn't configured yet", {
          description: stripeReady ? undefined : "An administrator needs to connect Stripe before plans can be purchased.",
        })
      }
      data-plan={planId}
    >
      {stripeReady ? "Upgrade" : "Upgrade (billing not configured)"}
    </Button>
  );
}
