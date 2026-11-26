import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#FF2929" />
      <path d="M7 6v12h10" stroke="#fff" strokeWidth="2.6" strokeLinecap="square" fill="none" />
      <path d="M12 13l5-5M13.5 8H17v3.5" stroke="#fff" strokeWidth="2" strokeLinecap="square" fill="none" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="LTR Growth home">
      <LogoMark />
      {!compact && (
        <span className="text-[15px]">
          LTR <span className="text-muted">Growth</span>
        </span>
      )}
    </Link>
  );
}
