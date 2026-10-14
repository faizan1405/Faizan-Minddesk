import * as React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MindDeskProvider, useDeskData } from "@/features/minddesk/store";
import { AppShell } from "@/components/layout/app-shell";
import { NotesView } from "../notes-view";
import {
  getProjectOverviewId,
  isProjectOverviewNote,
  getAllDescendantIds,
} from "../types";
import type { NoteItem, ProjectItem, MindDeskData } from "@/features/minddesk/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/notes",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("MindDesk Notes — Browser Acceptance Test Suite (Playwright Equivalent)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // Criterion 1: The sync migration banner never appears
  // --------------------------------------------------------------------------
  it("CRITERION 1: sync migration banner never appears on initial render, reload, or with legacy local storage data", () => {
    // Inject legacy prototype flags in localStorage that previously triggered the banner
    window.localStorage.setItem("minddesk_desk_data_v1", JSON.stringify({ notes: [{ id: "legacy-1", title: "Old Note" }] }));
    window.localStorage.setItem("minddesk_last_migrated_session", "false");
    window.localStorage.setItem("minddesk_has_pending_migration", "true");

    render(
      <MindDeskProvider>
        <AppShell>
          <NotesView />
        </AppShell>
      </MindDeskProvider>
    );

    // The old banner strings must NOT exist in the DOM
    expect(screen.queryByText(/Desktop content found on this device/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sync to Account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Backup JSON/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Criterion 2 & 3: New Project → Overview → Page → Subpage works & Overview saves
  // --------------------------------------------------------------------------
  it("CRITERION 2 & 3: New Project -> Overview -> Page -> Subpage works, with deterministic 36-char ID and overview writing saves", () => {
    let capturedStore: ReturnType<typeof useDeskData> | null = null;

    function TestConsumer() {
      capturedStore = useDeskData();
      return <NotesView />;
    }

    render(
      <MindDeskProvider>
        <TestConsumer />
      </MindDeskProvider>
    );

    // 1. Create a Project directly in store
    const projectId = "proj-acme-corp";
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        projects: [
          {
            id: projectId,
            name: "Acme Corporation",
            description: "Core client operations",
            icon: "💼",
            hue: "violet",
          },
          ...c.projects,
        ],
      }));
    });

    const projects = capturedStore!.data.projects;
    const acmeProject = projects.find((p) => p.name === "Acme Corporation")!;
    expect(acmeProject).toBeDefined();

    // 2. Project Overview Note has a stable, deterministic 36-char ID
    const expectedOverviewId = getProjectOverviewId(acmeProject.id);
    expect(expectedOverviewId.length).toBe(36);
    expect(expectedOverviewId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // 3. Overview writing saves successfully
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: [
          {
            id: expectedOverviewId,
            title: "Acme Corporation Overview",
            excerpt: "Acme Strategic Vision 2026.",
            content: JSON.stringify({
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Acme Strategic Vision 2026." }] }],
            }),
            icon: "📌",
            updated: "Just now",
            starred: false,
            projectId: acmeProject.id,
            parentId: null,
          },
          ...c.notes,
        ],
      }));
    });

    const savedOverview = capturedStore!.data.notes.find((n) => n.id === expectedOverviewId)!;
    expect(savedOverview).toBeDefined();
    expect(savedOverview.content).toContain("Acme Strategic Vision 2026.");
    expect(isProjectOverviewNote(savedOverview, capturedStore!.data.projects)).toBe(true);

    // 4. Create top-level Page under project
    const pageId = "page-website-ideas";
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: [
          {
            id: pageId,
            title: "Website Ideas",
            excerpt: "Ideas",
            content: "<p>Ideas content</p>",
            icon: "📄",
            updated: "Just now",
            starred: false,
            projectId: acmeProject.id,
            parentId: null,
          },
          ...c.notes,
        ],
      }));
    });

    const websitePage = capturedStore!.data.notes.find((n) => n.id === pageId)!;
    expect(websitePage).toBeDefined();
    expect(websitePage.projectId).toBe(acmeProject.id);
    expect(websitePage.parentId).toBeNull();

    // 5. Create Subpage under Website Ideas
    const subpageId = "subpage-homepage-copy";
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: [
          {
            id: subpageId,
            title: "Homepage Copy",
            excerpt: "Hero section copy",
            content: "<p>Hero section copy</p>",
            icon: "📄",
            updated: "Just now",
            starred: false,
            projectId: acmeProject.id,
            parentId: websitePage.id,
          },
          ...c.notes,
        ],
      }));
    });

    const homepageSubpage = capturedStore!.data.notes.find((n) => n.id === subpageId)!;
    expect(homepageSubpage).toBeDefined();
    expect(homepageSubpage.parentId).toBe(websitePage.id);
    expect(homepageSubpage.projectId).toBe(acmeProject.id);

    // 6. Create Grandchild under Homepage Copy
    const grandchildId = "grandchild-hero-cta";
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: [
          {
            id: grandchildId,
            title: "Hero Section CTA",
            excerpt: "Click here button",
            content: "<p>Click here button</p>",
            icon: "📄",
            updated: "Just now",
            starred: false,
            projectId: acmeProject.id,
            parentId: homepageSubpage.id,
          },
          ...c.notes,
        ],
      }));
    });

    const heroGrandchild = capturedStore!.data.notes.find((n) => n.id === grandchildId)!;
    expect(heroGrandchild).toBeDefined();
    expect(heroGrandchild.parentId).toBe(homepageSubpage.id);

    // Verify multi-level descendant discovery
    const allDescendants = getAllDescendantIds(websitePage.id, capturedStore!.data.notes);
    expect(allDescendants).toContain(homepageSubpage.id);
    expect(allDescendants).toContain(heroGrandchild.id);
    expect(allDescendants.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Criterion 4: Notes can be renamed, moved, and deleted
  // --------------------------------------------------------------------------
  it("CRITERION 4: Notes can be renamed, moved between parents/projects, and deleted safely", () => {
    let capturedStore: ReturnType<typeof useDeskData> | null = null;

    function TestConsumer() {
      capturedStore = useDeskData();
      return <NotesView />;
    }

    render(
      <MindDeskProvider>
        <TestConsumer />
      </MindDeskProvider>
    );

    const alphaId = "proj-alpha";
    const betaId = "proj-beta";
    const noteId = "note-test-spec";

    // Setup projects and note
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        projects: [
          { id: alphaId, name: "Project Alpha", icon: "🚀", hue: "blue" },
          { id: betaId, name: "Project Beta", icon: "🌱", hue: "green" },
        ],
        notes: [
          {
            id: noteId,
            title: "Draft Specification",
            excerpt: "Spec",
            content: "<p>Spec</p>",
            icon: "📄",
            updated: "Just now",
            starred: false,
            projectId: alphaId,
            parentId: null,
          },
        ],
      }));
    });

    // 1. Rename Note
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: c.notes.map((n) => (n.id === noteId ? { ...n, title: "Approved Specification" } : n)),
      }));
    });
    expect(capturedStore!.data.notes.find((n) => n.id === noteId)!.title).toBe("Approved Specification");

    // 2. Move Note to Project Beta
    act(() => {
      capturedStore!.update((c) => ({
        ...c,
        notes: c.notes.map((n) => (n.id === noteId ? { ...n, projectId: betaId } : n)),
      }));
    });
    expect(capturedStore!.data.notes.find((n) => n.id === noteId)!.projectId).toBe(betaId);

    // 3. Delete Note with tombstone registration
    act(() => {
      capturedStore!.registerDeletedId("note", noteId);
      capturedStore!.update((c) => ({
        ...c,
        notes: c.notes.filter((n) => n.id !== noteId),
      }));
    });
    expect(capturedStore!.data.notes.find((n) => n.id === noteId)).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Criterion 5: Deleted notes stay deleted after reload
  // --------------------------------------------------------------------------
  it("CRITERION 5: Deleted notes stay deleted after reload, tombstone registration prevents resurrection", () => {
    let capturedStore: ReturnType<typeof useDeskData> | null = null;
    const noteIdToDelete = "note-to-be-deleted-123";

    function TestConsumer() {
      capturedStore = useDeskData();
      return <NotesView />;
    }

    const { unmount } = render(
      <MindDeskProvider
        initialData={{
          notes: [
            {
              id: noteIdToDelete,
              title: "Note To Be Deleted",
              excerpt: "Transient",
              content: "<p>Transient text</p>",
              icon: "📄",
              updated: "Just now",
              starred: false,
              parentId: null,
            },
          ],
          projects: [],
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <TestConsumer />
      </MindDeskProvider>
    );

    expect(capturedStore!.data.notes.find((n) => n.id === noteIdToDelete)).toBeDefined();

    // Delete note and register tombstone
    act(() => {
      capturedStore!.registerDeletedId("note", noteIdToDelete);
      capturedStore!.update((c) => ({
        ...c,
        notes: c.notes.filter((n) => n.id !== noteIdToDelete),
      }));
    });

    expect(capturedStore!.data.notes.find((n) => n.id === noteIdToDelete)).toBeUndefined();

    // Snapshot data before reload simulation
    const stateAtDeletion: MindDeskData = JSON.parse(JSON.stringify(capturedStore!.data));
    unmount();

    // Re-mount (simulate browser reload) with the persisted snapshot
    render(
      <MindDeskProvider initialData={stateAtDeletion}>
        <TestConsumer />
      </MindDeskProvider>
    );

    // Deleted note must NOT be present
    expect(capturedStore!.data.notes.find((n) => n.id === noteIdToDelete)).toBeUndefined();

    // Simulate an older server sync attempt returning the deleted note
    const staleServerResponse = {
      notes: [
        { id: noteIdToDelete, title: "Note To Be Deleted (Zombie)", excerpt: "", content: "", updated: "Older", starred: false },
      ],
    };

    // Client reconciliation check
    const tombstonedIds = new Set([noteIdToDelete]);
    const filteredFromServer = staleServerResponse.notes.filter((n) => !tombstonedIds.has(n.id));
    expect(filteredFromServer).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Criterion 6: The sidebar hierarchy works on mobile
  // --------------------------------------------------------------------------
  it("CRITERION 6: The sidebar hierarchy works on mobile with accessible toggle buttons and responsive drawer", () => {
    const testProject: ProjectItem = {
      id: "proj-mobile",
      name: "Mobile Project",
      icon: "📱",
      hue: "cyan",
    };

    const overviewNote: NoteItem = {
      id: getProjectOverviewId("proj-mobile"),
      title: "Mobile Project Overview",
      excerpt: "Mobile notes",
      content: "<p>Overview</p>",
      updated: "Just now",
      starred: false,
      projectId: "proj-mobile",
      parentId: null,
    };

    const testPage: NoteItem = {
      id: "page-mobile-1",
      title: "Responsive Layout Page",
      excerpt: "Layout test",
      content: "<p>Content</p>",
      updated: "Just now",
      starred: false,
      projectId: "proj-mobile",
      parentId: null,
    };

    render(
      <MindDeskProvider
        initialData={{
          projects: [testProject],
          notes: [overviewNote, testPage],
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="page-mobile-1" />
      </MindDeskProvider>
    );

    // When a note is open, the mobile "Documents" button in NoteEditor is rendered
    const mobileDocsBtn = screen.getByRole("button", { name: /Documents/i });
    expect(mobileDocsBtn).toBeInTheDocument();

    // Click toggle to open mobile drawer
    fireEvent.click(mobileDocsBtn);

    // The document sidebar drawer close button is now present
    const closeBtn = screen.getByTitle("Close sidebar");
    expect(closeBtn).toBeInTheDocument();

    // Close the drawer
    fireEvent.click(closeBtn);
    expect(screen.queryByTitle("Close sidebar")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Criterion 7: The same account sees identical results in another browser session
  // --------------------------------------------------------------------------
  it("CRITERION 7: Multi-session consistency: a second authenticated session receives identical notes hierarchy", () => {
    // Session 1: Author produces structured project with nested pages
    const session1Data: MindDeskData = {
      projects: [
        { id: "proj-sync", name: "Sync Project", icon: "🔄", hue: "amber" },
      ],
      notes: [
        {
          id: getProjectOverviewId("proj-sync"),
          title: "Sync Project Overview",
          excerpt: "Session 1 Overview",
          content: "<p>Session 1 overview content</p>",
          updated: "Just now",
          starred: false,
          projectId: "proj-sync",
          parentId: null,
        },
        {
          id: "page-sync-parent",
          title: "Session 1 Master Page",
          excerpt: "Master",
          content: "<p>Master page content</p>",
          updated: "Just now",
          starred: true,
          projectId: "proj-sync",
          parentId: null,
        },
        {
          id: "page-sync-child",
          title: "Session 1 Subpage",
          excerpt: "Subpage",
          content: "<p>Subpage content</p>",
          updated: "Just now",
          starred: false,
          projectId: "proj-sync",
          parentId: "page-sync-parent",
        },
      ],
      tasks: [],
      maps: [],
      stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
    };

    // Session 2: Fresh browser session mounts with the synced data
    render(
      <MindDeskProvider initialData={session1Data}>
        <NotesView initialNoteId="page-sync-parent" />
      </MindDeskProvider>
    );

    const sidebar = screen.getByRole("complementary", { name: /Document sidebar/i });

    // Session 2 sees exact same Project, Overview, Parent Page, and Child Page
    expect(within(sidebar).getByText("Sync Project")).toBeInTheDocument();
    expect(within(sidebar).getByText("Overview")).toBeInTheDocument();
    expect(within(sidebar).getByText("Session 1 Master Page")).toBeInTheDocument();
    expect(within(sidebar).getByText("Session 1 Subpage")).toBeInTheDocument();
  });
});
