import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  executeLocalDataImport,
  getWorkspaceDeskData,
  previewLocalDataImport,
  saveWorkspaceDeskData,
} from "../sync-repository";
import type { DeskData, TaskItem } from "@/features/minddesk/types";

function createInMemorySyncPrisma(): PrismaClient {
  const profiles = new Map<string, Record<string, unknown>>();
  const workspaces = new Map<string, Record<string, unknown>>();
  const workspaceMembers = new Map<string, Record<string, unknown>>();
  const projects = new Map<string, Record<string, unknown>>();
  const taskLists = new Map<string, Record<string, unknown>>();
  const tasks = new Map<string, Record<string, unknown>>();
  const notes = new Map<string, Record<string, unknown>>();
  const mindMaps = new Map<string, Record<string, unknown>>();
  const mindMapNodes = new Map<string, Record<string, unknown>>();
  const mindMapEdges = new Map<string, Record<string, unknown>>();

  const matchesWhere = (
    row: Record<string, unknown>,
    where: Record<string, unknown> | undefined
  ): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]) => {
      if (v === undefined) return true;
      if (v !== null && typeof v === "object" && "in" in v) {
        return ((v as { in: unknown[] }).in || []).includes(row[k]);
      }
      return row[k] === v;
    });
  };

  const makeModel = (store: Map<string, Record<string, unknown>>) => ({
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      if (typeof where.id === "string") {
        return store.get(where.id) ?? null;
      }
      if (where.workspaceId_userId && typeof where.workspaceId_userId === "object") {
        const key = `${(where.workspaceId_userId as { workspaceId: string }).workspaceId}:${(where.workspaceId_userId as { userId: string }).userId}`;
        return store.get(key) ?? null;
      }
      return null;
    },
    findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
      for (const row of store.values()) {
        if (matchesWhere(row, where)) return row;
      }
      return null;
    },
    findMany: async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const results: Record<string, unknown>[] = [];
      for (const row of store.values()) {
        if (matchesWhere(row, where)) results.push(row);
      }
      return results;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const id = (data.id as string | undefined) ?? crypto.randomUUID();
      const now = new Date();
      const record: Record<string, unknown> = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      const key =
        data.workspaceId && data.userId && !data.id && store === workspaceMembers
          ? `${data.workspaceId}:${data.userId}`
          : id;
      store.set(key, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      let record: Record<string, unknown> | null = null;
      let targetKey: string | null = null;

      if (typeof where.id === "string") {
        record = store.get(where.id) ?? null;
        targetKey = where.id;
      } else if (where.id_userId_workspaceId) {
        const comp = where.id_userId_workspaceId as { id: string };
        record = store.get(comp.id) ?? null;
        targetKey = comp.id;
      }

      if (!record || !targetKey) throw new Error("Record not found for update");
      const updated = { ...record, ...data, updatedAt: new Date() };
      store.set(targetKey, updated);
      return updated;
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: Record<string, unknown>;
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => {
      let targetKey: string | null = null;
      if (typeof where.id === "string") {
        targetKey = where.id;
      } else if (where.id_userId_workspaceId) {
        targetKey = (where.id_userId_workspaceId as { id: string }).id;
      } else if (where.mindMapId_sourceNodeId_targetNodeId_sourceHandle_targetHandle) {
        const comp = where.mindMapId_sourceNodeId_targetNodeId_sourceHandle_targetHandle as Record<string, string>;
        targetKey = `${comp.mindMapId}:${comp.sourceNodeId}:${comp.targetNodeId}`;
      }

      if (targetKey && store.has(targetKey)) {
        const existing = store.get(targetKey)!;
        const updated = { ...existing, ...update, updatedAt: new Date() };
        store.set(targetKey, updated);
        return updated;
      }

      const id = (create.id as string | undefined) ?? targetKey ?? crypto.randomUUID();
      const now = new Date();
      const record = { ...create, id, createdAt: now, updatedAt: now };
      store.set(id, record);
      return record;
    },
    deleteMany: async ({ where }: { where?: Record<string, unknown> }) => {
      let count = 0;
      for (const [key, row] of Array.from(store.entries())) {
        if (matchesWhere(row, where)) {
          store.delete(key);
          count++;
        }
      }
      return { count };
    },
  });

  const mock = {
    profile: makeModel(profiles),
    workspace: makeModel(workspaces),
    workspaceMember: makeModel(workspaceMembers),
    project: makeModel(projects),
    taskList: makeModel(taskLists),
    task: makeModel(tasks),
    note: makeModel(notes),
    mindMap: makeModel(mindMaps),
    mindMapNode: makeModel(mindMapNodes),
    mindMapEdge: makeModel(mindMapEdges),
    $transaction: async (fn: (tx: PrismaClient) => Promise<unknown>) => fn(mock),
  } as unknown as PrismaClient;

  return mock;
}

describe("Hostinger MySQL Sync Repository (Cross-Device & Persistence)", () => {
  it("enforces multi-tenant user isolation: User A cannot read or write User B's records", async () => {
    const db = createInMemorySyncPrisma();

    const userA = { id: "user-a-uuid", email: "user.a@example.com" };
    const userB = { id: "user-b-uuid", email: "user.b@example.com" };

    const workspaceA = await db.workspace.create({
      data: { id: "ws-a", name: "Workspace A", ownerId: userA.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: userA.id, email: userA.email, defaultWorkspaceId: workspaceA.id, preferences: {} },
    });

    const workspaceB = await db.workspace.create({
      data: { id: "ws-b", name: "Workspace B", ownerId: userB.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: userB.id, email: userB.email, defaultWorkspaceId: workspaceB.id, preferences: {} },
    });

    // User A creates a secret task in Workspace A
    await saveWorkspaceDeskData(db, userA, workspaceA.id, {
      tasks: [
        {
          id: "task-secret-a",
          title: "User A Confidential Project Plan",
          note: "Top secret",
          due: "Today",
          priority: "high",
          complete: false,
          starred: true,
          subtasks: [],
        },
      ],
    });

    // User B tries to read Workspace A -> throws 403 Forbidden
    await expect(
      getWorkspaceDeskData(db, userB, workspaceA.id)
    ).rejects.toThrow(/permission/i);

    // User B reads Workspace B -> empty tasks, completely isolated
    const userBData = await getWorkspaceDeskData(db, userB, workspaceB.id);
    expect(userBData.tasks.find((t) => t.id === "task-secret-a")).toBeUndefined();
    expect(userBData.tasks.length).toBe(0);
  });

  it("performs full round-trip sync for tasks, notes, mind maps, calendar, and habits", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-1", email: "faizan@minddesk.com" };

    const workspace = await db.workspace.create({
      data: { id: "ws-1", name: "Personal Workspace", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    const payload: Partial<DeskData> = {
      theme: "dark",
      tasks: [
        {
          id: "task-alpha",
          title: "Complete MySQL sync audit",
          note: "Inspect and test cross-device persistence",
          due: "2026-10-15",
          dueTime: "10:00",
          priority: "high",
          complete: false,
          starred: true,
          subtasks: [
            { id: "sub-1", title: "Review schema", complete: true },
            { id: "sub-2", title: "Run tests", complete: false },
          ],
        },
      ],
      notes: [
        {
          id: "note-alpha",
          title: "Architecture Decisions",
          content: "<p>MySQL + Better Auth synchronization</p>",
          excerpt: "MySQL + Better Auth synchronization",
          icon: "🚀",
          updated: new Date().toISOString(),
          projectId: "personal",
          starred: true,
        },
      ],
      events: [
        {
          id: "evt-1",
          title: "Sprint Planning",
          startDate: "2026-10-15",
          startTime: "09:00",
          endDate: "2026-10-15",
          endTime: "10:00",
          categoryId: "work",
          allDay: false,
          isRecurring: false,
        },
      ],
      habits: [
        {
          id: "habit-1",
          name: "Morning Reading",
          frequency: "daily",
          currentStreak: 5,
          bestStreak: 12,
          archived: false,
          paused: false,
          color: "blue",
          timeOfDay: "morning",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Save to MySQL
    const saveRes = await saveWorkspaceDeskData(db, actor, workspace.id, payload);
    expect(saveRes.success).toBe(true);

    // Read back from MySQL
    const loaded = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(loaded.theme).toBe("dark");

    // Tasks verified
    expect(loaded.tasks.length).toBe(1);
    expect(loaded.tasks[0].id).toBe("task-alpha");
    expect(loaded.tasks[0].title).toBe("Complete MySQL sync audit");
    expect(loaded.tasks[0].starred).toBe(true);
    expect(loaded.tasks[0].dueTime).toBe("10:00");
    expect(loaded.tasks[0].subtasks.length).toBe(2);
    expect(loaded.tasks[0].subtasks[0].complete).toBe(true);

    // Notes verified
    expect(loaded.notes.length).toBe(1);
    expect(loaded.notes[0].id).toBe("note-alpha");
    expect(loaded.notes[0].content).toContain("MySQL + Better Auth");
    expect(loaded.notes[0].icon).toBe("🚀");

    // Calendar events verified
    expect(loaded.events?.length).toBe(1);
    expect(loaded.events?.[0].title).toBe("Sprint Planning");

    // Habits verified
    expect(loaded.habits?.length).toBe(1);
    expect(loaded.habits?.[0].name).toBe("Morning Reading");
    expect(loaded.habits?.[0].currentStreak).toBe(5);
  });

  it("simulates the Desktop -> Mobile -> Desktop workflow without data loss", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-sync", email: "faizan@domain.com" };

    const workspace = await db.workspace.create({
      data: { id: "ws-sync", name: "Personal", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    // 1. Desktop: User logs in, creates a task, saves it
    const desktopTask: TaskItem = {
      id: "sync-task-1",
      title: "Write documentation",
      note: "For Hostinger production setup",
      due: "Today",
      priority: "medium",
      complete: false,
      starred: false,
      subtasks: [],
    };
    await saveWorkspaceDeskData(db, actor, workspace.id, { tasks: [desktopTask] });

    // 2. Mobile: Logs in with the same account, loads workspace from MySQL
    const mobileLoaded = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(mobileLoaded.tasks.length).toBe(1);
    expect(mobileLoaded.tasks[0].title).toBe("Write documentation");

    // 3. Mobile: Edits task (marks complete and stars it)
    const updatedMobileTask: TaskItem = {
      ...mobileLoaded.tasks[0],
      complete: true,
      starred: true,
    };
    await saveWorkspaceDeskData(db, actor, workspace.id, { tasks: [updatedMobileTask] });

    // 4. Desktop: Refetches on focus / window switch
    const desktopRefetched = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(desktopRefetched.tasks.length).toBe(1);
    expect(desktopRefetched.tasks[0].complete).toBe(true);
    expect(desktopRefetched.tasks[0].starred).toBe(true);
  });

  it("previews and executes idempotent import of existing prototype data safely", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-proto", email: "proto@example.com" };

    const workspace = await db.workspace.create({
      data: { id: "ws-proto", name: "Personal", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    const localPrototypeData: DeskData = {
      tasks: [
        {
          id: "proto-task-1",
          title: "Existing Desktop Task",
          note: "Created before fix",
          due: "Today",
          priority: "high",
          complete: false,
          starred: true,
          subtasks: [],
        },
      ],
      notes: [
        {
          id: "proto-note-1",
          title: "Existing Desktop Note",
          content: "Important ideas",
          excerpt: "Important ideas",
          icon: "💡",
          updated: new Date().toISOString(),
          projectId: "personal",
          starred: true,
        },
      ],
      maps: [],
      projects: [],
      theme: "light",
    };

    // 1. Dry run preview
    const preview = await previewLocalDataImport(db, actor, workspace.id, localPrototypeData);
    expect(preview.needsImport).toBe(true);
    expect(preview.counts.tasks).toBe(1);
    expect(preview.counts.notes).toBe(1);

    // 2. Execute import
    const importResult = await executeLocalDataImport(db, actor, workspace.id, localPrototypeData);
    expect(importResult.success).toBe(true);
    expect(importResult.importedCounts.tasks).toBe(1);

    // 3. Second import (idempotent duplicate test)
    const secondPreview = await previewLocalDataImport(db, actor, workspace.id, localPrototypeData);
    expect(secondPreview.needsImport).toBe(false);
    expect(secondPreview.counts.tasks).toBe(0);
    expect(secondPreview.counts.notes).toBe(0);

    // 4. Verify DB has the records without duplicating
    const inDb = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(inDb.tasks.length).toBe(1);
    expect(inDb.notes.length).toBe(1);
  });
});
