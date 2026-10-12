// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isGuestOnlyAuthPath,
  isProtectedWorkspacePath,
  updateSessionAndGuardRoutes,
} from "@/lib/supabase/middleware";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

describe("T2.2 — Route Protection & Session Refresh Middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    };
    mockGetUser.mockReset();
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
    expect(isProtectedWorkspacePath("/login")).toBe(false);

    expect(isGuestOnlyAuthPath("/login")).toBe(true);
    expect(isGuestOnlyAuthPath("/signup")).toBe(true);
    expect(isGuestOnlyAuthPath("/forgot-password")).toBe(true);
    expect(isGuestOnlyAuthPath("/update-password")).toBe(false);
  });

  it("redirects unauthenticated visitors from protected routes to /login with safe next param", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

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

  it("redirects unauthenticated visitors from /update-password to /forgot-password", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new NextRequest(
      new URL("http://localhost:3000/update-password")
    );
    const res = await updateSessionAndGuardRoutes(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=session_expired"
    );
  });

  it("redirects authenticated users away from /login and /signup to safe next or /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
      error: null,
    });

    const loginReq = new NextRequest(
      new URL("http://localhost:3000/login?next=%2Fmind-maps")
    );
    const loginRes = await updateSessionAndGuardRoutes(loginReq);
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toBe(
      "http://localhost:3000/mind-maps"
    );

    // Malicious open-redirect in ?next= is neutralized to /dashboard
    const unsafeReq = new NextRequest(
      new URL("http://localhost:3000/login?next=https://evil.example.com")
    );
    const unsafeRes = await updateSessionAndGuardRoutes(unsafeReq);
    expect(unsafeRes.status).toBe(307);
    expect(unsafeRes.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("allows authenticated users to access protected workspace routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
      error: null,
    });

    const req = new NextRequest(new URL("http://localhost:3000/dashboard"));
    const res = await updateSessionAndGuardRoutes(req);

    expect(res.status).toBe(200);
  });
});
