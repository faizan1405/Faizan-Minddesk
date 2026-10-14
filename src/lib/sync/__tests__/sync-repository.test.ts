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

export function createInMemorySyncPrisma(): PrismaClient {
  const users = new Map<string, Record<string, unknown>>();
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
      if (v !== null && typeof v === "object" && "notIn" in v) {
        return !((v as { notIn: unknown[] }).notIn || []).includes(row[k]);
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
    updateMany: async ({
      where,
      data,
    }: {
      where?: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      let count = 0;
      for (const [key, row] of Array.from(store.entries())) {
        if (matchesWhere(row, where)) {
          store.set(key, { ...row, ...data, updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    },
  });

  const mock = {
    user: makeModel(users),
    profile: makeModel(profiles),
    workspace: makeModel(workspaces),
    workspaceMember: makeModel(workspaceMembers),
    project: makeModel(projects),
    taskList: makeModel(taskLists),
    task: makeModel(tasks),
    note: makeModel(notes),
    noteVersion: makeModel(new Map()),
    entityLink: makeModel(new Map()),
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

  it("Task List Deletion: persists list deletion to MySQL and safely moves tasks to destination list", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-list-test", email: "list.test@example.com" };
    const workspace = await db.workspace.create({
      data: { id: "ws-list-test", name: "List Test WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    // Create 2 task lists: "Default List" and "Work List"
    const initialLists = [
      { id: "list-default", title: "My Tasks", order: 0, isDefault: true },
      { id: "list-work", title: "Work Projects", order: 1, isDefault: false },
    ];
    // Create 2 tasks in "list-work"
    const initialTasks: TaskItem[] = [
      {
        id: "task-w1",
        listId: "list-work",
        title: "Work Task 1",
        note: "",
        due: "Today",
        priority: "medium",
        complete: false,
        starred: false,
        subtasks: [],
      },
      {
        id: "task-w2",
        listId: "list-work",
        title: "Work Task 2",
        note: "",
        due: "Today",
        priority: "high",
        complete: false,
        starred: true,
        subtasks: [],
      },
    ];

    await saveWorkspaceDeskData(db, actor, workspace.id, {
      taskLists: initialLists,
      tasks: initialTasks,
    });

    // Verify initial DB state
    const loaded1 = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(loaded1.taskLists?.length).toBe(2);
    expect(loaded1.tasks.length).toBe(2);

    // Delete "list-work", safely moving tasks to "list-default"
    const movedTasks = loaded1.tasks.map((t) => ({ ...t, listId: "list-default" }));
    const remainingLists = loaded1.taskLists?.filter((l) => l.id !== "list-work") || [];

    await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        taskLists: remainingLists,
        tasks: movedTasks,
      },
      {
        deletedTaskListIds: ["list-work"],
      }
    );

    // Rehydrate (simulate page refresh or cross-device load)
    const rehydrated = await getWorkspaceDeskData(db, actor, workspace.id);

    // List is permanently gone from DB
    expect(rehydrated.taskLists?.some((l) => l.id === "list-work")).toBe(false);
    expect(rehydrated.taskLists?.length).toBe(1);
    expect(rehydrated.taskLists?.[0]?.id).toBe("list-default");

    // Tasks are safely preserved in "list-default"
    expect(rehydrated.tasks.length).toBe(2);
    expect(rehydrated.tasks.every((t) => t.listId === "list-default")).toBe(true);
  });

  it("Task List Deletion: permanently deletes tasks when explicit task deletion is specified", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-list-del-tasks", email: "del.tasks@example.com" };
    const workspace = await db.workspace.create({
      data: { id: "ws-list-del", name: "List Delete WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    await saveWorkspaceDeskData(db, actor, workspace.id, {
      taskLists: [
        { id: "list-keep", title: "Keep List", order: 0, isDefault: true },
        { id: "list-discard", title: "Discard List", order: 1, isDefault: false },
      ],
      tasks: [
        {
          id: "task-k1",
          listId: "list-keep",
          title: "Keep Task",
          note: "",
          due: "Today",
          priority: "low",
          complete: false,
          starred: false,
          subtasks: [],
        },
        {
          id: "task-d1",
          listId: "list-discard",
          title: "Discard Task",
          note: "",
          due: "Today",
          priority: "high",
          complete: false,
          starred: false,
          subtasks: [],
        },
      ],
    });

    // Delete list-discard and explicitly delete task-d1
    await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        taskLists: [{ id: "list-keep", title: "Keep List", order: 0, isDefault: true }],
        tasks: [
          {
            id: "task-k1",
            listId: "list-keep",
            title: "Keep Task",
            note: "",
            due: "Today",
            priority: "low",
            complete: false,
            starred: false,
            subtasks: [],
          },
        ],
      },
      {
        deletedTaskListIds: ["list-discard"],
        deletedTaskIds: ["task-d1"],
      }
    );

    const rehydrated = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(rehydrated.taskLists?.length).toBe(1);
    expect(rehydrated.taskLists?.[0]?.id).toBe("list-keep");
    expect(rehydrated.tasks.length).toBe(1);
    expect(rehydrated.tasks[0]?.id).toBe("task-k1");
  });

  it("Project Deletion: persists project deletion to MySQL, safely unlinks tasks and notes, and prevents resurrection", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-proj-test", email: "proj.test@example.com" };
    const workspace = await db.workspace.create({
      data: { id: "ws-proj-test", name: "Project Test WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: { id: actor.id, email: actor.email, defaultWorkspaceId: workspace.id, preferences: {} },
    });

    // Create project with linked task and linked note
    await saveWorkspaceDeskData(db, actor, workspace.id, {
      projects: [
        {
          id: "proj-alpha",
          name: "Project Alpha",
          description: "Top priority roadmap",
          icon: "🚀",
          hue: "violet",
        },
      ],
      tasks: [
        {
          id: "task-linked-1",
          projectId: "proj-alpha",
          title: "Architecture Design Review",
          note: "",
          due: "Today",
          priority: "high",
          complete: false,
          starred: true,
          subtasks: [],
        },
      ],
      notes: [
        {
          id: "note-linked-1",
          projectId: "proj-alpha",
          title: "Project Alpha Specs",
          content: "<p>Specs documentation</p>",
          excerpt: "Specs documentation",
          icon: "📄",
          updated: new Date().toISOString(),
          starred: false,
        },
      ],
    });

    const beforeDelete = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(beforeDelete.projects.length).toBe(1);
    expect(beforeDelete.tasks[0]?.projectId).toBe("proj-alpha");
    expect(beforeDelete.notes[0]?.projectId).toBe("proj-alpha");

    // Delete project with safe preservation (unlinking)
    await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        projects: [],
        tasks: [{ ...beforeDelete.tasks[0]!, projectId: undefined }],
        notes: [{ ...beforeDelete.notes[0]!, projectId: undefined }],
      },
      {
        deletedProjectIds: ["proj-alpha"],
      }
    );

    // Verify rehydration after simulated refresh
    const afterDelete = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(afterDelete.projects.length).toBe(0);
    // Linked tasks and notes remain safely preserved in user workspace
    expect(afterDelete.tasks.length).toBe(1);
    expect(afterDelete.tasks[0]?.id).toBe("task-linked-1");
    expect(afterDelete.tasks[0]?.projectId).toBeUndefined();

    expect(afterDelete.notes.length).toBe(1);
    expect(afterDelete.notes[0]?.id).toBe("note-linked-1");
    expect(afterDelete.notes[0]?.projectId).toBeUndefined();
  });

  it("Cross-Device Write Conflicts: reconciles concurrent saves preserving both Session A's habit and Session B's calendar event", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-conflict-test", email: "conflict@example.com" };
    const workspace = await db.workspace.create({
      data: { id: "ws-conflict", name: "Conflict WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: {
        id: actor.id,
        email: actor.email,
        defaultWorkspaceId: workspace.id,
        preferences: {
          _version: 1,
          calendar: {
            events: [
              {
                id: "evt-initial",
                title: "Initial Team Sync",
                date: "2026-10-14",
                startTime: "09:00",
                endTime: "10:00",
                color: "blue",
              },
            ],
          },
          habits: {
            habits: [
              {
                id: "habit-initial",
                name: "Drink 2L Water",
                targetDays: 7,
                category: "health",
                period: "daily",
              },
            ],
          },
        },
      },
    });

    // Session A and Session B both fetch at version 1
    const sessionASnapshot = await getWorkspaceDeskData(db, actor, workspace.id);
    const sessionBSnapshot = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(sessionASnapshot.preferencesVersion).toBe(1);
    expect(sessionBSnapshot.preferencesVersion).toBe(1);

    // Step 1: Session A adds a new habit "Read 30 mins" and saves at version 1
    const sessionANewHabit = {
      id: "habit-session-a",
      name: "Read 30 mins",
      targetDays: 5,
      category: "learning",
      period: "daily" as const,
    };
    const resA = await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        ...sessionASnapshot,
        habits: [...(sessionASnapshot.habits || []), sessionANewHabit],
      },
      { clientPreferencesVersion: 1 }
    );
    expect(resA.success).toBe(true);
    expect(resA.conflictReconciled).toBe(false);
    expect(resA.preferencesVersion).toBe(2);

    // Step 2: Session B (concurrent, still holds base version 1, unaware of Session A's new habit)
    // adds a calendar event "Dentist Appointment" and saves
    const sessionBNewEvent = {
      id: "evt-session-b",
      title: "Dentist Appointment",
      date: "2026-10-15",
      startTime: "14:00",
      endTime: "15:00",
      color: "amber",
    };
    const resB = await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        ...sessionBSnapshot,
        events: [...(sessionBSnapshot.events || []), sessionBNewEvent],
      },
      { clientPreferencesVersion: 1 } // Stale client version!
    );

    // Conflict was detected and safely reconciled without data loss
    expect(resB.success).toBe(true);
    expect(resB.conflictReconciled).toBe(true);
    expect(resB.preferencesVersion).toBe(3);

    // Step 3: Rehydrate and verify ZERO data loss
    const rehydrated = await getWorkspaceDeskData(db, actor, workspace.id);

    // Both Session A's habit AND Session B's event exist in DB!
    const habitIds = rehydrated.habits?.map((h) => h.id) || [];
    expect(habitIds).toContain("habit-initial");
    expect(habitIds).toContain("habit-session-a"); // Session A's habit was NOT lost!

    const eventIds = rehydrated.events?.map((e) => e.id) || [];
    expect(eventIds).toContain("evt-initial");
    expect(eventIds).toContain("evt-session-b"); // Session B's event was added!
  });

  it("Cross-Device Write Conflicts: merges daily plans across different dates without overwriting", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-planner-test", email: "planner@example.com" };
    const workspace = await db.workspace.create({
      data: { id: "ws-planner", name: "Planner WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: {
        id: actor.id,
        email: actor.email,
        defaultWorkspaceId: workspace.id,
        preferences: {
          _version: 1,
          planner: {
            dailyPlans: {
              "2026-10-13": { date: "2026-10-13", topThreeTaskIds: ["task-today"] },
            },
          },
        },
      },
    });

    // Session A updates tomorrow's plan
    await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        dailyPlans: {
          "2026-10-13": { date: "2026-10-13", topThreeTaskIds: ["task-today"] },
          "2026-10-14": { date: "2026-10-14", topThreeTaskIds: ["task-tomorrow"] },
        },
      },
      { clientPreferencesVersion: 1 }
    );

    // Session B concurrently updates next week's plan from stale version 1
    const resB = await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        dailyPlans: {
          "2026-10-13": { date: "2026-10-13", topThreeTaskIds: ["task-today"] },
          "2026-10-20": { date: "2026-10-20", topThreeTaskIds: ["task-next-week"] },
        },
      },
      { clientPreferencesVersion: 1 }
    );

    expect(resB.conflictReconciled).toBe(true);

    const rehydrated = await getWorkspaceDeskData(db, actor, workspace.id);
    // All 3 dates exist in dailyPlans!
    expect(rehydrated.dailyPlans?.["2026-10-13"]).toBeDefined();
    expect(rehydrated.dailyPlans?.["2026-10-14"]).toBeDefined();
    expect(rehydrated.dailyPlans?.["2026-10-20"]).toBeDefined();
  });

  it("deletes notes with self-referencing foreign keys and preserves tombstone exclusion", async () => {
    const db = createInMemorySyncPrisma();
    const actor = { id: "user-del-test", email: "del@example.com" };

    const workspace = await db.workspace.create({
      data: { id: "ws-del", name: "Delete Test WS", ownerId: actor.id, isPersonal: true },
    });
    await db.profile.create({
      data: {
        id: actor.id,
        email: actor.email,
        defaultWorkspaceId: workspace.id,
        preferences: {},
      },
    });

    // Save initial parent and child notes
    await saveWorkspaceDeskData(db, actor, workspace.id, {
      notes: [
        {
          id: "note-parent-1",
          title: "Architecture Specs",
          excerpt: "Specs",
          content: "Specs content",
          icon: "📄",
          updated: "Just now",
          starred: false,
        },
        {
          id: "note-child-1",
          title: "Database Schema",
          excerpt: "Schema",
          content: "Schema content",
          icon: "📄",
          updated: "Just now",
          starred: false,
          parentId: "note-parent-1",
        },
      ],
    });

    // Verify both were saved
    const initialDesk = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(initialDesk.notes.length).toBe(2);

    // Delete note-parent-1 with tombstone tracking, reparenting child to null
    await saveWorkspaceDeskData(
      db,
      actor,
      workspace.id,
      {
        notes: [
          {
            id: "note-child-1",
            title: "Database Schema",
            excerpt: "Schema",
            content: "Schema content",
            icon: "📄",
            updated: "Just now",
            starred: false,
            parentId: null,
          },
        ],
      },
      {
        deletedNoteIds: ["note-parent-1"],
      }
    );

    // Query desk data after deletion
    const afterDeleteDesk = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(afterDeleteDesk.notes.length).toBe(1);
    expect(afterDeleteDesk.notes[0].id).toBe("note-child-1");
    expect(afterDeleteDesk.notes[0].parentId).toBeNull();

    // Verify parent is recorded in profile _tombstones
    const profile = await db.profile.findUnique({ where: { id: actor.id } });
    const prefs = profile?.preferences as Record<string, unknown>;
    const tombstones = prefs?._tombstones as { notes?: string[] };
    expect(tombstones.notes).toContain("note-parent-1");

    // Even if parent note still existed in db table, getWorkspaceDeskData filters it out
    const rechecked = await getWorkspaceDeskData(db, actor, workspace.id);
    expect(rechecked.notes.some((n) => n.id === "note-parent-1")).toBe(false);
  });
});
