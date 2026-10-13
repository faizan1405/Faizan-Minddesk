import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, sanitizeRedirectPath } from "@/lib/auth/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/notes",
  "/mind-maps",
  "/maps",
  "/projects",
  "/favorites",
  "/recent",
  "/search",
  "/settings",
  "/calendar",
  "/plan-your-day",
  "/habits",
  "/notifications",
];

const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

export const BETTER_AUTH_SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

export const RECOVERY_TOKEN_COOKIE = "minddesk_recovery_token";

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

export function hasSessionCookie(request: NextRequest): boolean {
  return BETTER_AUTH_SESSION_COOKIES.some((cookieName) => {
    const val = request.cookies.get(cookieName)?.value?.trim();
    return Boolean(val && val.length > 0);
  });
}

export function hasRecoveryToken(request: NextRequest): boolean {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const cookieToken = request.cookies.get(RECOVERY_TOKEN_COOKIE)?.value?.trim();
  return Boolean(queryToken || cookieToken);
}

export interface RouteGuardOptions {
  resolveIsAuthenticated?: (request: NextRequest) => Promise<boolean> | boolean;
}

/**
 * First-line navigation guard for Next.js middleware.
 *
 * IMPORTANT: Middleware alone is NEVER relied upon for data authorization.
 * Every Server Component layout (`src/app/(workspace)/layout.tsx`), Server Action,
 * and API endpoint independently verifies the session against MySQL via
 * `getVerifiedUser()` / `requireAuthenticatedUser()` and enforces workspace
 * permissions via `createScopedRepository()`.
 */
export async function updateSessionAndGuardRoutes(
  request: NextRequest,
  options?: RouteGuardOptions
): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  const response = NextResponse.next({
    request,
  });

  if (!isAuthConfigured()) {
    return response;
  }

  const isAuthenticated = options?.resolveIsAuthenticated
    ? await options.resolveIsAuthenticated(request)
    : hasSessionCookie(request);

  // 1. Unauthenticated visitor attempting to access a protected workspace route
  if (!isAuthenticated && isProtectedWorkspacePath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      sanitizeRedirectPath(`${pathname}${search}`)
    );
    return NextResponse.redirect(loginUrl);
  }

  // 2. Unauthenticated visitor attempting to access /update-password without a session or recovery token
  if (
    !isAuthenticated &&
    !hasRecoveryToken(request) &&
    pathname.startsWith("/update-password")
  ) {
    const forgotUrl = new URL("/forgot-password", request.url);
    forgotUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(forgotUrl);
  }

  // 3. Authenticated user visiting /login, /signup, or /forgot-password
  if (isAuthenticated && isGuestOnlyAuthPath(pathname)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const targetPath = sanitizeRedirectPath(nextParam, "/dashboard");
    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
