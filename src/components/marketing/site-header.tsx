"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { SOLUTIONS } from "@/content/solutions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/agency", label: "Work with LTRMarketing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            <div className="relative" onMouseLeave={() => setSolutionsOpen(false)}>
              <button
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-fg"
                aria-expanded={solutionsOpen}
                aria-haspopup="true"
                onClick={() => setSolutionsOpen((v) => !v)}
                onMouseEnter={() => setSolutionsOpen(true)}
              >
                Solutions <ChevronDown className="size-3.5" />
              </button>
              {solutionsOpen && (
                <div className="absolute left-0 top-full w-[560px] pt-2">
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-2 shadow-2xl shadow-black/60 animate-fade-in">
                    {SOLUTIONS.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/solutions/${s.slug}`}
                        className="rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
                        onClick={() => setSolutionsOpen(false)}
                      >
                        {s.navLabel.charAt(0).toUpperCase() + s.navLabel.slice(1)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/free-audit">Get your free audit</Link>
          </Button>
        </div>
        <button
          className="flex size-9 items-center justify-center rounded-md text-muted hover:text-fg lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div className={cn("border-t border-border bg-bg lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-fg">
              {l.label}
            </Link>
          ))}
          <p className="mt-3 px-3 text-[11px] font-medium uppercase tracking-wider text-subtle">Solutions</p>
          {SOLUTIONS.map((s) => (
            <Link key={s.slug} href={`/solutions/${s.slug}`} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-[13px] text-muted hover:bg-white/5 hover:text-fg">
              {s.navLabel.charAt(0).toUpperCase() + s.navLabel.slice(1)}
            </Link>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="secondary"><Link href="/login">Log in</Link></Button>
            <Button asChild><Link href="/free-audit">Free audit</Link></Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
