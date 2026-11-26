import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/feedback";
import { ALL_NAV_ITEMS, PLAN_ORDER } from "@/lib/features";
import { hasFeature, requireWorkspace } from "@/lib/workspace";

function find(tool: string) {
  return ALL_NAV_ITEMS.find((i) => i.href === `/app/${tool}` && i.status === "upcoming");
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  return { title: find(tool)?.label ?? "Not found" };
}

/** Placeholder for tools scheduled in later build phases. Clearly labelled; no fake functionality. */
export default async function UpcomingToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const item = find(tool);
  if (!item) notFound();
  const ws = await requireWorkspace();
  const included = item.feature ? hasFeature(ws, item.feature) : true;
  const planName = item.minPlan ? item.minPlan.charAt(0).toUpperCase() + item.minPlan.slice(1) : null;

  return (
    <div>
      <PageHeader title={item.label} description={item.description} eyebrow={<Badge><Clock className="size-3" /> In development · {item.release}</Badge>} />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-base font-medium">{item.label} isn&apos;t available yet</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          This tool is part of the next LTR Growth release. When it launches it will use your saved business profile and brand kit automatically.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px]">
          {included ? (
            <Badge tone="success">Included in your {ws.effectivePlan.name} plan</Badge>
          ) : (
            <Badge tone="accent"><Lock className="size-3" /> Requires {planName ?? "a paid"} plan or higher</Badge>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary"><Link href="/app">Back to dashboard</Link></Button>
          {!included && item.minPlan && PLAN_ORDER.indexOf(item.minPlan) > PLAN_ORDER.indexOf(ws.effectivePlan.id) && (
            <Button asChild><Link href="/app/subscription">Compare plans</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}
