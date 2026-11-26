"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Gauge,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Palette,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AD_LINES = [
  "Same-day drain repair in Riverside. No call-out fee this month.",
  "Booked in 60 seconds. Fixed the same day. Local, licensed, insured.",
  "Clogged drain? Our Riverside team is 20 minutes away.",
];

const TASKS = [
  "Add a click-to-call button above the fold",
  "Write meta descriptions for 4 service pages",
  "Publish this week's Google Business post",
  "Launch the drain-repair search campaign",
];

/** Animated, illustrative preview of the product UI. Uses a fictional business. */
export function HeroPreview() {
  const [score, setScore] = useState(0);
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(0);

  useEffect(() => {
    const target = 72;
    const id = setInterval(() => setScore((s) => (s >= target ? target : s + 2)), 28);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const full = AD_LINES[line]!;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        setTimeout(() => setLine((l) => (l + 1) % AD_LINES.length), 2200);
      }
    }, 28);
    return () => clearInterval(id);
  }, [line]);

  useEffect(() => {
    const id = setInterval(() => setDone((d) => (d + 1) % (TASKS.length + 1)), 1800);
    return () => clearInterval(id);
  }, []);

  const circumference = 2 * Math.PI * 34;

  return (
    <div className="relative" aria-label="Illustrative preview of the LTR Growth dashboard" role="img">
      <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-white/15 to-transparent" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg-2 shadow-[0_40px_120px_-20px_rgba(255,41,41,0.18)]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="ml-3 rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-subtle">LTR Growth · Dashboard</span>
          <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-subtle">Illustrative preview</span>
        </div>
        <div className="flex">
          {/* sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border p-3 sm:block">
            {[
              [LayoutDashboard, "Dashboard", true],
              [Sparkles, "LTR AI", false],
              [Megaphone, "Ad Studio", false],
              [MessageSquareText, "Social Studio", false],
              [Gauge, "Website Audit", false],
              [Target, "Strategy", false],
              [Palette, "Brand Kit", false],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof LayoutDashboard;
              return (
                <div key={label as string} className={cn("mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", active ? "bg-white/[0.06] text-fg" : "text-subtle")}>
                  <I className="size-3.5" />
                  {label as string}
                </div>
              );
            })}
          </div>
          {/* content */}
          <div className="min-w-0 flex-1 p-4">
            <p className="text-[11px] text-subtle">Good morning, Riverside Plumbing Co.</p>
            <p className="mt-0.5 text-sm font-semibold">Your marketing command center</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3">
                <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke="#FF2929" strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
                </svg>
                <p className="-mt-[52px] mb-6 text-xl font-semibold tabular-nums">{score}</p>
                <p className="text-[10px] text-subtle">Marketing readiness</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-subtle">
                  <Megaphone className="size-3" /> Ad Studio · Google Ads headline
                </div>
                <p className="mt-2 min-h-[40px] text-[13px] leading-snug text-fg">
                  {typed}
                  <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-accent" />
                </p>
                <div className="mt-2 flex gap-1.5">
                  {["Hook", "Headline", "Description", "Script"].map((t, i) => (
                    <span key={t} className={cn("rounded-sm border px-1.5 py-0.5 text-[9px]", i === 1 ? "border-accent/40 text-accent" : "border-border text-subtle")}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">This week&apos;s tasks</p>
              <ul className="mt-2 space-y-1.5">
                {TASKS.map((t, i) => (
                  <li key={t} className="flex items-center gap-2 text-[12px]">
                    {i < done ? <CheckCircle2 className="size-3.5 text-accent" /> : <Circle className="size-3.5 text-subtle" />}
                    <span className={cn("transition-colors", i < done ? "text-subtle line-through" : "text-muted")}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
