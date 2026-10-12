import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getVerifiedUser } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getVerifiedUser();

  // Server-side defense-in-depth: verify identity before rendering workspace routes
  if (isSupabaseConfigured() && !user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
