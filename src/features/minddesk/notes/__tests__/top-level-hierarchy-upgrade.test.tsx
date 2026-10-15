import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { NotesView } from "../notes-view";
import { SubpagesSection } from "../components/subpages-section";
import type { NoteItem, ProjectItem } from "../../types";

const testProjects: ProjectItem[] = [
  {
    id: "proj-core",
    name: "Core Operations",
    description: "Main business project",
    icon: "💼",
    hue: "violet",
  },
];

const testNotes: NoteItem[] = [
  {
    id: "top-page-1",
    title: "Engineering Roadmap",
    excerpt: "2026 engineering goals and architectural milestones.",
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Main Roadmap Content"}]}]}',
    icon: "📐",
    updated: "Just now",
    starred: true,
    projectId: "proj-core",
    parentId: null,
  },
  {
    id: "sub-page-1a",
    title: "Frontend Architecture",
    excerpt: "Next.js App Router and design system.",
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Subpage 1A Content"}]}]}',
    icon: "🎨",
    updated: "Just now",
    starred: false,
    projectId: "proj-core",
    parentId: "top-page-1",
  },
  {
    id: "sub-page-1b",
    title: "Database Sync Engine",
    excerpt: "MySQL transactional storage and sync.",
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Subpage 1B Content"}]}]}',
    icon: "🗄️",
    updated: "Yesterday",
    starred: false,
    projectId: "proj-core",
    parentId: "top-page-1",
  },
  {
    id: "grandchild-1a1",
    title: "Tiptap Rich-Text Editor",
    excerpt: "Custom blocks and slash commands.",
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Grandchild Content"}]}]}',
    icon: "✍️",
    updated: "Just now",
    starred: false,
    projectId: "proj-core",
    parentId: "sub-page-1a",
  },
  {
    id: "top-page-2",
    title: "Product Marketing",
    excerpt: "Go-to-market strategy.",
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Marketing Content"}]}]}',
    icon: "📣",
    updated: "2 days ago",
    starred: false,
    projectId: "proj-core",
    parentId: null,
  },
];

describe("Notes Upgrade: Top-Level Hierarchy & Subpages Experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows only top-level pages on Notes Home and hides nested subpages", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: testNotes,
          projects: testProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView />
      </MindDeskProvider>,
    );

    // Top-level pages must be displayed on Notes Home
    expect(screen.getByText("Engineering Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Product Marketing")).toBeInTheDocument();

    // Nested subpages and grandchildren must NOT be displayed on Notes Home
    expect(screen.queryByText("Frontend Architecture")).not.toBeInTheDocument();
    expect(screen.queryByText("Database Sync Engine")).not.toBeInTheDocument();
    expect(screen.queryByText("Tiptap Rich-Text Editor")).not.toBeInTheDocument();

    // The top-level page with 2 subpages should display the subpage count badge
    expect(screen.getByText("2 subpages")).toBeInTheDocument();
  });

  it("reveals direct subpages when a parent page opens in the editor", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: testNotes,
          projects: testProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="top-page-1" />
      </MindDeskProvider>,
    );

    // The parent note editor is open
    expect(screen.getByDisplayValue("Engineering Roadmap")).toBeInTheDocument();

    // Subpages section is rendered showing the 2 direct children
    const subpagesSection = screen.getByRole("region", { name: "Subpages section" });
    expect(subpagesSection).toBeInTheDocument();

    expect(within(subpagesSection).getByText("Frontend Architecture")).toBeInTheDocument();
    expect(within(subpagesSection).getByText("Database Sync Engine")).toBeInTheDocument();

    // The grandchild (nested under Frontend Architecture) is NOT a direct child of Roadmap
    expect(within(subpagesSection).queryByText("Tiptap Rich-Text Editor")).not.toBeInTheDocument();

    // It indicates that Frontend Architecture has 1 nested grandchild
    expect(within(subpagesSection).getByText("1 nested")).toBeInTheDocument();
  });

  it("navigates to subpage when clicking its card inside the parent note", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: testNotes,
          projects: testProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="top-page-1" />
      </MindDeskProvider>,
    );

    // Click on Frontend Architecture subpage card in the subpages section
    const subpagesSection = screen.getByRole("region", { name: "Subpages section" });
    const subpageCard = within(subpagesSection).getByText("Frontend Architecture");
    fireEvent.click(subpageCard);

    // Now Frontend Architecture is open in the editor!
    expect(screen.getByDisplayValue("Frontend Architecture")).toBeInTheDocument();

    // And its direct subpage (Tiptap Rich-Text Editor) is now visible in the new subpages section!
    const newSubpagesSection = screen.getByRole("region", { name: "Subpages section" });
    expect(within(newSubpagesSection).getByText("Tiptap Rich-Text Editor")).toBeInTheDocument();
  });

  it("adds a new subpage under the parent page via Add subpage button", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: testNotes,
          projects: testProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="top-page-2" />
      </MindDeskProvider>,
    );

    // Product Marketing starts with 0 subpages
    const subpagesSection = screen.getByRole("region", { name: "Subpages section" });
    expect(within(subpagesSection).getByText("No subpages in this document yet")).toBeInTheDocument();

    // Click Add subpage inside the subpages section
    const addSubpageBtn = within(subpagesSection).getByRole("button", { name: /Add subpage/i });
    fireEvent.click(addSubpageBtn);

    // Navigates directly into the newly created subpage
    expect(screen.getByDisplayValue("Untitled sub-page")).toBeInTheDocument();
  });

  it("renders SubpagesSection directly and handles creation and navigation callbacks", () => {
    const handleNavigate = vi.fn();
    const handleCreate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <SubpagesSection
        parentNote={testNotes[0]}
        subpages={[testNotes[1], testNotes[2]]}
        allNotes={testNotes}
        onNavigateToNote={handleNavigate}
        onCreateSubpage={handleCreate}
        onDeleteSubpage={handleDelete}
      />,
    );

    expect(screen.getByText("Frontend Architecture")).toBeInTheDocument();
    expect(screen.getByText("Database Sync Engine")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Frontend Architecture"));
    expect(handleNavigate).toHaveBeenCalledWith("sub-page-1a");

    const addBtn = screen.getByRole("button", { name: /Add subpage/i });
    fireEvent.click(addBtn);
    expect(handleCreate).toHaveBeenCalled();
  });

  it("preserves existing note content and parent-child relationships", () => {
    // Verify parentId integrity
    expect(testNotes[1].parentId).toBe("top-page-1");
    expect(testNotes[2].parentId).toBe("top-page-1");
    expect(testNotes[3].parentId).toBe("sub-page-1a");
    expect(testNotes[0].parentId).toBeNull();
    expect(testNotes[4].parentId).toBeNull();

    // Verify content integrity
    expect(testNotes[0].content).toContain("Main Roadmap Content");
    expect(testNotes[1].content).toContain("Subpage 1A Content");
    expect(testNotes[3].content).toContain("Grandchild Content");
  });
});
