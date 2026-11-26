import * as React from "react";
import { AlertTriangle, Info, Plug, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-bg-2">
          <Icon className="size-5 text-muted" />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const noticeTones = {
  info: { icon: Info, cls: "border-info/25 bg-info/[0.06] text-info" },
  warning: { icon: AlertTriangle, cls: "border-warning/25 bg-warning/[0.06] text-warning" },
  error: { icon: AlertTriangle, cls: "border-accent/30 bg-accent-muted text-accent" },
  success: { icon: CheckCircle2, cls: "border-success/25 bg-success/[0.06] text-success" },
  integration: { icon: Plug, cls: "border-border-strong bg-bg-2 text-fg" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof noticeTones;
  title: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { icon: Icon, cls } = noticeTones[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3", cls, className)} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
