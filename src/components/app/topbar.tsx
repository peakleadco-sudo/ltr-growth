"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DropdownMenu } from "radix-ui";
import { Bell, Building2, Check, ChevronsUpDown, LogOut, Menu, Plus, Settings, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { markNotificationsRead, setActiveBusiness } from "@/app/app/actions";
import { cn, formatDate, initials } from "@/lib/utils";

export type TopbarProps = {
  onMenu: () => void;
  user: { name: string | null; email: string | null };
  businesses: { id: string; name: string; is_demo: boolean }[];
  activeBusinessId: string | null;
  canAddBusiness: boolean;
  credits: { remaining: number; total: number };
  planName: string;
  notifications: { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[];
};

const menuContent = "z-50 min-w-56 rounded-lg border border-border bg-card p-1 shadow-2xl shadow-black/60 animate-fade-in";
const menuItem = "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-muted outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-fg";

export function Topbar({ onMenu, user, businesses, activeBusinessId, canAddBusiness, credits, planName, notifications }: TopbarProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0];
  const unread = notifications.filter((n) => !n.read_at).length;

  function switchTo(id: string) {
    start(async () => {
      const res = await setActiveBusiness(id);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-xl sm:px-6">
      <button onClick={onMenu} className="rounded-md p-2 text-muted hover:text-fg lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={cn("flex min-w-0 max-w-[240px] items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[13px] hover:border-border-strong", pending && "opacity-60")} aria-label="Switch business profile">
            <Building2 className="size-4 shrink-0 text-subtle" />
            <span className="truncate font-medium">{active?.name ?? "No business"}</span>
            {active?.is_demo && <span className="rounded-sm border border-warning/40 px-1 text-[9px] uppercase text-warning">Demo</span>}
            <ChevronsUpDown className="size-3.5 shrink-0 text-subtle" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
            <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-subtle">Business profiles</DropdownMenu.Label>
            {businesses.map((b) => (
              <DropdownMenu.Item key={b.id} className={menuItem} onSelect={() => b.id !== active?.id && switchTo(b.id)}>
                <span className="flex-1 truncate">{b.name}</span>
                {b.id === active?.id && <Check className="size-3.5 text-accent" />}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {canAddBusiness ? (
              <DropdownMenu.Item className={menuItem} onSelect={() => router.push("/onboarding?new=1")}>
                <Plus className="size-3.5" /> Add business profile
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item className={menuItem} onSelect={() => router.push("/app/subscription")}>
                <Plus className="size-3.5" /> More profiles on higher plans
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/app/subscription" className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[12px] text-muted hover:border-border-strong hover:text-fg sm:flex" title="AI text credits remaining this period">
          <Sparkles className="size-3.5 text-accent" />
          <span className="tabular-nums"><span className="text-fg">{credits.remaining}</span> credits</span>
          <span className="text-subtle">·</span>
          <span>{planName}</span>
        </Link>

        <DropdownMenu.Root onOpenChange={(o) => { if (!o && unread) start(async () => { await markNotificationsRead(); router.refresh(); }); }}>
          <DropdownMenu.Trigger asChild>
            <button className="relative rounded-md p-2 text-muted hover:bg-white/5 hover:text-fg" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-bg" />}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className={cn(menuContent, "w-80 p-0")}>
              <div className="border-b border-border px-4 py-3 text-sm font-medium">Notifications</div>
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-subtle">You&apos;re all caught up.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto p-1 scrollbar-thin">
                  {notifications.map((n) => (
                    <DropdownMenu.Item key={n.id} className={cn(menuItem, "flex-col items-start gap-0.5")} onSelect={() => n.link && router.push(n.link)}>
                      <span className="flex w-full items-center gap-2">
                        {!n.read_at && <span className="size-1.5 rounded-full bg-accent" />}
                        <span className="flex-1 font-medium text-fg">{n.title}</span>
                        <span className="text-[11px] text-subtle">{formatDate(n.created_at, { month: "short", day: "numeric" })}</span>
                      </span>
                      {n.body && <span className="text-[12px] text-muted">{n.body}</span>}
                    </DropdownMenu.Item>
                  ))}
                </div>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold hover:border-border-strong" aria-label="Account menu">
              {initials(user.name || user.email)}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className={menuContent}>
              <div className="px-2.5 py-2">
                <p className="truncate text-[13px] font-medium">{user.name || "Your account"}</p>
                <p className="truncate text-[12px] text-subtle">{user.email}</p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item className={menuItem} onSelect={() => router.push("/app/settings")}><User className="size-3.5" /> Account settings</DropdownMenu.Item>
              <DropdownMenu.Item className={menuItem} onSelect={() => router.push("/app/settings/business")}><Settings className="size-3.5" /> Business profile</DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <form action="/auth/signout" method="post">
                <button type="submit" className={cn(menuItem, "w-full hover:bg-white/[0.06] hover:text-fg")}><LogOut className="size-3.5" /> Sign out</button>
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
