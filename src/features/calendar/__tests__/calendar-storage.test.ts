import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMindDeskStore,
  saveMindDeskStore,
  STORAGE_KEY,
} from "@/features/calendar/services/calendar-storage";
import { MindDeskStoreData } from "@/features/calendar/types";

describe("Calendar Storage Service", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    const fakeLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeLocalStorage,
      dispatchEvent: () => true,
    };
  });

  it("returns sanitized seed data when localStorage is uninitialized", () => {
    const store = loadMindDeskStore();
    expect(store).toBeDefined();
    expect(store.events).toEqual([]);
    expect(store.tasks).toEqual([]);
    expect(store.categories.length).toBeGreaterThan(0);
    expect(store.settings).toBeDefined();
    expect(store.settings.defaultView).toBe("month");
  });

  it("persists and reloads updated data without corruption", () => {
    const initial = loadMindDeskStore();
    const updated: MindDeskStoreData = {
      ...initial,
      events: [
        ...initial.events,
        {
          id: "custom-test-event",
          title: "Custom Test Meeting",
          startDate: "2026-10-25",
          endDate: "2026-10-25",
          allDay: true,
          categoryId: "cat-work",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    saveMindDeskStore(updated);
    const reloaded = loadMindDeskStore();
    expect(reloaded.events.some((e) => e.id === "custom-test-event")).toBe(true);
  });

  it("preserves existing notes, task lists, and mind maps without data loss", () => {
    // Pre-populate storage with Phase 3/4 MindDesk data
    const existingDeskData = {
      version: 3,
      tasks: [{ id: "t1", title: "Existing task", complete: false, note: "", due: "Today", priority: "medium", starred: false, projectId: "personal", subtasks: [] }],
      taskLists: [{ id: "l1", title: "Personal Tasks", isDefault: true }],
      notes: [{ id: "n1", title: "Meeting Notes", excerpt: "Notes", content: "Notes content", icon: "✎", updated: "Today", projectId: "personal", starred: false }],
      maps: [{ id: "m1", title: "Architecture Map", updated: "Today", starred: false, nodes: [] }],
      projects: [],
      events: [],
      categories: [],
    };
    mockStorage[STORAGE_KEY] = JSON.stringify(existingDeskData);

    const loaded = loadMindDeskStore();
    expect(loaded.taskLists).toHaveLength(1);
    expect(loaded.notes).toHaveLength(1);
    expect(loaded.maps).toHaveLength(1);

    // Save with calendar modifications
    saveMindDeskStore({
      ...loaded,
      events: [
        {
          id: "new-evt",
          title: "Planning session",
          startDate: "2026-10-14",
          endDate: "2026-10-14",
          allDay: true,
          categoryId: "cat-work",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const parsedRaw = JSON.parse(mockStorage[STORAGE_KEY]);
    expect(parsedRaw.taskLists).toHaveLength(1);
    expect(parsedRaw.notes).toHaveLength(1);
    expect(parsedRaw.maps).toHaveLength(1);
    expect(parsedRaw.events).toHaveLength(1);
  });
});
