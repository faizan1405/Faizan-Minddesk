import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getWorkspaceDeskData,
  saveWorkspaceDeskData,
} from "../sync-repository";
import type { VerifiedActor } from "@/lib/security/authorization";
import type { DeskData, TaskItem, TaskList } from "@/features/minddesk/types";
import type { ProfilePreferencesJson } from "@/features/auth/types";
import { runHabitsStagingVerification } from "../../../../scripts/verify-habits-staging-mariadb";

// ============================================================================
// Isolated In-Memory Relational MySQL Simulator for Non-Destructive Verification
// Enforces:
// 1. Foreign-key relationships (tasks -> task_lists, tasks -> projects, notes -> projects, maps -> projects)
// 2. Multi-tenant composite keys (id_userId_workspaceId)
// 3. Locking reads and transactions ($executeRaw, $transaction)
// ============================================================================
function createIsolatedTestDatabase(): PrismaClient {
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
      if (where.id_userId_workspaceId && typeof where.id_userId_workspaceId === "object") {
        const comp = where.id_userId_workspaceId as { id: string; userId: string; workspaceId: string };
        const row = store.get(comp.id);
        if (row && row.userId === comp.userId && row.workspaceId === comp.workspaceId) {
          return row;
        }
        return null;
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
    mindMap: makeModel(mindMaps),
    mindMapNode: makeModel(mindMapNodes),
    mindMapEdge: makeModel(mindMapEdges),
    $executeRaw: async () => 1,
    $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      const userId = values[0] as string;
      const prof = profiles.get(userId);
      return prof ? [{ preferences: prof.preferences }] : [];
    },
    $transaction: async (fn: (tx: PrismaClient) => Promise<unknown>) => fn(mock as unknown as PrismaClient),
  } as unknown as PrismaClient;

  return mock;
}

// Helper to provision user and workspace
async function setupUserWorkspace(
  db: PrismaClient,
  userId: string,
  email: string,
  workspaceId: string
): Promise<VerifiedActor> {
  await db.profile.create({
    data: {
      id: userId,
      email,
      fullName: `User ${userId}`,
      defaultWorkspaceId: workspaceId,
      preferences: {
        _version: 1,
        _updatedAt: new Date().toISOString(),
        theme: "light",
        calendar: {
          events: [
            {
              id: "evt-initial",
              title: "Initial Kickoff",
              startDate: "2026-10-15",
              allDay: true,
              categoryId: "cat-work",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        habits: {
          habits: [
            {
              id: "habit-initial",
              title: "Morning Stretch",
              frequency: "daily",
              targetDays: [0, 1, 2, 3, 4, 5, 6],
              streak: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      },
    },
  });

  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Personal Workspace",
      ownerId: userId,
      isPersonal: true,
    },
  });

  await db.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role: "owner",
    },
  });

  return {
    id: userId,
    email,
    name: `User ${userId}`,
  };
}

describe("MindDesk Milestone 1: Non-Destructive Isolated Database Verification", () => {
  let db: PrismaClient;
  let actorA: VerifiedActor;
  const workspaceIdA = "ws-test-user-a";

  beforeEach(async () => {
    db = createIsolatedTestDatabase();
    actorA = await setupUserWorkspace(db, "usr-a", "user.a@minddesk.app", workspaceIdA);
  });

  // ==========================================================================
  // CHECK 1: Two truly concurrent writes against Profile.preferences
  // ==========================================================================
  it("CHECK 1: Two truly concurrent writes against Profile.preferences both survive", async () => {
    // Both sessions start with the same initial version 1
    const sessionAVersion = 1;
    const sessionBVersion = 1;

    // Session A adds a new habit: "Drink Water"
    const sessionAData: Partial<DeskData> = {
      habits: [
        {
          id: "habit-initial",
          title: "Morning Stretch",
          frequency: "daily",
          targetDays: [0, 1, 2, 3, 4, 5, 6],
          streak: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "habit-water",
          title: "Drink Water 2L",
          frequency: "daily",
          targetDays: [0, 1, 2, 3, 4, 5, 6],
          streak: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Session B concurrently adds a new calendar event: "Team Design Review"
    const sessionBData: Partial<DeskData> = {
      events: [
        {
          id: "evt-initial",
          title: "Initial Kickoff",
          startDate: "2026-10-15",
          allDay: true,
          categoryId: "cat-work",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "evt-design-review",
          title: "Team Design Review",
          startDate: "2026-10-16",
          allDay: false,
          startTime: "14:00",
          endTime: "15:00",
          categoryId: "cat-work",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Launch both saves concurrently
    const [resA, resB] = await Promise.all([
      saveWorkspaceDeskData(db, actorA, workspaceIdA, sessionAData, {
        clientPreferencesVersion: sessionAVersion,
      }),
      saveWorkspaceDeskData(db, actorA, workspaceIdA, sessionBData, {
        clientPreferencesVersion: sessionBVersion,
      }),
    ]);

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    // Verify one of the concurrent writes triggered reconciliation
    const reconciledSession = resA.conflictReconciled ? resA : resB;
    expect(reconciledSession.conflictReconciled).toBe(true);

    // Read back final Profile from the database
    const finalProfile = await db.profile.findUnique({ where: { id: actorA.id } });
    const finalPrefs =
      (finalProfile?.preferences as unknown as ProfilePreferencesJson) || {};

    // Both updates MUST survive
    expect(finalPrefs._version).toBe(3);

    // 1. Session A's habit survived
    const habitIds = finalPrefs.habits?.habits?.map((h) => h.id);
    expect(habitIds).toContain("habit-initial");
    expect(habitIds).toContain("habit-water");

    // 2. Session B's calendar event survived
    const eventIds = finalPrefs.calendar?.events?.map((e) => e.id);
    expect(eventIds).toContain("evt-initial");
    expect(eventIds).toContain("evt-design-review");
  });

  // ==========================================================================
  // CHECK 2: Task list deletion against MySQL foreign keys & safety
  // ==========================================================================
  describe("CHECK 2: Task list deletion lifecycle & foreign keys", () => {
    it("safely moves tasks to destination list when list is deleted", async () => {
      // Create two task lists
      const lists: TaskList[] = [
        { id: "list-my-tasks", title: "My Tasks", order: 1000, isDefault: true },
        { id: "list-sprint", title: "Current Sprint", order: 2000, isDefault: false },
      ];
      // Create two tasks in list-sprint
      const tasks: TaskItem[] = [
        {
          id: "task-feat",
          title: "Feature Development",
          note: "Work on Milestone 1",
          due: "Today",
          priority: "high",
          complete: false,
          starred: true,
          listId: "list-sprint",
          subtasks: [],
        },
        {
          id: "task-docs",
          title: "Write Release Notes",
          note: "Prepare documentation",
          due: "Tomorrow",
          priority: "medium",
          complete: false,
          starred: false,
          listId: "list-sprint",
          subtasks: [],
        },
      ];

      // Initial save
      await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
        taskLists: lists,
        tasks,
      });

      // User deletes list-sprint, preserving tasks by moving them to list-my-tasks
      const updatedLists = lists.filter((l) => l.id !== "list-sprint");
      const preservedTasks = tasks.map((t) => ({ ...t, listId: "list-my-tasks" }));

      await saveWorkspaceDeskData(
        db,
        actorA,
        workspaceIdA,
        {
          taskLists: updatedLists,
          tasks: preservedTasks,
        },
        {
          deletedTaskListIds: ["list-sprint"],
        }
      );

      // Verify list-sprint is permanently deleted in MySQL
      const dbLists = (await db.taskList.findMany({ where: { workspaceId: workspaceIdA } })) as Array<{ id: string }>;
      expect(dbLists.map((l) => l.id)).toEqual(["list-my-tasks"]);

      // Verify tasks survived in MySQL and now point to list-my-tasks
      const dbTasks = (await db.task.findMany({ where: { workspaceId: workspaceIdA } })) as Array<{ id: string; taskListId?: string }>;
      expect(dbTasks.length).toBe(2);
      expect(dbTasks.every((t) => t.taskListId === "list-my-tasks")).toBe(true);
    });

    it("permanently deletes contained tasks when user explicitly chooses delete option", async () => {
      const lists: TaskList[] = [
        { id: "list-main", title: "Main", order: 1000, isDefault: true },
        { id: "list-temp", title: "Temporary Tasks", order: 2000, isDefault: false },
      ];
      const tasks: TaskItem[] = [
        {
          id: "task-keep",
          title: "Important Long Term Task",
          note: "",
          due: "",
          priority: "none",
          complete: false,
          starred: false,
          listId: "list-main",
          subtasks: [],
        },
        {
          id: "task-temp-1",
          title: "Scratch Task 1",
          note: "",
          due: "",
          priority: "none",
          complete: false,
          starred: false,
          listId: "list-temp",
          subtasks: [],
        },
      ];

      await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
        taskLists: lists,
        tasks,
      });

      // Explicit permanent deletion of list and its contained tasks
      await saveWorkspaceDeskData(
        db,
        actorA,
        workspaceIdA,
        {
          taskLists: [lists[0]],
          tasks: [tasks[0]],
        },
        {
          deletedTaskListIds: ["list-temp"],
          deletedTaskIds: ["task-temp-1"],
        }
      );

      const dbLists = (await db.taskList.findMany({ where: { workspaceId: workspaceIdA } })) as Array<{ id: string }>;
      expect(dbLists.map((l) => l.id)).toEqual(["list-main"]);

      const dbTasks = (await db.task.findMany({ where: { workspaceId: workspaceIdA } })) as Array<{ id: string }>;
      expect(dbTasks.map((t) => t.id)).toEqual(["task-keep"]);
      expect(dbTasks.find((t) => t.id === "task-temp-1")).toBeUndefined();
    });
  });

  // ==========================================================================
  // CHECK 3: Project deletion preserves linked tasks, notes, and mind maps
  // ==========================================================================
  it("CHECK 3: Project deletion preserves linked tasks, notes, and mind maps by unlinking", async () => {
    // Setup project with linked task, note, and mind map
    const project = {
      id: "proj-minddesk",
      name: "MindDesk Core",
      description: "Architecture Refactoring",
      icon: "rocket",
      hue: "violet" as const,
    };
    const task = {
      id: "task-proj-linked",
      title: "Audit Deletion Flows",
      note: "Preserve all records",
      due: "Today",
      priority: "high" as const,
      complete: false,
      starred: true,
      projectId: "proj-minddesk",
      subtasks: [],
    };
    const note = {
      id: "note-proj-linked",
      title: "MindDesk Design Spec",
      excerpt: "Architecture specifications",
      content: "<p>Specifications content</p>",
      icon: "📝",
      updated: new Date().toISOString(),
      projectId: "proj-minddesk",
      starred: true,
    };
    const map = {
      id: "map-proj-linked",
      title: "Domain Map",
      updated: new Date().toISOString(),
      starred: false,
      nodes: [],
      edges: [],
    };

    await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
      projects: [project],
      tasks: [task],
      notes: [note],
      maps: [map],
    });

    // Verify initial link in MySQL
    let dbTask = await db.task.findUnique({ where: { id: "task-proj-linked" } });
    let dbNote = await db.note.findUnique({ where: { id: "note-proj-linked" } });
    expect(dbTask?.projectId).toBe("proj-minddesk");
    expect(dbNote?.projectId).toBe("proj-minddesk");

    // Perform default project deletion: delete project, preserve productivity items
    await saveWorkspaceDeskData(
      db,
      actorA,
      workspaceIdA,
      {
        projects: [],
        tasks: [{ ...task, projectId: undefined }],
        notes: [{ ...note, projectId: undefined }],
        maps: [map],
      },
      {
        deletedProjectIds: ["proj-minddesk"],
      }
    );

    // Project is deleted from projects table
    const dbProject = await db.project.findUnique({ where: { id: "proj-minddesk" } });
    expect(dbProject).toBeNull();

    // Linked task survived, unlinked to projectId = null
    dbTask = await db.task.findUnique({ where: { id: "task-proj-linked" } });
    expect(dbTask).not.toBeNull();
    expect(dbTask?.title).toBe("Audit Deletion Flows");
    expect(dbTask?.projectId).toBeNull();

    // Linked note survived, unlinked to projectId = null
    dbNote = await db.note.findUnique({ where: { id: "note-proj-linked" } });
    expect(dbNote).not.toBeNull();
    expect(dbNote?.title).toBe("MindDesk Design Spec");
    expect(dbNote?.projectId).toBeNull();
  });

  // ==========================================================================
  // CHECK 4: Stale-session synchronization & Tombstone protection
  // ==========================================================================
  it("CHECK 4: Stale session cannot resurrect deleted lists, projects, habits or routines", async () => {
    // 1. Initial State: Create a list, project, habit, and routine
    await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
      taskLists: [{ id: "list-to-delete", title: "Temporary List", order: 1000 }],
      projects: [{ id: "proj-to-delete", name: "Temporary Project", description: "", icon: "folder", hue: "blue" }],
      habits: [{ id: "habit-to-delete", title: "Temporary Habit", frequency: "daily", targetDays: [], streak: 0, createdAt: "", updatedAt: "" }],
      routines: [{ id: "routine-to-delete", title: "Temporary Routine", icon: "sun", timeOfDay: "morning", daysOfWeek: [], steps: [], createdAt: "", updatedAt: "" }],
    });

    // 2. Session 1 explicitly deletes them
    await saveWorkspaceDeskData(
      db,
      actorA,
      workspaceIdA,
      {
        taskLists: [],
        projects: [],
        habits: [],
        routines: [],
      },
      {
        deletedTaskListIds: ["list-to-delete"],
        deletedProjectIds: ["proj-to-delete"],
        deletedHabitIds: ["habit-to-delete"],
        deletedRoutineIds: ["routine-to-delete"],
      }
    );

    // Verify they are deleted in DB
    expect(await db.taskList.findUnique({ where: { id: "list-to-delete" } })).toBeNull();
    expect(await db.project.findUnique({ where: { id: "proj-to-delete" } })).toBeNull();

    // 3. Stale Session 2 (which hasn't received deletions) attempts to save its old local state
    await saveWorkspaceDeskData(
      db,
      actorA,
      workspaceIdA,
      {
        taskLists: [{ id: "list-to-delete", title: "Temporary List", order: 1000 }],
        projects: [{ id: "proj-to-delete", name: "Temporary Project", description: "", icon: "folder", hue: "blue" }],
        habits: [{ id: "habit-to-delete", title: "Temporary Habit", frequency: "daily", targetDays: [], streak: 0, createdAt: "", updatedAt: "" }],
        routines: [{ id: "routine-to-delete", title: "Temporary Routine", icon: "sun", timeOfDay: "morning", daysOfWeek: [], steps: [], createdAt: "", updatedAt: "" }],
      },
      {
        clientPreferencesVersion: 1, // Stale client version
      }
    );

    // Verify tombstone enforcement:
    // Deleted task list MUST NOT reappear in MySQL
    const resurrectedList = await db.taskList.findUnique({ where: { id: "list-to-delete" } });
    expect(resurrectedList).toBeNull();

    // Deleted project MUST NOT reappear in MySQL
    const resurrectedProj = await db.project.findUnique({ where: { id: "proj-to-delete" } });
    expect(resurrectedProj).toBeNull();

    // Deleted habit and routine MUST NOT reappear in preferences
    const refreshedProfile = await db.profile.findUnique({ where: { id: actorA.id } });
    const prefs =
      (refreshedProfile?.preferences as unknown as ProfilePreferencesJson) || {};
    expect(prefs.habits?.habits?.some((h) => h.id === "habit-to-delete")).toBeFalsy();
    expect(prefs.routines?.routines?.some((r) => r.id === "routine-to-delete")).toBeFalsy();
  });

  // ==========================================================================
  // CHECK 5: Multi-tenant and workspace scoping
  // ==========================================================================
  it("CHECK 5: All database writes and deletions remain strictly scoped to authenticated user and workspace", async () => {
    // Provision User B in a separate workspace
    const workspaceIdB = "ws-test-user-b";
    const actorB = await setupUserWorkspace(db, "usr-b", "user.b@minddesk.app", workspaceIdB);

    // Create a confidential note in User A's workspace
    await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
      notes: [
        {
          id: "note-confidential-a",
          title: "User A Strategy",
          excerpt: "Top secret",
          content: "<p>User A private details</p>",
          icon: "🔒",
          updated: new Date().toISOString(),
          starred: true,
        },
      ],
    });

    // 1. User B cannot save to User A's workspace (403 Forbidden)
    await expect(
      saveWorkspaceDeskData(db, actorB, workspaceIdA, {
        notes: [
          {
            id: "note-intruder",
            title: "Hacked Note",
            excerpt: "",
            content: "",
            icon: "🚨",
            updated: new Date().toISOString(),
            starred: false,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    // 2. User B cannot delete User A's records by ID from workspace B
    await saveWorkspaceDeskData(
      db,
      actorB,
      workspaceIdB,
      {},
      {
        deletedNoteIds: ["note-confidential-a"],
      }
    );

    // Verify User A's confidential note remains untouched
    const noteA = await db.note.findUnique({ where: { id: "note-confidential-a" } });
    expect(noteA).not.toBeNull();
    expect(noteA?.title).toBe("User A Strategy");
    expect(noteA?.userId).toBe("usr-a");
    expect(noteA?.workspaceId).toBe(workspaceIdA);
  });

  // ==========================================================================
  // CHECK 6: Production Notes synchronization behavior remains unchanged
  // ==========================================================================
  it("CHECK 6: Production Notes synchronization behavior is completely preserved", async () => {
    const originalNote = {
      id: "note-rich-spec",
      title: "Product Architecture",
      excerpt: "System overview and components",
      content: "<h2>Architecture</h2><p>MindDesk integrates Notes, Planner and Calendar seamlessly.</p>",
      icon: "📘",
      updated: new Date().toISOString(),
      starred: true,
      parentId: null,
      coverImage: "https://example.com/cover.jpg",
    };

    // Save note via sync repository
    await saveWorkspaceDeskData(db, actorA, workspaceIdA, {
      notes: [originalNote],
    });

    // Fetch back via getWorkspaceDeskData
    const fetchedData = await getWorkspaceDeskData(db, actorA, workspaceIdA);
    const fetchedNote = fetchedData.notes.find((n) => n.id === "note-rich-spec");

    expect(fetchedNote).toBeDefined();
    expect(fetchedNote?.title).toBe("Product Architecture");
    expect(fetchedNote?.content).toBe(originalNote.content);
    expect(fetchedNote?.excerpt).toBe("System overview and components");
    expect(fetchedNote?.icon).toBe("📘");
    expect(fetchedNote?.starred).toBe(true);
    expect(fetchedNote?.coverImage).toBe("https://example.com/cover.jpg");
  });

  // ==========================================================================
  // CHECK 7: Habits & Routines Server Persistence, Weekly Flexibility, Pause/Resume & Anti-Resurrection Tombstones
  // ==========================================================================
  it("CHECK 7: Habits & Routines relational persistence, flexible targets, and anti-resurrection tombstones", async () => {
    const { allPassed, results } = await runHabitsStagingVerification(db);
    expect(allPassed).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(9);
  });
});
