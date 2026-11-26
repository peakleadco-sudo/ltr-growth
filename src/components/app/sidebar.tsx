"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown, ChevronsLeft, ChevronsRight, Lock, X, type LucideIcon,
  Calculator, CalendarDays, Circle, CreditCard, Flag, FolderOpen, Gauge, Handshake, History, Image, LayoutDashboard, LifeBuoy, LineChart, ListChecks, Mail, MapPin, Megaphone, MessageSquareText, Palette, PenLine, Search, Settings, ShieldCheck, Sparkles, Swords, Target,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Calculator, CalendarDays, Circle, CreditCard, Flag, FolderOpen, Gauge, Handshake, History, Image, LayoutDashboard, LifeBuoy, LineChart, ListChecks, Mail, MapPin, Megaphone, MessageSquareText, Palette, PenLine, Search, Settings, ShieldCheck, Sparkles, Swords, Target };
import { Logo, LogoMark } from "@/components/marketing/logo";
import { NAV, type NavItem } from "@/lib/features";
import { cn } from "@/lib/utils";

type Props = {
  entitlements: string[];
  isAdmin: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const STORAGE_KEY = "ltr.sidebar";

function readPrefs(): { collapsed: boolean; closed: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { collapsed: false, closed: [] };
}

export function Sidebar({ entitlements, isAdmin, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState<string[]>([]);

  useEffect(() => {
    const p = readPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted UI prefs after mount
    setCollapsed(p.collapsed);
    setClosed(p.closed);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed, closed }));
    } catch {}
  }, [collapsed, closed]);

  useEffect(() => {
    onMobileClose();
    // close the drawer on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const ent = new Set(entitlements);

  const content = (isMobile: boolean) => {
    const compact = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col">
        <div className={cn("flex h-14 shrink-0 items-center border-b border-border", compact ? "justify-center px-2" : "justify-between px-4")}>
          {compact ? <Link href="/app" aria-label="Dashboard"><LogoMark /></Link> : <Logo href="/app" />}
          {isMobile && (
            <button onClick={onMobileClose} className="rounded-md p-1.5 text-muted hover:text-fg" aria-label="Close navigation">
              <X className="size-5" />
            </button>
          )}
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3" aria-label="Application">
          {NAV.map((section) => {
            const isClosed = closed.includes(section.id) && !compact;
            return (
              <div key={section.id} className="mb-2">
                {!compact ? (
                  <button
                    onClick={() => setClosed((c) => (c.includes(section.id) ? c.filter((x) => x !== section.id) : [...c, section.id]))}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle hover:text-muted"
                    aria-expanded={!isClosed}
                  >
                    {section.label}
                    <ChevronDown className={cn("size-3 transition-transform", isClosed && "-rotate-90")} />
                  </button>
                ) : (
                  <div className="mx-2 my-2 h-px bg-border" />
                )}
                {!isClosed && (
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} compact={compact}
                        locked={Boolean(item.feature && !ent.has(item.feature) && item.status === "available")} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {isAdmin && (
            <div className="mb-2">
              {!compact && <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle">Admin</p>}
              <ul>
                <SidebarLink item={{ label: "Admin portal", href: "/admin", icon: "ShieldCheck", status: "available" }} active={pathname.startsWith("/admin")} compact={compact} locked={false} />
              </ul>
            </div>
          )}
        </nav>
        <div className="shrink-0 border-t border-border p-2">
          <Link
            href="/app/agency"
            className={cn(
              "group flex items-center gap-2.5 rounded-md border border-accent/40 bg-accent-muted px-2.5 py-2 text-[13px] font-medium text-fg transition-colors hover:border-accent",
              compact && "justify-center px-0",
            )}
            title="Work With LTRMarketing"
          >
            <Handshake className="size-4 shrink-0 text-accent" />
            {!compact && <span>Work With LTRMarketing</span>}
          </Link>
          {!isMobile && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className={cn("mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12px] text-subtle hover:bg-white/5 hover:text-fg", compact && "justify-center px-0")}
              aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            >
              {compact ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "app-chrome sticky top-0 hidden h-screen shrink-0 border-r border-border bg-bg transition-[width] duration-200 lg:block",
          collapsed ? "w-[60px]" : "w-[248px]",
        )}
      >
        {content(false)}
      </aside>
      {/* Mobile drawer */}
      <div className={cn("app-chrome fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!mobileOpen}>
        <div className={cn("absolute inset-0 bg-black/70 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} onClick={onMobileClose} />
        <aside className={cn("absolute inset-y-0 left-0 w-[280px] border-r border-border bg-bg transition-transform duration-200", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          {content(true)}
        </aside>
      </div>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarLink({ item, active, compact, locked }: { item: NavItem; active: boolean; compact: boolean; locked: boolean }) {
  const Icon = ICONS[item.icon] ?? Circle;
  return (
    <li>
      <Link
        href={item.href}
        title={compact ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
          active ? "bg-white/[0.07] text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg",
          compact && "justify-center px-0",
        )}
      >
        {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
        <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-subtle group-hover:text-muted")} />
        {!compact && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.status === "upcoming" && <span className="rounded-sm border border-border px-1 py-px text-[9px] uppercase tracking-wide text-subtle">Soon</span>}
            {locked && <Lock className="size-3 text-subtle" aria-label="Upgrade required" />}
          </>
        )}
      </Link>
    </li>
  );
}
