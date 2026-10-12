import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getVerifiedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password recovery link for your MindDesk account.",
};

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const user = await getVerifiedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email address associated with your account and we'll send you a secure recovery link."
      footer={
        <span>
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Back to Sign in
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm
        initialError={params.error}
        supabaseConfigured={isSupabaseConfigured()}
      />
    </AuthShell>
  );
}
