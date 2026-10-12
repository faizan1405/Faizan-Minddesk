import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import type { AuthUserSummary } from "@/types/domain";
import {
  getSupabasePublicEnv,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Creates a request-scoped Supabase server client for Next.js 15 App Router
 * using asynchronous `await cookies()`.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where setting cookies is a no-op
          // because middleware refreshes the session cookie on the response.
        }
      },
    },
  });
}

/**
 * Verifies the current authenticated user against Supabase Auth (`getUser()`,
 * never trusting unverified `getSession()` cookies) and resolves their profile.
 */
export async function getVerifiedUser(): Promise<AuthUserSummary | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, default_workspace_id")
      .eq("id", user.id)
      .maybeSingle();

    const profile = profileData as {
      full_name: string;
      avatar_url: string | null;
      default_workspace_id: string | null;
    } | null;

    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "MindDesk User";

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name || fallbackName,
      avatarUrl: profile?.avatar_url ?? null,
      defaultWorkspaceId: profile?.default_workspace_id ?? null,
    };
  } catch {
    return null;
  }
}
