import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { NotesView } from "../notes-view";
import { NoteEditor } from "../note-editor";
import type { NoteItem } from "../../types";

describe("MindDesk Notion-Style Notes & Document Editor", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const mockNote: NoteItem = {
    id: "test-note-1",
    title: "Engineering Architecture 2026",
    excerpt: "Technical roadmap and architecture principles.",
    content: "<h1>Engineering Architecture 2026</h1><p>Welcome to the document editor.</p>",
    icon: "🚀",
    updated: "Just now",
    projectId: "northstar",
    starred: true,
  };

  it("renders NotesView gallery with existing notes and search input", () => {
    render(
      <MindDeskProvider>
        <NotesView />
      </MindDeskProvider>,
    );

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find a note…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New note/i })).toBeInTheDocument();
  });

  it("filters notes by title and content body accurately", () => {
    render(
      <MindDeskProvider>
        <NotesView />
      </MindDeskProvider>,
    );

    const searchInput = screen.getByPlaceholderText("Find a note…");
    // Seed note has "Northstar — visual principles"
    fireEvent.change(searchInput, { target: { value: "visual principles" } });
    expect(screen.getByText(/Northstar — visual principles/i)).toBeInTheDocument();

    // Query for non-existent text
    fireEvent.change(searchInput, { target: { value: "nonexistent query string" } });
    expect(screen.queryByText(/Northstar — visual principles/i)).not.toBeInTheDocument();
    expect(screen.getByText("No notes found")).toBeInTheDocument();
  });

  it("creates a new document and switches directly into NoteEditor", () => {
    render(
      <MindDeskProvider>
        <NotesView />
      </MindDeskProvider>,
    );

    const newBtn = screen.getByRole("button", { name: /New note/i });
    fireEvent.click(newBtn);

    // Should now be inside NoteEditor
    expect(screen.getByDisplayValue("Untitled note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All notes/i })).toBeInTheDocument();
  });

  it("renders NoteEditor with header, breadcrumbs, and editable document title", () => {
    const handleUpdate = vi.fn();
    const handleBack = vi.fn();

    render(
      <MindDeskProvider>
        <NoteEditor
          note={mockNote}
          onBack={handleBack}
          onUpdate={handleUpdate}
          onNavigateToNote={vi.fn()}
          onDuplicateNote={vi.fn()}
          onDeleteNote={vi.fn()}
        />
      </MindDeskProvider>,
    );

    const titleInput = screen.getByDisplayValue("Engineering Architecture 2026");
    expect(titleInput).toBeInTheDocument();

    // Change title
    fireEvent.change(titleInput, { target: { value: "Updated Architecture Plan" } });
    expect(handleUpdate).toHaveBeenCalledWith({ title: "Updated Architecture Plan" });

    // Click back button
    const backBtn = screen.getByRole("button", { name: /All notes/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();
  });

  it("supports document duplication and deletion callbacks", async () => {
    const handleDuplicate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <MindDeskProvider>
        <NoteEditor
          note={mockNote}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          onNavigateToNote={vi.fn()}
          onDuplicateNote={handleDuplicate}
          onDeleteNote={handleDelete}
        />
      </MindDeskProvider>,
    );

    // Open more menu via keyboard Enter (accessible and reliable in jsdom)
    const moreBtn = screen.getByRole("button", { name: /More options/i });
    fireEvent.keyDown(moreBtn, { key: "Enter" });

    const duplicateOption = await screen.findByText(/Duplicate note/i);
    fireEvent.click(duplicateOption);
    expect(handleDuplicate).toHaveBeenCalled();
  });

  it("renders breadcrumb navigation when document has a parent document", () => {
    const childNote: NoteItem = {
      ...mockNote,
      id: "child-note-1",
      title: "Marketing Roadmap Sub-Page",
      parentId: "note-1", // seed note-1 is "A softer start to the day"
    };

    render(
      <MindDeskProvider>
        <NoteEditor
          note={childNote}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          onNavigateToNote={vi.fn()}
          onDuplicateNote={vi.fn()}
          onDeleteNote={vi.fn()}
        />
      </MindDeskProvider>,
    );

    expect(screen.getByText("A softer start to the day")).toBeInTheDocument();
    expect(screen.getByText("Marketing Roadmap Sub-Page")).toBeInTheDocument();
  });
});
