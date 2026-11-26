import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your LTR Growth workspace."
      footer={<>New to LTR Growth? <Link href={`/signup${sp.next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-fg hover:underline">Create a free account</Link></>}
    >
      <LoginForm next={next} googleEnabled={publicEnv.googleAuthEnabled} initialError={sp.error} />
    </AuthCard>
  );
}
