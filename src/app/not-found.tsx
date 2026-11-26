import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-sm text-muted">The link may be broken, or the page may have moved.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild><Link href="/">Go home</Link></Button>
        <Button asChild variant="secondary"><Link href="/app">Open dashboard</Link></Button>
      </div>
    </div>
  );
}
