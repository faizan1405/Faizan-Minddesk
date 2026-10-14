import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { MindMapCanvas } from "../mind-map-canvas";
import { MindMapToolbar } from "../mind-map/mind-map-toolbar";
import { MindMapNode } from "../mind-map/mind-map-node";
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

describe("MindMapNode Component (Xmind / MindMeister UX)", () => {
  it("renders topic label and shows contextual NodeToolbar when selected", () => {
    const onAddChild = vi.fn();
    const onStartConnecting = vi.fn();

    const nodeTypes = { mind: MindMapNode };

    render(
      <ReactFlow
        nodes={[
          {
            id: "node-1",
            type: "mind",
            position: { x: 0, y: 0 },
            selected: true,
            data: {
              label: "Product Roadmap",
              color: "violet",
              shape: "rounded",
              isSelected: true,
              onAddChild,
              onStartConnecting,
            },
          },
        ]}
        nodeTypes={nodeTypes}
      />
    );


    expect(screen.getByText("Product Roadmap")).toBeInTheDocument();
    // Contextual toolbar should be visible
    expect(screen.getByTestId("node-context-toolbar")).toBeInTheDocument();

    // Clicking Add Subtopic
    const addChildBtn = screen.getByTitle(/Add Subtopic/i);
    fireEvent.click(addChildBtn);
    expect(onAddChild).toHaveBeenCalledWith("node-1");

    // Clicking Connect
    const connectBtn = screen.getByTitle(/Connect \/ Relationship/i);
    fireEvent.click(connectBtn);
    expect(onStartConnecting).toHaveBeenCalledWith("node-1");
  });

  it("enters inline editing mode on double-click and commits change on Enter", () => {
    const onLabelChange = vi.fn();

    render(
      <ReactFlowProvider>
        <MindMapNode
          id="node-1"
          type="mind"
          selected={true}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          data={{
            label: "Old Topic Name",
            color: "blue",
            shape: "rounded",
            onLabelChange,
          }}
        />
      </ReactFlowProvider>
    );

    const topicCard = screen.getByTestId("mindmap-node-node-1");
    fireEvent.doubleClick(topicCard);

    const input = screen.getByLabelText(/Edit mind map topic/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("Old Topic Name");

    fireEvent.change(input, { target: { value: "New Topic Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onLabelChange).toHaveBeenCalledWith("node-1", "New Topic Name");
  });
});

describe("MindMapCanvas Integration & Interactions", () => {
  it("renders canvas and clicking Add Topic creates and selects new topic under root", () => {
    const onSave = vi.fn();
    const initialNodes = [
      {
        id: "root-1",
        type: "mind" as const,
        position: { x: 0, y: 0 },
        data: { label: "Central Goal", isRoot: true },
      },
    ];

    render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={[]}
        onSave={onSave}
        theme="calm"
        layout="balanced"
      />
    );

    expect(screen.getByText("Central Goal")).toBeInTheDocument();

    // Click Add Topic button on main toolbar
    const addTopicBtn = screen.getByRole("button", { name: /Add Topic/i });
    fireEvent.click(addTopicBtn);

    // Save should be triggered with 2 nodes and 1 edge
    expect(onSave).toHaveBeenCalled();
    const lastCall = onSave.mock.calls[onSave.mock.calls.length - 1];
    const savedNodes = lastCall[0];
    const savedEdges = lastCall[1];

    expect(savedNodes).toHaveLength(2);
    expect(savedEdges).toHaveLength(1);
    expect(savedEdges[0].source).toBe("root-1");
  });

  it("triggers keyboard shortcuts Tab (Add Subtopic) on canvas", () => {
    const onSave = vi.fn();
    const initialNodes = [
      {
        id: "root-1",
        type: "mind" as const,
        position: { x: 0, y: 0 },
        data: { label: "Central Goal", isRoot: true },
      },
    ];

    render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={[]}
        onSave={onSave}
        theme="paper"
        layout="horizontal"
      />
    );

    // Press Tab
    fireEvent.keyDown(window, { key: "Tab" });

    expect(onSave).toHaveBeenCalled();
    const lastCall = onSave.mock.calls[onSave.mock.calls.length - 1];
    expect(lastCall[0]).toHaveLength(2);
  });
});


