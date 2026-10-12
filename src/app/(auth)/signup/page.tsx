import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { isAuthConfigured, sanitizeRedirectPath } from "@/lib/auth/env";
import { getVerifiedUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your personal MindDesk workspace.",
};

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params.next, "/dashboard");
  const user = await getVerifiedUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <AuthShell
      title="Create your space"
      subtitle="Start organizing tasks, rich notes, and visual mind maps in one calm place."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href={
              nextPath !== "/dashboard"
                ? `/login?next=${encodeURIComponent(nextPath)}`
                : "/login"
            }
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm nextPath={nextPath} authConfigured={isAuthConfigured()} />
    </AuthShell>
  );
}
