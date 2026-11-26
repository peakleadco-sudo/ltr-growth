import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/" className="text-sm text-muted hover:text-fg">Back to site</Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-[420px] animate-slide-up">{children}</div>
      </main>
    </div>
  );
}
