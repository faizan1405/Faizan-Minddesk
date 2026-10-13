import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getSync, POST as postSync } from "../sync/route";
import { POST as postImport } from "../import/route";
import * as serverAuth from "@/lib/auth/server";
import * as syncRepo from "@/lib/sync/sync-repository";
import { initialDeskData } from "@/features/minddesk/seed";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/server", () => ({
  getVerifiedUser: vi.fn(),
}));

vi.mock("@/lib/auth/provisioning", () => ({
  ensureUserWorkspaceProvisioned: vi.fn().mockResolvedValue({
    profileId: "user-123",
    defaultWorkspaceId: "ws-123",
    fullName: "Faizan",
    avatarUrl: null,
  }),
}));

vi.mock("@/lib/sync/sync-repository", () => ({
  getWorkspaceDeskData: vi.fn(),
  saveWorkspaceDeskData: vi.fn(),
  previewLocalDataImport: vi.fn(),
  executeLocalDataImport: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

describe("MindDesk Cloud Sync API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/minddesk/sync", () => {
    it("returns 401 Unauthorized when no verified user session exists", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue(null);

      const res = await getSync();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Authentication required/i);
    });

    it("returns 200 and loads workspace data when authenticated", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-123",
        email: "faizan@example.com",
        fullName: "Faizan",
        defaultWorkspaceId: "ws-123",
      });

      vi.mocked(syncRepo.getWorkspaceDeskData).mockResolvedValue(initialDeskData);

      const res = await getSync();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.workspaceId).toBe("ws-123");
      expect(json.userId).toBe("user-123");
      expect(json.data.tasks).toBeDefined();
    });
  });

  describe("POST /api/minddesk/sync", () => {
    it("returns 401 Unauthorized when saving without an authenticated session", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/minddesk/sync", {
        method: "POST",
        body: JSON.stringify({ data: { tasks: [] } }),
      });

      const res = await postSync(req);
      expect(res.status).toBe(401);
    });

    it("saves workspace updates to MySQL when authenticated", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-123",
        email: "faizan@example.com",
        fullName: "Faizan",
        defaultWorkspaceId: "ws-123",
      });

      vi.mocked(syncRepo.saveWorkspaceDeskData).mockResolvedValue({
        success: true,
        updatedAt: "2026-10-13T10:00:00.000Z",
      });

      const req = new NextRequest("http://localhost:3000/api/minddesk/sync", {
        method: "POST",
        body: JSON.stringify({ data: { tasks: [] } }),
      });

      const res = await postSync(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.updatedAt).toBeDefined();
    });
  });

  describe("POST /api/minddesk/import", () => {
    it("returns 401 Unauthorized when unauthenticated", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/minddesk/import", {
        method: "POST",
        body: JSON.stringify({ localData: initialDeskData }),
      });

      const res = await postImport(req);
      expect(res.status).toBe(401);
    });

    it("previews import counts on dryRun without altering database", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-123",
        email: "faizan@example.com",
        fullName: "Faizan",
        defaultWorkspaceId: "ws-123",
      });

      vi.mocked(syncRepo.previewLocalDataImport).mockResolvedValue({
        needsImport: true,
        counts: {
          tasks: 5,
          notes: 2,
          maps: 1,
          projects: 3,
          events: 4,
          habits: 2,
          routines: 1,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/minddesk/import", {
        method: "POST",
        body: JSON.stringify({ localData: initialDeskData, dryRun: true }),
      });

      const res = await postImport(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.dryRun).toBe(true);
      expect(json.needsImport).toBe(true);
      expect(json.preview.tasks).toBe(5);
    });

    it("executes safe idempotent import when dryRun is false", async () => {
      vi.mocked(serverAuth.getVerifiedUser).mockResolvedValue({
        id: "user-123",
        email: "faizan@example.com",
        fullName: "Faizan",
        defaultWorkspaceId: "ws-123",
      });

      vi.mocked(syncRepo.executeLocalDataImport).mockResolvedValue({
        success: true,
        importedCounts: { tasks: 5, notes: 2 },
      });

      const req = new NextRequest("http://localhost:3000/api/minddesk/import", {
        method: "POST",
        body: JSON.stringify({ localData: initialDeskData, dryRun: false }),
      });

      const res = await postImport(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.dryRun).toBe(false);
      expect(json.importedCounts.tasks).toBe(5);
    });
  });
});
