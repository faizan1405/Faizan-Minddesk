import { describe, expect, it, vi, beforeEach } from "vitest";
import { initialDeskData, initialTaskLists } from "@/features/minddesk/seed";
import { getInitialDefaultHabits, getInitialDefaultRoutines } from "@/features/habits/services/habit-defaults";
import { getInitialSeedData } from "@/features/calendar/services/calendar-defaults";
import { loadMindDeskStore, saveMindDeskStore } from "@/features/calendar/services/calendar-storage";
import { previewLocalDataImport } from "@/lib/sync/sync-repository";
import { previewUserProductivityCleanup } from "@/lib/sync/cleanup-repository";

describe("MindDesk Empty Workspace & Safe Hydration Guarantees", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Part 1: Pure Empty State Initialization", () => {
    it("initialDeskData has zero sample productivity items", () => {
      expect(initialDeskData.tasks).toHaveLength(0);
      expect(initialDeskData.notes).toHaveLength(0);
      expect(initialDeskData.projects).toHaveLength(0);
      expect(initialDeskData.maps).toHaveLength(0);
      expect(initialDeskData.habits).toHaveLength(0);
      expect(initialDeskData.routines).toHaveLength(0);
    });

    it("has exactly one functional default task list for user organization", () => {
      expect(initialTaskLists).toHaveLength(1);
      expect(initialTaskLists[0].id).toBe("list-my-tasks");
      expect(initialTaskLists[0].title).toBe("My Tasks");
    });

    it("initial default habits and routines return zero records", () => {
      expect(getInitialDefaultHabits()).toEqual([]);
      expect(getInitialDefaultRoutines()).toEqual([]);
    });

    it("calendar initial store contains zero events or sample time blocks", () => {
      const calSeed = getInitialSeedData();
      expect(calSeed.events).toEqual([]);
      expect(calSeed.scheduledBlocks).toEqual([]);
      expect(calSeed.tasks).toEqual([]);
      // Preserves essential system settings and categories
      expect(calSeed.settings).toBeDefined();
      expect(calSeed.settings.defaultView).toBe("month");
      expect(calSeed.categories.length).toBeGreaterThan(0);
    });
  });

  describe("Part 1 & 2: No Demo Data Regeneration", () => {
    it("does not resurrect demo items when reading an empty or new store", () => {
      const store = loadMindDeskStore();
      expect(store.tasks).toEqual([]);
      expect(store.events).toEqual([]);
      expect(store.habits).toEqual([]);
      expect(store.routines).toEqual([]);
    });

    it("persists empty arrays authoritatively without fallback to sample data", () => {
      saveMindDeskStore({
        tasks: [],
        events: [],
        notes: [],
        habits: [],
        routines: [],
      });

      const reloaded = loadMindDeskStore();
      expect(reloaded.tasks).toHaveLength(0);
      expect(reloaded.events).toHaveLength(0);
      expect(reloaded.notes).toHaveLength(0);
      expect(reloaded.habits).toHaveLength(0);
    });

    it("previewLocalDataImport filters out known demo/prototype items from server import", async () => {
      const mockActor = { id: "user-test", email: "test@example.com" };
      const mockDb = {
        workspaceMember: {
          findUnique: vi.fn().mockResolvedValue({
            workspaceId: "ws-1",
            userId: mockActor.id,
            role: "owner",
          }),
        },
        task: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        note: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        mindMap: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        project: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        profile: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Parameters<typeof previewLocalDataImport>[0];

      const prototypePayload = {
        theme: "light",
        version: 3,
        tasks: [
          { id: "task-1", title: "Complete Q3 Budget Review", completed: false },
          { id: "task-2", title: "Finalize Design System Components", completed: true },
          { id: "real-user-task-1", title: "Actual client meeting notes", completed: false },
        ],
        notes: [
          { id: "note-1", title: "Product Architecture Principles" },
          { id: "real-user-note-1", title: "Production Deploy Notes" },
        ],
        projects: [],
        maps: [],
        events: [],
        categories: [],
        exceptions: [],
        scheduledBlocks: [],
        dailyPlans: {},
      } as unknown as Parameters<typeof previewLocalDataImport>[3];

      const preview = await previewLocalDataImport(mockDb, mockActor, "ws-1", prototypePayload);
      // Demo items filtered out; only real user items remain
      expect(preview.counts.tasks).toBe(1);
      expect(preview.counts.notes).toBe(1);
      expect(preview.needsImport).toBe(true);
    });
  });

  describe("Part 2: Account-Scoped Cleanup Isolation", () => {
    it("previewUserProductivityCleanup safely counts target user data without modifying accounts or sessions", async () => {
      const mockActor = { id: "user-test-faizan", email: "faizan@minddesk.app" };
      const mockDb = {
        workspaceMember: {
          findUnique: vi.fn().mockResolvedValue({
            workspaceId: "ws-1",
            userId: mockActor.id,
            role: "owner",
          }),
        },
        task: { count: vi.fn().mockResolvedValue(5) },
        taskList: { count: vi.fn().mockResolvedValue(1) },
        note: { count: vi.fn().mockResolvedValue(3) },
        noteVersion: { count: vi.fn().mockResolvedValue(0) },
        project: { count: vi.fn().mockResolvedValue(2) },
        mindMap: { count: vi.fn().mockResolvedValue(1) },
        mindMapNode: { count: vi.fn().mockResolvedValue(0) },
        mindMapEdge: { count: vi.fn().mockResolvedValue(0) },
        profile: {
          findUnique: vi.fn().mockResolvedValue({
            id: mockActor.id,
            preferences: { habits: { habits: [1, 2] } },
          }),
        },
      } as unknown as Parameters<typeof previewUserProductivityCleanup>[0];

      const preview = await previewUserProductivityCleanup(mockDb, mockActor, "ws-1");

      expect(preview.targetUser.email).toBe("faizan@minddesk.app");
      expect(preview.targetUser.id).toBe("user-test-faizan");
      expect(preview.counts.tasks).toBe(5);
      expect(preview.counts.notes).toBe(3);
      expect(preview.counts.projects).toBe(2);
      expect(preview.counts.mindMaps).toBe(1);
      expect(preview.counts.habits).toBe(2);
      expect(preview.counts.totalRecords).toBe(14);
    });

    it("throws clear error when unauthenticated actor attempts cleanup", async () => {
      const mockDb = {} as unknown as Parameters<typeof previewUserProductivityCleanup>[0];

      await expect(
        previewUserProductivityCleanup(mockDb, null as unknown as Parameters<typeof previewUserProductivityCleanup>[1], "ws-1")
      ).rejects.toThrow(/Authentication required/i);
    });
  });
});
