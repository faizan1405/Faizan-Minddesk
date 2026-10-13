// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BETTER_AUTH_SESSION_COOKIES,
  isGuestOnlyAuthPath,
  isProtectedWorkspacePath,
  RECOVERY_TOKEN_COOKIE,
  updateSessionAndGuardRoutes,
} from "@/lib/auth/middleware";

describe("T2.2 — Route Protection & Better Auth Session Middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "mysql://minddesk:password@127.0.0.1:3306/minddesk",
      BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long-12345",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accurately classifies protected workspace routes and guest-only auth routes", () => {
    expect(isProtectedWorkspacePath("/dashboard")).toBe(true);
    expect(isProtectedWorkspacePath("/tasks")).toBe(true);
    expect(isProtectedWorkspacePath("/notes/123")).toBe(true);
    expect(isProtectedWorkspacePath("/mind-maps/abc")).toBe(true);
    expect(isProtectedWorkspacePath("/projects")).toBe(true);
    expect(isProtectedWorkspacePath("/settings")).toBe(true);
    expect(isProtectedWorkspacePath("/calendar")).toBe(true);
    expect(isProtectedWorkspacePath("/plan-your-day")).toBe(true);
    expect(isProtectedWorkspacePath("/habits")).toBe(true);
    expect(isProtectedWorkspacePath("/notifications")).toBe(true);
    expect(isProtectedWorkspacePath("/login")).toBe(false);

    expect(isGuestOnlyAuthPath("/login")).toBe(true);
    expect(isGuestOnlyAuthPath("/signup")).toBe(true);
    expect(isGuestOnlyAuthPath("/forgot-password")).toBe(true);
    expect(isGuestOnlyAuthPath("/update-password")).toBe(false);
  });

  it("redirects unauthenticated visitors from protected routes to /login with safe next param", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/notes?filter=pinned")
    );
    const res = await updateSessionAndGuardRoutes(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe(
      "http://localhost:3000/login?next=%2Fnotes%3Ffilter%3Dpinned"
    );
  });

  it("redirects unauthenticated visitors from /update-password without a recovery token to /forgot-password", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/update-password")
    );
    const res = await updateSessionAndGuardRoutes(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=session_expired"
    );
  });

  it("allows visitors with a valid password recovery token or cookie to access /update-password", async () => {
    const queryTokenReq = new NextRequest(
      new URL("http://localhost:3000/update-password?token=valid-reset-token")
    );
    const queryRes = await updateSessionAndGuardRoutes(queryTokenReq);
    expect(queryRes.status).toBe(200);

    const cookieTokenReq = new NextRequest(
      new URL("http://localhost:3000/update-password"),
      {
        headers: {
          cookie: `${RECOVERY_TOKEN_COOKIE}=valid-cookie-token`,
        },
      }
    );
    const cookieRes = await updateSessionAndGuardRoutes(cookieTokenReq);
    expect(cookieRes.status).toBe(200);
  });

  it("redirects authenticated users away from /login and /signup to safe next or /dashboard", async () => {
    const sessionCookieHeader = `${BETTER_AUTH_SESSION_COOKIES[0]}=session-token-123`;

    const loginReq = new NextRequest(
      new URL("http://localhost:3000/login?next=%2Fmind-maps"),
      {
        headers: { cookie: sessionCookieHeader },
      }
    );
    const loginRes = await updateSessionAndGuardRoutes(loginReq);
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toBe(
      "http://localhost:3000/mind-maps"
    );

    // Malicious open-redirect in ?next= is neutralized to /dashboard
    const unsafeReq = new NextRequest(
      new URL("http://localhost:3000/login?next=https://evil.example.com"),
      {
        headers: { cookie: sessionCookieHeader },
      }
    );
    const unsafeRes = await updateSessionAndGuardRoutes(unsafeReq);
    expect(unsafeRes.status).toBe(307);
    expect(unsafeRes.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("allows authenticated users to access protected workspace routes", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/dashboard"), {
      headers: {
        cookie: `${BETTER_AUTH_SESSION_COOKIES[0]}=session-token-123`,
      },
    });
    const res = await updateSessionAndGuardRoutes(req);

    expect(res.status).toBe(200);
  });
});
