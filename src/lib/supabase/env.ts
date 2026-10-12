export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
  appUrl: string;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return false;
  }

  // Reject placeholder values from template files
  if (
    url.includes("your-project-id") ||
    anonKey === "your-anon-key" ||
    !url.startsWith("http")
  ) {
    return false;
  }

  return true;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  return { url, anonKey, appUrl };
}

/**
 * Sanitizes a post-login return path to prevent open-redirect vulnerabilities.
 * Only allows internal relative paths starting with a single '/'.
 */
export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!rawPath || typeof rawPath !== "string") {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // Must start with '/' and must not start with '//' or '/\' or contain protocol schemes
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }

  // Avoid redirecting back into guest-only auth pages
  if (
    trimmed.startsWith("/login") ||
    trimmed.startsWith("/signup") ||
    trimmed.startsWith("/forgot-password")
  ) {
    return fallback;
  }

  return trimmed;
}
