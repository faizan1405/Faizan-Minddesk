import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { NotesView } from "../notes-view";
import { NoteHeader } from "../components/note-header";
import { NoteSidebar } from "../components/note-sidebar";
import type { NoteItem, ProjectItem } from "../../types";

const mockProjects: ProjectItem[] = [
  {
    id: "proj-alpha",
    name: "Project Alpha",
    description: "First core project",
    icon: "🚀",
    hue: "violet",
  },
  {
    id: "proj-beta",
    name: "Project Beta",
    description: "Second initiative",
    icon: "🌱",
    hue: "mint",
  },
];

const mockNotes: NoteItem[] = [
  {
    id: "note-unassigned",
    title: "Quick Meeting Brainstorm",
    excerpt: "Rough notes without any project assignment.",
    content: "<p>Unassigned content</p>",
    icon: "💡",
    updated: "Just now",
    starred: false,
    // Note has no projectId
  },
  {
    id: "note-alpha",
    title: "Alpha Tech Spec",
    excerpt: "Architecture specifications for Alpha.",
    content: "<p>Alpha content</p>",
    icon: "📐",
    updated: "Yesterday",
    projectId: "proj-alpha",
    starred: true,
  },
  {
    id: "note-beta-parent",
    title: "Beta Strategic Roadmap",
    excerpt: "Roadmap for Beta.",
    content: "<p>Beta content</p>",
    icon: "🗺️",
    updated: "2 days ago",
    projectId: "proj-beta",
    starred: false,
  },
  {
    id: "note-beta-child",
    title: "Beta Sprint Deliverables",
    excerpt: "Nested sub-page inside roadmap.",
    content: "<p>Child content</p>",
    icon: "🎯",
    updated: "3 days ago",
    projectId: "proj-beta",
    parentId: "note-beta-parent",
    starred: false,
  },
];

describe("MindDesk Notes & Projects UX", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a new note as Unassigned by default when no project is filtered", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: mockNotes,
          projects: mockProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView />
      </MindDeskProvider>,
    );

    // Initial gallery view should show "Filter by Project"
    expect(screen.getByText(/Filter by Project/i)).toBeInTheDocument();

    // Click "New note"
    const newBtn = screen.getByRole("button", { name: /New note/i });
    fireEvent.click(newBtn);

    // The note should open in editor with "Untitled note"
    expect(screen.getByDisplayValue("Untitled note")).toBeInTheDocument();

    // The project assignment control should explicitly indicate "No project (Unassigned)"
    expect(screen.getByRole("button", { name: /Project assignment/i })).toHaveTextContent(
      /No project \(Unassigned\)/i,
    );

    // It must NOT default to the first project ("Project Alpha") or fake "Personal"
    expect(screen.queryByText("Personal")).not.toBeInTheDocument();
  });

  it("creates a note pre-assigned to a project when explicitly filtered by that project", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: mockNotes,
          projects: mockProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView />
      </MindDeskProvider>,
    );

    // Click on Project Alpha filter pill
    const alphaFilterBtn = screen.getByRole("button", { name: /Project Alpha/i });
    fireEvent.click(alphaFilterBtn);

    // Header create button should adapt to state
    const newAlphaNoteBtn = screen.getByRole("button", { name: /New note in Project Alpha/i });
    expect(newAlphaNoteBtn).toBeInTheDocument();

    fireEvent.click(newAlphaNoteBtn);

    // Editor should open and reflect Project Alpha assignment
    expect(screen.getByDisplayValue("Untitled note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Project assignment/i })).toHaveTextContent(
      /Project Alpha/i,
    );
  });

  it("assigns an unassigned note to an existing project via NoteHeader", () => {
    const handleUpdate = vi.fn();

    render(
      <MindDeskProvider>
        <NoteHeader
          note={mockNotes[0]} // unassigned note
          allNotes={mockNotes}
          projects={mockProjects}
          onUpdate={handleUpdate}
          onNavigateToNote={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onExportMarkdown={vi.fn()}
          onExportJson={vi.fn()}
          saveStatus="idle"
        />
      </MindDeskProvider>,
    );

    // Click project assignment button
    const projectBtn = screen.getByRole("button", { name: /Project assignment/i });
    expect(projectBtn).toHaveTextContent(/No project \(Unassigned\)/i);
    fireEvent.click(projectBtn);

    // Select Project Alpha from popover
    const selectAlpha = screen.getByRole("button", { name: /Project Alpha/i });
    fireEvent.click(selectAlpha);

    expect(handleUpdate).toHaveBeenCalledWith({ projectId: "proj-alpha" });
  });

  it("removes project assignment from a note (unassigns)", () => {
    const handleUpdate = vi.fn();

    render(
      <MindDeskProvider>
        <NoteHeader
          note={mockNotes[1]} // note assigned to proj-alpha
          allNotes={mockNotes}
          projects={mockProjects}
          onUpdate={handleUpdate}
          onNavigateToNote={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onExportMarkdown={vi.fn()}
          onExportJson={vi.fn()}
          saveStatus="idle"
        />
      </MindDeskProvider>,
    );

    // Click project assignment button
    const projectBtn = screen.getByRole("button", { name: /Project assignment/i });
    expect(projectBtn).toHaveTextContent(/Project Alpha/i);
    fireEvent.click(projectBtn);

    // Click Unassigned option
    const unassignBtn = screen.getByRole("button", { name: /Unassigned Standalone document/i });
    fireEvent.click(unassignBtn);

    expect(handleUpdate).toHaveBeenCalledWith({ projectId: undefined });
  });

  it("filters notes by project and by unassigned in NotesView", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: mockNotes,
          projects: mockProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView />
      </MindDeskProvider>,
    );

    // Initially, all notes are visible
    expect(screen.getByText("Quick Meeting Brainstorm")).toBeInTheDocument();
    expect(screen.getByText("Alpha Tech Spec")).toBeInTheDocument();
    expect(screen.getAllByText("Beta Strategic Roadmap").length).toBeGreaterThanOrEqual(1);

    // Filter by Unassigned
    const unassignedFilterBtn = screen.getByRole("button", { name: /Unassigned 1/i });
    fireEvent.click(unassignedFilterBtn);

    // Unassigned note is visible; project notes are hidden
    expect(screen.getByText("Quick Meeting Brainstorm")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Tech Spec")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Strategic Roadmap")).not.toBeInTheDocument();

    // Filter by Project Alpha
    const alphaFilterBtn = screen.getByRole("button", { name: /Project Alpha 1/i });
    fireEvent.click(alphaFilterBtn);

    expect(screen.getByText("Alpha Tech Spec")).toBeInTheDocument();
    expect(screen.queryByText("Quick Meeting Brainstorm")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Strategic Roadmap")).not.toBeInTheDocument();

    // Click All Notes to reset
    const allNotesFilterBtn = screen.getByRole("button", { name: /All Notes 4/i });
    fireEvent.click(allNotesFilterBtn);

    expect(screen.getByText("Quick Meeting Brainstorm")).toBeInTheDocument();
    expect(screen.getByText("Alpha Tech Spec")).toBeInTheDocument();
  });

  it("renders multi-level breadcrumbs in NoteHeader and allows navigation", () => {
    const handleNavigate = vi.fn();

    render(
      <MindDeskProvider>
        <NoteHeader
          note={mockNotes[3]} // Beta child note
          allNotes={mockNotes}
          projects={mockProjects}
          onUpdate={vi.fn()}
          onNavigateToNote={handleNavigate}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onExportMarkdown={vi.fn()}
          onExportJson={vi.fn()}
          saveStatus="idle"
        />
      </MindDeskProvider>,
    );

    // Project layer breadcrumb (present in breadcrumb and project button)
    expect(screen.getAllByText("Project Beta").length).toBeGreaterThanOrEqual(1);

    // Parent document breadcrumb button
    const parentBreadcrumb = screen.getByRole("button", { name: /Beta Strategic Roadmap/i });
    expect(parentBreadcrumb).toBeInTheDocument();

    // Current note title
    expect(screen.getByText("Beta Sprint Deliverables")).toBeInTheDocument();

    // Clicking parent breadcrumb triggers navigation
    fireEvent.click(parentBreadcrumb);
    expect(handleNavigate).toHaveBeenCalledWith("note-beta-parent");
  });

  it("handles empty projects gracefully", () => {
    const handleUpdate = vi.fn();

    render(
      <MindDeskProvider>
        <NoteHeader
          note={mockNotes[0]}
          allNotes={mockNotes}
          projects={[]} // empty projects
          onUpdate={handleUpdate}
          onNavigateToNote={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onExportMarkdown={vi.fn()}
          onExportJson={vi.fn()}
          saveStatus="idle"
        />
      </MindDeskProvider>,
    );

    const projectBtn = screen.getByRole("button", { name: /Project assignment/i });
    expect(projectBtn).toHaveTextContent(/No project \(Unassigned\)/i);

    fireEvent.click(projectBtn);
    expect(screen.getByText(/No projects exist yet/i)).toBeInTheDocument();
  });

  it("supports document hierarchy and search in NoteSidebar", () => {
    const handleSelect = vi.fn();
    const handleCreate = vi.fn();

    render(
      <NoteSidebar
        notes={mockNotes}
        activeNoteId="note-beta-child"
        onSelectNote={handleSelect}
        onCreateNote={handleCreate}
        onDeleteNote={vi.fn()}
        onToggleStar={vi.fn()}
        projects={mockProjects}
      />
    );

    // Check that top level notes and child notes are visible
    expect(screen.getByText("Beta Strategic Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Beta Sprint Deliverables")).toBeInTheDocument();

    // Search for Alpha
    const searchInput = screen.getByPlaceholderText("Search docs…");
    fireEvent.change(searchInput, { target: { value: "Alpha" } });

    expect(screen.getByText("Alpha Tech Spec")).toBeInTheDocument();
    expect(screen.queryByText("Beta Strategic Roadmap")).not.toBeInTheDocument();

    // Quick create in sidebar
    const quickCreateBtn = screen.getByRole("button", { name: /New/i });
    fireEvent.click(quickCreateBtn);
    expect(handleCreate).toHaveBeenCalled();
  });

  it("supports mobile sidebar drawer toggle in NotesView", () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: mockNotes,
          projects: mockProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="note-alpha" />
      </MindDeskProvider>,
    );

    // Should be in NoteEditor for Alpha note
    expect(screen.getByDisplayValue("Alpha Tech Spec")).toBeInTheDocument();

    // Find mobile documents button
    const mobileDocsBtn = screen.getByRole("button", { name: /Documents/i });
    expect(mobileDocsBtn).toBeInTheDocument();

    // Click to open mobile sidebar drawer
    fireEvent.click(mobileDocsBtn);

    // Sidebar should now be open with close button
    const closeBtn = screen.getByTitle("Close sidebar");
    expect(closeBtn).toBeInTheDocument();

    // Close the drawer
    fireEvent.click(closeBtn);
    expect(screen.queryByTitle("Close sidebar")).not.toBeInTheDocument();
  });
});
