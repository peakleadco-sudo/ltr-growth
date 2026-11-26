"use client";

import { useState } from "react";
import { Gauge, Megaphone, MessageSquareText, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  icon: typeof Megaphone;
  title: string;
  input: string[];
  output: React.ReactNode;
};

const TABS: Tab[] = [
  {
    id: "ads",
    label: "Ad Studio",
    icon: Megaphone,
    title: "Meta Ads · Lead generation",
    input: ["Offer: Free in-home design consultation", "Audience: Homeowners, 35–60, within 15 miles", "Tone: Confident, warm"],
    output: (
      <div className="space-y-3">
        <Block label="Hook">Your kitchen shouldn&apos;t be the room you apologize for.</Block>
        <Block label="Primary text">
          Book a free in-home design consultation with our local team. We&apos;ll measure, listen and show you three layout options before you commit to anything.
        </Block>
        <div className="grid gap-3 sm:grid-cols-2">
          <Block label="Headline A">See your new kitchen first</Block>
          <Block label="Headline B">Free design visit this month</Block>
        </div>
        <Block label="Suggested test">Run A and B with the same audience for 7 days before changing budget.</Block>
      </div>
    ),
  },
  {
    id: "audit",
    label: "Website Audit",
    icon: Gauge,
    title: "Audit findings · prioritized",
    input: ["URL: example-kitchens.com", "Scope: home page + 12 linked pages", "Sources: page fetch, PageSpeed Insights"],
    output: (
      <ul className="space-y-2.5">
        {[
          ["High", "No phone number or booking button visible above the fold on mobile", "Easy"],
          ["High", "4 pages share the same title tag", "Easy"],
          ["Medium", "11 images are missing alternative text", "Easy"],
          ["Medium", "No LocalBusiness structured data found", "Moderate"],
          ["Unverified", "Core Web Vitals: PageSpeed data not available for this run", "—"],
        ].map(([sev, text, diff]) => (
          <li key={text} className="flex items-start gap-3 rounded-md border border-border bg-bg-2 px-3 py-2.5">
            <span className={cn("mt-0.5 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
              sev === "High" ? "border-accent/40 text-accent" : sev === "Unverified" ? "border-border text-subtle" : "border-warning/30 text-warning")}>{sev}</span>
            <span className="flex-1 text-[13px] text-muted">{text}</span>
            <span className="shrink-0 text-[11px] text-subtle">{diff}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "social",
    label: "Social Studio",
    icon: MessageSquareText,
    title: "Instagram · 14-day plan",
    input: ["Pillars: Education, Behind the scenes, Offers", "Cadence: 4 posts/week", "Goal: Consultation bookings"],
    output: (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Mon", "Carousel", "5 layout mistakes that shrink a small kitchen"],
          ["Wed", "Reel", "Timelapse: one install, start to finish"],
          ["Fri", "Story", "Poll: open shelves or cabinets?"],
          ["Sun", "Post", "Free design visits — limited spots this month"],
        ].map(([day, type, text]) => (
          <div key={day} className="rounded-md border border-border bg-bg-2 p-2.5">
            <p className="text-[10px] font-medium text-subtle">{day} · {type}</p>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">{text}</p>
            <span className="mt-2 inline-block rounded-sm border border-border px-1 py-0.5 text-[9px] text-subtle">Draft</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: Target,
    title: "90-day strategy · Week 1 tasks",
    input: ["Budget: $1,500 / month", "Goal: 20 qualified consultations / month", "Channels today: Website, Instagram"],
    output: (
      <div className="space-y-3">
        <Block label="Suggested starting allocation (to test, not a guarantee)">
          <div className="mt-2 space-y-1.5">
            {[["Google Search", 50], ["Meta lead ads", 35], ["Retargeting", 15]].map(([k, v]) => (
              <div key={k as string} className="flex items-center gap-3 text-[12px]">
                <span className="w-28 text-muted">{k}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full bg-accent" style={{ width: `${v}%` }} /></span>
                <span className="w-8 text-right tabular-nums text-subtle">{v}%</span>
              </div>
            ))}
          </div>
        </Block>
        <Block label="Week 1">Set up conversion tracking · Add booking button to every service page · Draft 3 search ad groups</Block>
      </div>
    ),
  },
];

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-2 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">{label}</p>
      <div className="mt-1.5 text-[13px] leading-relaxed text-fg">{children}</div>
    </div>
  );
}

export function ProductDemo() {
  const [active, setActive] = useState(TABS[0]!.id);
  const tab = TABS.find((t) => t.id === active)!;
  return (
    <div className="rounded-xl border border-border bg-card">
      <div role="tablist" aria-label="Product demonstration" className="flex gap-1 overflow-x-auto border-b border-border p-2 scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              t.id === active ? "bg-white/[0.07] text-fg" : "text-muted hover:text-fg",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="border-b border-border p-5 md:border-b-0 md:border-r">
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">Your inputs</p>
          <ul className="mt-3 space-y-2">
            {tab.input.map((i) => (
              <li key={i} className="rounded-md border border-border bg-bg-2 px-3 py-2 text-[12px] text-muted">{i}</li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-subtle">
            Plus your saved business profile and brand kit, applied automatically.
          </p>
        </div>
        <div key={tab.id} className="p-5 animate-fade-in">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{tab.title}</p>
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-subtle">Example output · fictional business</span>
          </div>
          {tab.output}
        </div>
      </div>
    </div>
  );
}
