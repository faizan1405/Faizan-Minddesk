import { describe, expect, it, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { DeskData, NoteItem } from "@/features/minddesk/types";
import type { ProfilePreferencesJson } from "@/features/auth/types";
import type { VerifiedActor } from "@/lib/security/authorization";
import {
  saveWorkspaceDeskData,
  reconcileProfilePreferences,
  updateUserProfileSettingsSafely,
} from "../sync-repository";
import { createInMemorySyncPrisma } from "./sync-repository.test";

describe("Milestone 1 + Agent 2 & 3: Settings & Notes Data Integrity Integration", () => {
  const actorA: VerifiedActor = {
    id: "user-alpha",
    email: "alpha@example.com",
    role: "user",
    workspaceId: "ws-alpha",
  };

  let db: PrismaClient;

  beforeEach(async () => {
    db = createInMemorySyncPrisma();

    // Seed User A
    await db.user.create({
      data: {
        id: "user-alpha",
        name: "Alpha User",
        email: "alpha@example.com",
      },
    });

    const initialAlphaPrefs: ProfilePreferencesJson = {
      _version: 1,
      theme: "light",
      calendar: {
        events: [
          {
            id: "event-1",
            title: "Production Release Sprint",
            start: "2026-10-15T09:00:00Z",
            end: "2026-10-15T10:00:00Z",
            allDay: false,
            categoryId: "work",
          },
        ],
        settings: {
          defaultView: "month",
          timeFormat: "12h",
          weekStartsOn: 1,
        },
      },
      habits: {
        habits: [
          {
            id: "habit-1",
            name: "Deep Work Morning",
            frequency: "daily",
            targetDays: [1, 2, 3, 4, 5],
            color: "#4f46e5",
            createdAt: "2026-10-01T00:00:00Z",
          },
        ],
        habitCompletions: [
          {
            id: "comp-1",
            habitId: "habit-1",
            date: "2026-10-14",
            completed: true,
          },
        ],
      },
      routines: {
        routines: [
          {
            id: "routine-1",
            title: "Morning Startup",
            steps: [{ id: "step-1", title: "Review Tasks", durationMinutes: 10 }],
          },
        ],
      },
      planner: {
        dailyPlans: {
          "2026-10-14": {
            date: "2026-10-14",
            topPriorities: ["Deploy to production"],
          },
        },
      },
      _tombstones: {
        taskLists: [],
        projects: [],
        tasks: [],
        notes: [],
        habits: [],
        routines: [],
        events: [],
      },
    };

    await db.workspace.create({
      data: {
        id: "ws-alpha",
        name: "Alpha Workspace",
        ownerId: "user-alpha",
        isPersonal: true,
      },
    });

    await db.workspaceMember.create({
      data: {
        workspaceId: "ws-alpha",
        userId: "user-alpha",
        role: "owner",
      },
    });

    await db.profile.create({
      data: {
        id: "user-alpha",
        email: "alpha@example.com",
        fullName: "Alpha User",
        defaultWorkspaceId: "ws-alpha",
        preferences: initialAlphaPrefs as unknown as Record<string, unknown>,
      },
    });

    // Seed User B
    await db.user.create({
      data: {
        id: "user-beta",
        name: "Beta User",
        email: "beta@example.com",
      },
    });

    await db.workspace.create({
      data: {
        id: "ws-beta",
        name: "Beta Workspace",
        ownerId: "user-beta",
        isPersonal: true,
      },
    });

    await db.workspaceMember.create({
      data: {
        workspaceId: "ws-beta",
        userId: "user-beta",
        role: "owner",
      },
    });

    await db.profile.create({
      data: {
        id: "user-beta",
        email: "beta@example.com",
        fullName: "Beta User",
        defaultWorkspaceId: "ws-beta",
        preferences: { _version: 1, theme: "dark" },
      },
    });
  });

  it("1 & 2: Changing Settings NEVER erases Calendar events, Habits, Routines, or Planner plans", async () => {
    const result = await updateUserProfileSettingsSafely(db, "user-alpha", {
      fullName: "Alpha Updated",
      avatarUrl: "https://example.com/alpha.png",
      preferences: {
        appearance: {
          theme: "dark",
          compactMode: true,
          reducedMotion: true,
        },
        productivity: {
          timeFormat: "24h",
          defaultCalendarView: "week",
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.fullName).toBe("Alpha Updated");
    expect(result.preferencesVersion).toBe(2);

    const profile = await db.profile.findUnique({ where: { id: "user-alpha" } });
    const savedPrefs = (profile?.preferences as unknown as ProfilePreferencesJson) || {};

    // Calendar events must be 100% preserved
    expect(savedPrefs.calendar?.events).toBeDefined();
    expect(savedPrefs.calendar?.events?.length).toBe(1);
    expect(savedPrefs.calendar?.events?.[0].title).toBe("Production Release Sprint");

    // Habits & completions must be 100% preserved
    expect(savedPrefs.habits?.habits).toBeDefined();
    expect(savedPrefs.habits?.habits?.length).toBe(1);
    expect(savedPrefs.habits?.habits?.[0].name).toBe("Deep Work Morning");
    expect(savedPrefs.habits?.habitCompletions?.length).toBe(1);

    // Routines must be preserved
    expect(savedPrefs.routines?.routines?.length).toBe(1);

    // Planner daily plans must be preserved
    expect(savedPrefs.planner?.dailyPlans?.["2026-10-14"]).toBeDefined();

    // Settings fields must be updated
    expect(savedPrefs.appearance?.theme).toBe("dark");
    expect(savedPrefs.appearance?.compactMode).toBe(true);
    expect(savedPrefs.productivity?.timeFormat).toBe("24h");
    expect(savedPrefs.calendar?.settings?.timeFormat).toBe("24h");
  });

  it("3: Calendar or Habit sync updates NEVER erase Settings preferences", async () => {
    // First, set custom settings preferences
    await updateUserProfileSettingsSafely(db, "user-alpha", {
      preferences: {
        appearance: {
          theme: "dark",
          compactMode: true,
          reducedMotion: false,
        },
        productivity: {
          timeFormat: "24h",
          defaultCalendarView: "agenda",
          defaultDurationMinutes: 45,
        },
      },
    });

    const beforeSyncProfile = await db.profile.findUnique({ where: { id: "user-alpha" } });
    const beforeSyncPrefs = (beforeSyncProfile?.preferences as unknown as ProfilePreferencesJson) || {};
    expect(beforeSyncPrefs.appearance?.compactMode).toBe(true);
    expect(beforeSyncPrefs.productivity?.defaultDurationMinutes).toBe(45);

    // Next, perform a sync save adding a second habit
    const syncData: Partial<DeskData> = {
      habits: [
        {
          id: "habit-1",
          name: "Deep Work Morning",
          frequency: "daily",
          targetDays: [1, 2, 3, 4, 5],
          color: "#4f46e5",
          createdAt: "2026-10-01T00:00:00Z",
        },
        {
          id: "habit-2",
          name: "Evening Reading",
          frequency: "daily",
          targetDays: [0, 1, 2, 3, 4, 5, 6],
          color: "#10b981",
          createdAt: "2026-10-14T00:00:00Z",
        },
      ],
    };

    const syncResult = await saveWorkspaceDeskData(db, actorA, "ws-alpha", syncData);
    expect(syncResult.success).toBe(true);

    const afterSyncProfile = await db.profile.findUnique({ where: { id: "user-alpha" } });
    const savedPrefs = (afterSyncProfile?.preferences as unknown as ProfilePreferencesJson) || {};

    // Both habits must be present
    expect(savedPrefs.habits?.habits?.length).toBe(2);

    // Settings preferences must NOT have been erased
    expect(savedPrefs.appearance?.theme).toBe("dark");
    expect(savedPrefs.appearance?.compactMode).toBe(true);
    expect(savedPrefs.productivity?.timeFormat).toBe("24h");
    expect(savedPrefs.productivity?.defaultCalendarView).toBe("agenda");
    expect(savedPrefs.productivity?.defaultDurationMinutes).toBe(45);
  });

  it("4: Concurrent requests merge compatible changes correctly", async () => {
    // Request 1: Update settings (appearance compactMode)
    const settingsPromise = updateUserProfileSettingsSafely(db, "user-alpha", {
      preferences: {
        appearance: { compactMode: true },
      },
    });

    // Request 2: Concurrent workspace sync save (adding an event)
    const syncPromise = saveWorkspaceDeskData(db, actorA, "ws-alpha", {
      events: [
        {
          id: "event-1",
          title: "Production Release Sprint",
          start: "2026-10-15T09:00:00Z",
          end: "2026-10-15T10:00:00Z",
          allDay: false,
          categoryId: "work",
        },
        {
          id: "event-concurrent",
          title: "Concurrent Review Meeting",
          start: "2026-10-15T14:00:00Z",
          end: "2026-10-15T15:00:00Z",
          allDay: false,
          categoryId: "work",
        },
      ],
    });

    const [settingsRes, syncRes] = await Promise.all([settingsPromise, syncPromise]);

    expect(settingsRes.success).toBe(true);
    expect(syncRes.success).toBe(true);

    const profile = await db.profile.findUnique({ where: { id: "user-alpha" } });
    const finalPrefs = (profile?.preferences as unknown as ProfilePreferencesJson) || {};

    // Both changes must survive!
    expect(finalPrefs.appearance?.compactMode).toBe(true);
    expect(finalPrefs.calendar?.events?.some((e) => e.id === "event-concurrent")).toBe(true);
    expect(finalPrefs.habits?.habits?.length).toBe(1);
  });

  it("5: Stale browser sessions cannot silently replace newer unrelated preferences", () => {
    // Current server state has 2 events and preferencesVersion 5
    const currentPrefs: ProfilePreferencesJson = {
      _version: 5,
      appearance: { theme: "dark", compactMode: true, reducedMotion: false },
      calendar: {
        events: [
          {
            id: "server-event-1",
            title: "Server Event",
            start: "2026-10-15T10:00:00Z",
            end: "2026-10-15T11:00:00Z",
            allDay: false,
          },
        ],
      },
      habits: {
        habits: [
          {
            id: "server-habit-1",
            name: "Server Habit",
            frequency: "daily",
            targetDays: [1],
            color: "#000",
            createdAt: "2026-10-01T00:00:00Z",
          },
        ],
      },
    };

    // Stale client has version 1 and an older snapshot
    const staleClientData: Partial<DeskData> = {
      preferencesVersion: 1,
      events: [
        {
          id: "stale-client-event-2",
          title: "Stale Client Event",
          start: "2026-10-15T12:00:00Z",
          end: "2026-10-15T13:00:00Z",
          allDay: false,
        },
      ],
    };

    const reconciled = reconcileProfilePreferences(currentPrefs, staleClientData, {
      clientPreferencesVersion: 1,
    });

    expect(reconciled.conflictReconciled).toBe(true);
    expect(reconciled.preferencesVersion).toBe(6);

    // Both server event AND incoming client event exist (server event was not wiped)
    expect(reconciled.preferences.calendar?.events?.some((e) => e.id === "server-event-1")).toBe(true);
    expect(reconciled.preferences.calendar?.events?.some((e) => e.id === "stale-client-event-2")).toBe(true);

    // Newer appearance settings survived
    expect(reconciled.preferences.appearance?.compactMode).toBe(true);
    expect(reconciled.preferences.appearance?.theme).toBe("dark");

    // Server habit survived
    expect(reconciled.preferences.habits?.habits?.some((h) => h.id === "server-habit-1")).toBe(true);
  });

  it("7: User data remains isolated by authenticated user", async () => {
    await updateUserProfileSettingsSafely(db, "user-alpha", {
      fullName: "Alpha Only Name",
      preferences: {
        appearance: { theme: "dark" },
      },
    });

    const betaProfile = await db.profile.findUnique({ where: { id: "user-beta" } });
    const betaUser = await db.user.findUnique({ where: { id: "user-beta" } });

    // Beta user remains untouched
    expect(betaProfile?.fullName).toBe("Beta User");
    expect(betaUser?.name).toBe("Beta User");
    const betaPrefs = (betaProfile?.preferences as unknown as ProfilePreferencesJson) || {};
    expect(betaPrefs.theme).toBe("dark");
    expect(betaPrefs.appearance).toBeUndefined();
  });

  it("8: Notes with no assigned project persist correctly through MySQL synchronization", async () => {
    const unassignedNote: NoteItem = {
      id: "note-unassigned",
      title: "Quick Scratchpad Idea",
      content: "<p>Unassigned project note</p>",
      excerpt: "Unassigned project note",
      icon: "📝",
      updated: "2026-10-14T10:00:00Z",
      // projectId explicitly undefined
      projectId: undefined,
    };

    const saveRes = await saveWorkspaceDeskData(db, actorA, "ws-alpha", {
      notes: [unassignedNote],
    });

    expect(saveRes.success).toBe(true);
    const dbNote = await db.note.findUnique({ where: { id: "note-unassigned" } });
    expect(dbNote).toBeDefined();
    expect(dbNote?.projectId).toBeNull();
    expect(dbNote?.title).toBe("Quick Scratchpad Idea");
  });

  it("9: Project deletion still preserves linked notes and tasks", async () => {
    // 1. Create a project
    await db.project.create({
      data: {
        id: "proj-launch",
        workspaceId: "ws-alpha",
        userId: "user-alpha",
        name: "Product Launch",
      },
    });

    // 2. Create note and task linked to proj-launch
    await db.note.create({
      data: {
        id: "note-launch-brief",
        workspaceId: "ws-alpha",
        userId: "user-alpha",
        title: "Launch Brief",
        projectId: "proj-launch",
      },
    });

    await db.task.create({
      data: {
        id: "task-launch-checklist",
        workspaceId: "ws-alpha",
        userId: "user-alpha",
        title: "Checklist",
        projectId: "proj-launch",
      },
    });

    // 3. Delete project via deletedProjectIds
    const deleteRes = await saveWorkspaceDeskData(
      db,
      actorA,
      "ws-alpha",
      {},
      { deletedProjectIds: ["proj-launch"] }
    );

    expect(deleteRes.success).toBe(true);

    // Task and Note MUST still exist in database, with projectId unlinked to null!
    const noteAfter = await db.note.findUnique({ where: { id: "note-launch-brief" } });
    expect(noteAfter).toBeDefined();
    expect(noteAfter?.projectId).toBeNull();

    const taskAfter = await db.task.findUnique({ where: { id: "task-launch-checklist" } });
    expect(taskAfter).toBeDefined();
    expect(taskAfter?.projectId).toBeNull();
  });
});
