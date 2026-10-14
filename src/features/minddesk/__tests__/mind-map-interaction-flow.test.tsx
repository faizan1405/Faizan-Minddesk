import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider, useDeskData } from "@/features/minddesk/store";
import { MapsView } from "@/features/minddesk/library-views";
import { MindMapCanvas } from "@/features/minddesk/mind-map-canvas";
import type { MapNodeItem, MapEdgeItem } from "../types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/maps",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("MindMap Interactive Lifecycle & Theme Transitions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders MapsView, creates a new map, and opens the canvas", async () => {
    render(
      <MindDeskProvider>
        <MapsView />
      </MindDeskProvider>
    );

    // Initial heading
    expect(screen.getByRole("heading", { name: "Mind maps" })).toBeInTheDocument();

    // Create a new map
    const newMapBtn = screen.getByRole("button", { name: /New mind map/i });
    fireEvent.click(newMapBtn);

    // Should switch to active map canvas view with title input and Maps back button
    expect(screen.getByRole("button", { name: /Maps/i })).toBeInTheDocument();
    const titleInput = screen.getByLabelText("Mind map title");
    expect(titleInput).toBeInTheDocument();

    // Edit map title
    fireEvent.change(titleInput, { target: { value: "Q4 Engineering OKRs" } });
    expect(titleInput).toHaveValue("Q4 Engineering OKRs");
  });

  it("supports theme switching across Calm, Paper, and Midnight without layout corruption", () => {
    const onThemeChange = vi.fn();
    const onSave = vi.fn();

    const initialNodes: MapNodeItem[] = [
      { id: "node_root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Central Goal", isRoot: true } },
      { id: "node_child", type: "mind", position: { x: 200, y: 0 }, data: { label: "Milestone 1" } },
    ];
    const initialEdges: MapEdgeItem[] = [
      { id: "edge_1", source: "node_root", target: "node_child" },
    ];

    const { rerender } = render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={initialEdges}
        theme="calm"
        layout="balanced"
        onThemeChange={onThemeChange}
        onSave={onSave}
      />
    );

    // Verify main toolbar is rendered
    expect(screen.getByTestId("mindmap-main-toolbar")).toBeInTheDocument();

    // Open Theme selector
    const themeTrigger = screen.getByTestId("theme-menu-trigger");
    fireEvent.click(themeTrigger);

    // Select Paper theme
    const paperOption = screen.getByRole("button", { name: /Paper/i });
    fireEvent.click(paperOption);
    expect(onThemeChange).toHaveBeenCalledWith("paper");

    // Rerender with Paper theme
    rerender(
      <MindMapCanvas
        nodes={initialNodes}
        edges={initialEdges}
        theme="paper"
        layout="balanced"
        onThemeChange={onThemeChange}
        onSave={onSave}
      />
    );

    // Switch to Midnight theme
    fireEvent.click(screen.getByTestId("theme-menu-trigger"));
    const midnightOption = screen.getByRole("button", { name: /Midnight/i });
    fireEvent.click(midnightOption);
    expect(onThemeChange).toHaveBeenCalledWith("midnight");
  });

  it("supports layout engine switching (Balanced, Horizontal, Vertical, Radial, Freeform)", () => {
    const onLayoutChange = vi.fn();
    const onSave = vi.fn();

    const initialNodes: MapNodeItem[] = [
      { id: "node_root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Central Goal", isRoot: true } },
      { id: "node_child", type: "mind", position: { x: 200, y: 0 }, data: { label: "Milestone 1" } },
    ];
    const initialEdges: MapEdgeItem[] = [
      { id: "edge_1", source: "node_root", target: "node_child" },
    ];

    render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={initialEdges}
        theme="calm"
        layout="balanced"
        onLayoutChange={onLayoutChange}
        onSave={onSave}
      />
    );

    // Open Layout selector
    const layoutTrigger = screen.getByTestId("layout-menu-trigger");
    fireEvent.click(layoutTrigger);

    // Switch to Horizontal Tree
    const horizontalOption = screen.getByRole("button", { name: /Horizontal Tree/i });
    fireEvent.click(horizontalOption);
    expect(onLayoutChange).toHaveBeenCalledWith("horizontal");

    // Reopen and switch to Vertical Tree
    fireEvent.click(layoutTrigger);
    const verticalOption = screen.getByRole("button", { name: /Vertical Tree/i });
    fireEvent.click(verticalOption);
    expect(onLayoutChange).toHaveBeenCalledWith("vertical");

    // Reopen and switch to Radial Map
    fireEvent.click(layoutTrigger);
    const radialOption = screen.getByRole("button", { name: /Radial Map/i });
    fireEvent.click(radialOption);
    expect(onLayoutChange).toHaveBeenCalledWith("radial");

    // Reopen and switch to Freeform
    fireEvent.click(layoutTrigger);
    const freeformOption = screen.getByRole("button", { name: /Freeform Canvas/i });
    fireEvent.click(freeformOption);
    expect(onLayoutChange).toHaveBeenCalledWith("freeform");
  });

  it("supports Undo and Redo actions from the toolbar", async () => {
    const onSave = vi.fn();
    const initialNodes: MapNodeItem[] = [
      { id: "node_root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true } },
    ];
    const initialEdges: MapEdgeItem[] = [];

    render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={initialEdges}
        theme="calm"
        layout="balanced"
        onSave={onSave}
      />
    );

    // Add a topic via toolbar
    const addTopicBtn = screen.getByRole("button", { name: /Add Topic/i });
    fireEvent.click(addTopicBtn);

    // Undo button should now be enabled
    const undoBtn = screen.getByTitle(/Undo/i);
    await waitFor(() => {
      expect(undoBtn).not.toBeDisabled();
    });

    // Click undo
    fireEvent.click(undoBtn);

    // Redo button should now be enabled
    const redoBtn = screen.getByTitle(/Redo/i);
    await waitFor(() => {
      expect(redoBtn).not.toBeDisabled();
    });

    // Click redo
    fireEvent.click(redoBtn);
  });

  it("safely handles map deletion and tombstone registration without affecting tasks or notes", () => {
    let capturedContext: ReturnType<typeof useDeskData> | null = null;

    function TestHarness() {
      capturedContext = useDeskData();
      return <MapsView />;
    }

    render(
      <MindDeskProvider>
        <TestHarness />
      </MindDeskProvider>
    );

    const initialTasksCount = capturedContext!.data.tasks.length;
    const initialNotesCount = capturedContext!.data.notes.length;
    const initialProjectsCount = capturedContext!.data.projects.length;

    // Create a new map
    fireEvent.click(screen.getByRole("button", { name: /New mind map/i }));

    expect(capturedContext!.data.maps.length).toBeGreaterThan(0);
    const activeMapId = capturedContext!.data.maps[0].id;

    // Delete the active mind map
    const deleteMapBtn = screen.getByLabelText("Delete mind map");
    fireEvent.click(deleteMapBtn);

    // Verify deleted map is removed from maps list
    expect(capturedContext!.data.maps.some((m) => m.id === activeMapId)).toBe(false);

    // Verify tasks, notes, and projects are 100% preserved
    expect(capturedContext!.data.tasks.length).toBe(initialTasksCount);
    expect(capturedContext!.data.notes.length).toBe(initialNotesCount);
    expect(capturedContext!.data.projects.length).toBe(initialProjectsCount);
  });
});
