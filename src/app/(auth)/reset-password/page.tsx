import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "./reset-form";
import { getSessionUser } from "@/lib/workspace";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  if (isSupabaseConfigured) {
    const user = await getSessionUser();
    if (!user) redirect("/forgot-password");
  }
  return (
    <AuthCard title="Choose a new password">
      <ResetForm />
    </AuthCard>
  );
}
