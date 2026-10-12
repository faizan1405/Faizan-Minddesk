import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isAuthConfigured } from "@/lib/auth/env";
import { getVerifiedUser } from "@/lib/auth/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getVerifiedUser();

  // Server-side defense-in-depth: verify identity against MySQL session before rendering workspace routes
  if (isAuthConfigured() && !user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
