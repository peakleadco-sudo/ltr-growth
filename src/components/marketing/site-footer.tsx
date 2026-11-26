import Link from "next/link";
import { Logo } from "./logo";
import { SOLUTIONS } from "@/content/solutions";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">Smarter marketing. Stronger businesses.</p>
          <p className="mt-2 text-xs text-subtle">LTR Growth is powered by LTRMarketing.</p>
        </div>
        <FooterCol title="Platform" links={[
          { href: "/#platform", label: "Features" },
          { href: "/pricing", label: "Pricing" },
          { href: "/free-audit", label: "Free marketing audit" },
          { href: "/signup", label: "Create an account" },
          { href: "/login", label: "Log in" },
        ]} />
        <FooterCol title="Solutions" links={SOLUTIONS.slice(0, 6).map((s) => ({ href: `/solutions/${s.slug}`, label: s.navLabel.charAt(0).toUpperCase() + s.navLabel.slice(1) }))} />
        <FooterCol title="Company" links={[
          { href: "/agency", label: "Work with LTRMarketing" },
          { href: "/agency#consultation", label: "Book a free consultation" },
          { href: "/privacy", label: "Privacy policy" },
          { href: "/terms", label: "Terms of service" },
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} LTRMarketing. All rights reserved.</p>
          <p>AI-generated recommendations are not guarantees of results.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
