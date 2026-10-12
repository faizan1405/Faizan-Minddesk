import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { isAuthConfigured, sanitizeRedirectPath } from "@/lib/auth/env";
import { getVerifiedUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your MindDesk personal knowledge workspace.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params.next, "/dashboard");
  const user = await getVerifiedUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your tasks, notes, and mind maps."
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link
            href={
              nextPath !== "/dashboard"
                ? `/signup?next=${encodeURIComponent(nextPath)}`
                : "/signup"
            }
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <LoginForm
        nextPath={nextPath}
        initialError={params.error}
        authConfigured={isAuthConfigured()}
      />
    </AuthShell>
  );
}
