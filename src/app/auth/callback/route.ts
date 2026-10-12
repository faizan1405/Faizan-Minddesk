import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAuthConfigured, sanitizeRedirectPath } from "@/lib/auth/env";
import { RECOVERY_TOKEN_COOKIE } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const type = searchParams.get("type")?.trim();
  const errorParam = searchParams.get("error")?.trim();
  const next = sanitizeRedirectPath(searchParams.get("next"), "/dashboard");

  if (!isAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=auth_not_configured", origin)
    );
  }

  if (errorParam) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", origin)
    );
  }

  // 1. Password recovery token flow -> store short-lived HttpOnly recovery token cookie and redirect to /update-password
  if (token && (type === "recovery" || next.startsWith("/update-password"))) {
    const targetUrl = new URL("/update-password", origin);
    targetUrl.searchParams.set("token", token);

    const response = NextResponse.redirect(targetUrl);
    response.cookies.set(RECOVERY_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });
    return response;
  }

  // 2. Email verification token flow -> verify via Better Auth server API
  if (token && (type === "verify" || type === "email" || !type)) {
    try {
      await auth.api.verifyEmail({
        query: {
          token,
        },
        headers: request.headers,
      });
      return NextResponse.redirect(new URL(next, origin));
    } catch {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin)
  );
}
