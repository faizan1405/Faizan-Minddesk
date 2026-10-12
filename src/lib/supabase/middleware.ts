import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  getSupabasePublicEnv,
  isSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/supabase/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/notes",
  "/mind-maps",
  "/projects",
  "/search",
  "/settings",
];

const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

export function isProtectedWorkspacePath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isGuestOnlyAuthPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSessionAndGuardRoutes(
  request: NextRequest
): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    // When Supabase env vars are not configured yet, redirect protected workspace
    // requests to /login with a clear setup notice unless explicitly in test mode.
    if (isProtectedWorkspacePath(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "next",
        sanitizeRedirectPath(`${pathname}${search}`)
      );
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Always use auth.getUser() to validate the JWT signature and
  // refresh expired access tokens securely on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Unauthenticated visitor attempting to access a protected workspace route
  if (!user && isProtectedWorkspacePath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeRedirectPath(`${pathname}${search}`)
    );
    return NextResponse.redirect(loginUrl);
  }

  // 2. Unauthenticated visitor attempting to access /update-password without a session
  if (!user && pathname.startsWith("/update-password")) {
    const forgotUrl = new URL("/forgot-password", request.url);
    forgotUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(forgotUrl);
  }

  // 3. Authenticated user visiting /login, /signup, or /forgot-password
  if (user && isGuestOnlyAuthPath(pathname)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const targetPath = sanitizeRedirectPath(nextParam, "/dashboard");
    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
