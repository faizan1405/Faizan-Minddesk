import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, PATCH } from "../profile/route";
import * as serverAuth from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/auth/server", () => ({
  getVerifiedUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "test-session-token" }),
  }),
}));

vi.mock("@/lib/auth/env", () => ({
  isDatabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Settings Profile API (/api/settings/profile)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/profile", () => {
    it("returns 401 Unauthorized when session is missing", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Authentication required/i);
    });

    it("returns 200 and loads profile, sessions, and preferences for authenticated user", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-456",
        email: "alex@example.com",
        fullName: "Alex Rivera",
        avatarUrl: "https://example.com/alex.jpg",
        defaultWorkspaceId: "ws-456",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-456",
        name: "Alex Rivera",
        email: "alex@example.com",
        emailVerified: true,
        image: "https://example.com/alex.jpg",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        sessions: [
          {
            id: "session-1",
            token: "test-session-token",
            createdAt: new Date("2026-01-15T10:00:00Z"),
            expiresAt: new Date("2026-02-15T10:00:00Z"),
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            ipAddress: "127.0.0.1",
          },
        ],
        accounts: [{ providerId: "credential" }],
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        fullName: "Alex Rivera",
        avatarUrl: "https://example.com/alex.jpg",
        defaultWorkspaceId: "ws-456",
        preferences: {
          appearance: { theme: "dark" },
          productivity: { timeFormat: "24h" },
        },
        defaultWorkspace: {
          name: "Alex's Studio",
        },
      } as unknown as Awaited<ReturnType<typeof prisma.profile.findUnique>>);

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.user.id).toBe("user-456");
      expect(json.user.email).toBe("alex@example.com");
      expect(json.user.fullName).toBe("Alex Rivera");
      expect(json.user.workspaceName).toBe("Alex's Studio");
      expect(json.user.emailVerified).toBe(true);
      expect(json.user.preferences.appearance.theme).toBe("dark");
      expect(json.user.preferences.productivity.timeFormat).toBe("24h");
      expect(json.sessions).toHaveLength(1);
      expect(json.sessions[0].isCurrent).toBe(true);
      expect(json.syncInfo.isConfigured).toBe(true);
    });
  });

  describe("PATCH /api/settings/profile", () => {
    it("returns 401 when updating without authentication", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "New Name" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it("rejects invalid inputs with 400 Bad Request", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-456",
        email: "alex@example.com",
        fullName: "Alex Rivera",
        defaultWorkspaceId: "ws-456",
      });

      // Invalid avatar URL
      const req = new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: "not-a-valid-url" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
      expect(json.fieldErrors.avatarUrl).toBeDefined();
    });

    it("updates both User and Profile transactionally for authenticated user", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-456",
        email: "alex@example.com",
        fullName: "Alex Rivera",
        defaultWorkspaceId: "ws-456",
      });

      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        fullName: "Alex Rivera",
        avatarUrl: null,
        preferences: {},
      } as unknown as Awaited<ReturnType<typeof prisma.profile.findUnique>>);

      const req = new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Alexandra Rivera",
          avatarUrl: "https://example.com/avatar.png",
          preferences: {
            appearance: { theme: "dark" },
            productivity: { defaultCalendarView: "agenda" },
          },
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.profile.fullName).toBe("Alexandra Rivera");
      expect(json.profile.avatarUrl).toBe("https://example.com/avatar.png");
      expect(json.profile.preferences.appearance.theme).toBe("dark");
      expect(json.profile.preferences.productivity.defaultCalendarView).toBe("agenda");

      // Verify strict user ownership: updates only target user-456
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
          data: expect.objectContaining({
            name: "Alexandra Rivera",
            image: "https://example.com/avatar.png",
          }),
        })
      );

      expect(prisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
          data: expect.objectContaining({
            fullName: "Alexandra Rivera",
            avatarUrl: "https://example.com/avatar.png",
          }),
        })
      );
    });
  });
});
