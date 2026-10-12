import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export const metadata: Metadata = {
  title: "Update password",
  description: "Set a new password for your MindDesk account.",
};

interface UpdatePasswordPageProps {
  searchParams?: Promise<{ token?: string }>;
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong, unique password to secure your MindDesk workspace."
      footer={
        <span>
          Need a new recovery link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-primary hover:underline"
          >
            Request reset email
          </Link>
        </span>
      }
    >
      <UpdatePasswordForm recoveryToken={params?.token} />
    </AuthShell>
  );
}
