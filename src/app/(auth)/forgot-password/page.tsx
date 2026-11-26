import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="Enter your email and we'll send you a reset link." footer={<Link href="/login" className="text-fg hover:underline">Back to log in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
