import Link from "next/link";
import { History, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/primitives";
import type { PlanId } from "@/lib/types";

/** Server wrapper for AI tool pages: header, plan gate and configuration notice. */
export function ToolShell({
  title,
  description,
  included,
  minPlan,
  aiConfigured,
  historyTool,
  children,
}: {
  title: string;
  description: string;
  included: boolean;
  minPlan?: PlanId;
  aiConfigured: boolean;
  historyTool?: string;
  children: React.ReactNode;
}) {
  const planName = minPlan ? minPlan.charAt(0).toUpperCase() + minPlan.slice(1) : "a paid";
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={historyTool && included ? (
          <Button asChild variant="secondary" size="sm"><Link href={`/app/history?tool=${historyTool}`}><History /> History</Link></Button>
        ) : undefined}
      />
      {!included ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Badge tone="accent"><Lock className="size-3" /> {planName} plan or higher</Badge>
          <p className="mt-4 text-base font-medium">{title} isn&apos;t included in your current plan</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Upgrade to use {title} with your saved business profile and brand kit. Your data stays as it is.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild><Link href="/app/subscription">Compare plans</Link></Button>
            <Button asChild variant="secondary"><Link href="/app">Back to dashboard</Link></Button>
          </div>
        </div>
      ) : (
        <>
          {!aiConfigured && (
            <Notice tone="integration" title="AI generation isn't configured yet" className="mb-5">
              Add <code className="rounded bg-white/5 px-1 font-mono text-xs">OPENAI_API_KEY</code> and <code className="rounded bg-white/5 px-1 font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to the server environment to enable this tool. You can still fill in the form; generating will explain what&apos;s missing and won&apos;t use credits.
            </Notice>
          )}
          {children}
        </>
      )}
    </div>
  );
}
