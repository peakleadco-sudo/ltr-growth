import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | LTR Growth Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><Logo href="/admin" /><span className="rounded-sm border border-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">Admin</span></div>
          <Link href="/app" className="text-sm text-muted hover:text-fg">Back to app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
