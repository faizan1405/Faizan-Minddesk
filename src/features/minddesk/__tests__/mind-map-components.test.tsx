import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MindMapToolbar } from "../mind-map/mind-map-toolbar";
import {
  NodeDeleteDialog,
  NodeLinkDialog,
  NodeNoteDialog,
} from "../mind-map/mind-map-dialogs";
import type { TaskItem, NoteItem } from "../types";

describe("MindMapToolbar Component", () => {
  it("renders layout selector, theme selector, and action buttons", () => {
    const onLayoutChange = vi.fn();
    const onThemeChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onAddTopic = vi.fn();

    render(
      <MindMapToolbar
        layout="balanced"
        theme="paper"
        canUndo={true}
        canRedo={false}
        searchQuery=""
        matchCount={0}
        currentMatchIndex={0}
        onLayoutChange={onLayoutChange}
        onThemeChange={onThemeChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddTopic={onAddTopic}
        onSearchChange={vi.fn()}
        onNextMatch={vi.fn()}
        onPrevMatch={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterRoot={vi.fn()}
        onExportPng={vi.fn()}
        onExportSvg={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
      />
    );

    // Primary Add Topic button
    const addTopicBtn = screen.getByRole("button", { name: /Add Topic/i });
    expect(addTopicBtn).toBeInTheDocument();
    fireEvent.click(addTopicBtn);
    expect(onAddTopic).toHaveBeenCalledTimes(1);

    // Undo button should be enabled, Redo disabled
    const undoBtn = screen.getByTitle(/Undo/i);
    const redoBtn = screen.getByTitle(/Redo/i);
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Clicking undo triggers callback
    fireEvent.click(undoBtn);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("toggles search and handles search query input", () => {
    const onSearchChange = vi.fn();

    render(
      <MindMapToolbar
        layout="horizontal"
        theme="calm"
        canUndo={false}
        canRedo={false}
        searchQuery=""
        matchCount={3}
        currentMatchIndex={0}
        onLayoutChange={vi.fn()}
        onThemeChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onAddTopic={vi.fn()}
        onSearchChange={onSearchChange}
        onNextMatch={vi.fn()}
        onPrevMatch={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterRoot={vi.fn()}
        onExportPng={vi.fn()}
        onExportSvg={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
      />
    );

    // Click search trigger icon to open input
    const searchTrigger = screen.getByTitle("Search Topics");
    fireEvent.click(searchTrigger);

    const searchInput = screen.getByPlaceholderText("Search map…");
    fireEvent.change(searchInput, { target: { value: "Architecture" } });

    expect(onSearchChange).toHaveBeenCalledWith("Architecture");
  });
});

describe("MindMapDialogs Components", () => {
  it("renders NodeNoteDialog and saves edited note", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <NodeNoteDialog
        open={true}
        nodeLabel="Database Schema"
        initialNote="Initial markdown documentation"
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Topic Note: Database Schema/i)).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Add detailed notes/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Initial markdown documentation");

    fireEvent.change(textarea, { target: { value: "Updated architecture specs" } });
    const saveBtn = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith("Updated architecture specs");
  });

  it("renders NodeLinkDialog with available tasks and notes", () => {
    const onLinkTask = vi.fn();
    const onLinkNote = vi.fn();
    const onUnlink = vi.fn();
    const onClose = vi.fn();

    const mockTasks: TaskItem[] = [
      {
        id: "task-101",
        title: "Setup MariaDB replication",
        completed: false,
        position: 1,
      },
    ];

    const mockNotes: NoteItem[] = [
      {
        id: "note-202",
        title: "Database Strategy",
        content: "Detailed strategy documentation",
        updatedAt: "2026-10-14T10:00:00.000Z",
      },
    ];

    render(
      <NodeLinkDialog
        open={true}
        nodeLabel="Storage Engine"
        tasks={mockTasks}
        notes={mockNotes}
        currentTaskId={undefined}
        currentNoteId={undefined}
        onLinkTask={onLinkTask}
        onLinkNote={onLinkNote}
        onUnlink={onUnlink}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Link Topic: Storage Engine/i)).toBeInTheDocument();
    expect(screen.getByText("Setup MariaDB replication")).toBeInTheDocument();

    // Clicking a task links it
    fireEvent.click(screen.getByText("Setup MariaDB replication"));
    expect(onLinkTask).toHaveBeenCalledWith("task-101");
  });

  it("renders NodeDeleteDialog with branch count and options", () => {
    const onDeleteBranch = vi.fn();
    const onDeleteNodeKeepChildren = vi.fn();
    const onClose = vi.fn();

    render(
      <NodeDeleteDialog
        open={true}
        nodeLabel="Infrastructure"
        childCount={3}
        onDeleteBranch={onDeleteBranch}
        onDeleteNodeKeepChildren={onDeleteNodeKeepChildren}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Delete Topic: “Infrastructure”/i)).toBeInTheDocument();
    expect(screen.getAllByText(/3/i).length).toBeGreaterThan(0);

    // Delete branch button
    const deleteBranchBtn = screen.getByRole("button", { name: /Delete Entire Branch/i });
    fireEvent.click(deleteBranchBtn);
    expect(onDeleteBranch).toHaveBeenCalledTimes(1);
  });
});
