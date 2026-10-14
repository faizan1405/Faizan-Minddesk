import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MindMapCanvas } from "../mind-map-canvas";
import { MindMapToolbar } from "../mind-map/mind-map-toolbar";
import { MindMapNode } from "../mind-map/mind-map-node";
import { NodeLinkDialog } from "../mind-map/mind-map-dialogs";
import {
  createPdfFromJpeg,
  willCreateCycle,
  generateNodeId,
  generateEdgeId,
} from "../utils/mind-map-utils";
import type { MapEdgeItem, MapNodeItem } from "../types";

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
  toSvg: vi.fn().mockResolvedValue("data:image/svg+xml;base64,mock"),
  toJpeg: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQSkZJRg=="),
}));

// Mock @xyflow/react components and hooks
vi.mock("@xyflow/react", () => {
  return {
    ReactFlow: ({
      nodes,
      edges,
      nodeTypes,
      onNodeClick,
      children,
    }: {
      nodes: Array<{ id: string; position: { x: number; y: number }; data: Record<string, unknown>; hidden?: boolean }>;
      edges: Array<{ id: string; source: string; target: string; hidden?: boolean }>;
      nodeTypes: Record<string, React.ComponentType<{ id: string; data: Record<string, unknown> }>>;
      onNodeClick?: (e: React.MouseEvent, node: { id: string; position: { x: number; y: number }; data: Record<string, unknown> }) => void;
      children: React.ReactNode;
    }) => {
      const NodeComponent = nodeTypes.mind || nodeTypes.default;
      return (
        <div data-testid="react-flow-mock">
          <div data-testid="flow-nodes-container">
            {nodes.map((n) => (
              <div
                key={n.id}
                data-testid={`mock-node-wrapper-${n.id}`}
                data-hidden={Boolean(n.hidden)}
                style={{ display: n.hidden ? "none" : "block" }}
                onClick={(e) => onNodeClick?.(e, n)}
              >
                <NodeComponent id={n.id} data={n.data} />
              </div>
            ))}
          </div>
          <div data-testid="flow-edges-container">
            {edges.map((e) => (
              <div
                key={e.id}
                data-testid={`mock-edge-wrapper-${e.id}`}
                data-source={e.source}
                data-target={e.target}
                data-hidden={Boolean(e.hidden)}
              />
            ))}
          </div>
          {children}
        </div>
      );
    },
    Background: () => <div data-testid="flow-background" />,
    Controls: () => <div data-testid="flow-controls" />,
    MiniMap: () => <div data-testid="flow-minimap" />,
    NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible: boolean }) =>
      isVisible ? <div data-testid="mock-node-toolbar">{children}</div> : null,
    Handle: () => null,
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    BackgroundVariant: { Dots: "dots" },
    addEdge: (newEdge: unknown, edges: unknown[]) => [...edges, newEdge],
    applyNodeChanges: (_: unknown, nodes: unknown[]) => nodes,
    applyEdgeChanges: (_: unknown, edges: unknown[]) => edges,
    getNodesBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
    getViewportForBounds: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

describe("MindDesk 18 Professional Mind Map Features Verification", () => {
  // --------------------------------------------------------------------------
  // Feature 16: Client-Side PDF Export (createPdfFromJpeg)
  // --------------------------------------------------------------------------
  describe("Feature 16 — Client-Side PDF Export", () => {
    it("creates a valid standalone PDF 1.4 binary Blob embedding JPEG bytes with zero dependencies", async () => {
      // Mock simple JPEG byte stream
      const mockJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
      const blob = createPdfFromJpeg(mockJpegBytes, 800, 600);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");

      // Verify PDF internal structures using FileReader (jsdom compatible)
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
      });

      expect(text).toContain("%PDF-1.4");
      expect(text).toContain("/Type /Catalog");
      expect(text).toContain("/Type /Pages");
      expect(text).toContain("/Type /Page");
      expect(text).toContain("/MediaBox [0 0 600 450]"); // 800 * 0.75, 600 * 0.75
      expect(text).toContain("/Type /XObject");
      expect(text).toContain("/Subtype /Image");
      expect(text).toContain("/Filter /DCTDecode");
      expect(text).toContain("/Width 800");
      expect(text).toContain("/Height 600");
      expect(text).toContain("/Length 13");
      expect(text).toContain("stream");
      expect(text).toContain("endstream");
      expect(text).toContain("xref");
      expect(text).toContain("trailer");
      expect(text).toContain("/Root 1 0 R");
      expect(text).toContain("startxref");
      expect(text).toContain("%%EOF");
    });

    it("surfaces Export PDF Document in the MindMapToolbar dropdown menu", () => {
      const mockExportPdf = vi.fn();
      render(
        <MindMapToolbar
          theme="calm"
          layout="balanced"
          canUndo={false}
          canRedo={false}
          searchQuery=""
          matchCount={0}
          currentMatchIndex={0}
          onThemeChange={vi.fn()}
          onLayoutChange={vi.fn()}
          onAutoArrange={vi.fn()}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          onSearchChange={vi.fn()}
          onNextMatch={vi.fn()}
          onPrevMatch={vi.fn()}
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onFitView={vi.fn()}
          onCenterRoot={vi.fn()}
          onAddTopic={vi.fn()}
          onExportPng={vi.fn()}
          onExportSvg={vi.fn()}
          onExportPdf={mockExportPdf}
          onExportJson={vi.fn()}
          onImportJson={vi.fn()}
        />
      );

      // Open Export menu
      const exportButton = screen.getByText("Export");
      fireEvent.click(exportButton);

      // Find and click Export PDF Document
      const pdfOption = screen.getByText("Export PDF Document");
      expect(pdfOption).toBeInTheDocument();

      fireEvent.click(pdfOption);
      expect(mockExportPdf).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 10: Complete Collapse / Expand Descendant Hiding
  // --------------------------------------------------------------------------
  describe("Feature 10 — Collapse & Expand Descendant & Edge Hiding", () => {
    it("hides all descendants and connecting edges when a topic is collapsed", () => {
      const rootId = generateNodeId();
      const parentId = generateNodeId();
      const child1Id = generateNodeId();
      const child2Id = generateNodeId();
      const otherBranchId = generateNodeId();

      const nodes: MapNodeItem[] = [
        { id: rootId, position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true, color: "violet" } },
        { id: parentId, position: { x: 200, y: 0 }, data: { label: "Parent Branch", collapsed: true, color: "blue" } },
        { id: child1Id, position: { x: 400, y: -50 }, data: { label: "Child 1", color: "mint" } },
        { id: child2Id, position: { x: 400, y: 50 }, data: { label: "Child 2", color: "mint" } },
        { id: otherBranchId, position: { x: -200, y: 0 }, data: { label: "Other Branch", color: "amber" } },
      ];

      const edges: MapEdgeItem[] = [
        { id: generateEdgeId(), source: rootId, target: parentId },
        { id: generateEdgeId(), source: parentId, target: child1Id },
        { id: generateEdgeId(), source: parentId, target: child2Id },
        { id: generateEdgeId(), source: rootId, target: otherBranchId },
      ];

      render(
        <MindMapCanvas
          nodes={nodes}
          edges={edges}
          onSave={vi.fn()}
          theme="calm"
          layout="balanced"
        />
      );

      // Root, Parent Branch and Other Branch must be visible
      const rootWrapper = screen.getByTestId(`mock-node-wrapper-${rootId}`);
      expect(rootWrapper.getAttribute("data-hidden")).toBe("false");

      const parentWrapper = screen.getByTestId(`mock-node-wrapper-${parentId}`);
      expect(parentWrapper.getAttribute("data-hidden")).toBe("false");

      const otherWrapper = screen.getByTestId(`mock-node-wrapper-${otherBranchId}`);
      expect(otherWrapper.getAttribute("data-hidden")).toBe("false");

      // Child 1 and Child 2 must be hidden because Parent is collapsed
      const child1Wrapper = screen.getByTestId(`mock-node-wrapper-${child1Id}`);
      expect(child1Wrapper.getAttribute("data-hidden")).toBe("true");

      const child2Wrapper = screen.getByTestId(`mock-node-wrapper-${child2Id}`);
      expect(child2Wrapper.getAttribute("data-hidden")).toBe("true");

      // Tree edges connecting to Child 1 and Child 2 must also be hidden
      const edgeToChild1 = screen.getByTestId(`mock-edge-wrapper-${edges[1].id}`);
      expect(edgeToChild1.getAttribute("data-hidden")).toBe("true");

      const edgeToChild2 = screen.getByTestId(`mock-edge-wrapper-${edges[2].id}`);
      expect(edgeToChild2.getAttribute("data-hidden")).toBe("true");

      // Edge to parent and edge to other branch remain visible
      const edgeToParent = screen.getByTestId(`mock-edge-wrapper-${edges[0].id}`);
      expect(edgeToParent.getAttribute("data-hidden")).toBe("false");
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12: External HTTPS URL Links on Topics
  // --------------------------------------------------------------------------
  describe("Feature 12 — Notes & Links (External Web URLs)", () => {
    it("renders clickable external link badge on MindMapNode when externalUrl is present", () => {
      const nodeId = generateNodeId();
      render(
        <MindMapNode
          id={nodeId}
          data={{
            label: "Research Topic",
            color: "blue",
            externalUrl: "https://xmind.app",
          }}
          selected={false}
          type="mind"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />
      );

      const linkBadge = screen.getByTitle("External Link: https://xmind.app");
      expect(linkBadge).toBeInTheDocument();
      expect(linkBadge.tagName).toBe("A");
      expect(linkBadge).toHaveAttribute("href", "https://xmind.app");
      expect(linkBadge).toHaveAttribute("target", "_blank");
      expect(linkBadge).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("allows entering and saving external URL in NodeLinkDialog", () => {
      const mockLinkUrl = vi.fn();
      const mockUnlink = vi.fn();
      const mockClose = vi.fn();

      render(
        <NodeLinkDialog
          open={true}
          nodeLabel="API Documentation"
          tasks={[]}
          notes={[]}
          currentExternalUrl="https://stripe.com/docs"
          onClose={mockClose}
          onLinkTask={vi.fn()}
          onLinkNote={vi.fn()}
          onLinkUrl={mockLinkUrl}
          onUnlink={mockUnlink}
        />
      );

      // Web Link tab should be active
      const urlInput = screen.getByLabelText("External URL link") as HTMLInputElement;
      expect(urlInput).toBeInTheDocument();
      expect(urlInput.value).toBe("https://stripe.com/docs");

      // Change URL and save
      fireEvent.change(urlInput, { target: { value: "https://docs.github.com" } });
      const saveBtn = screen.getByText("Save Link");
      fireEvent.click(saveBtn);

      expect(mockLinkUrl).toHaveBeenCalledWith("https://docs.github.com");
      expect(mockClose).toHaveBeenCalled();
    });

    it("supports unlinking external URLs cleanly", () => {
      const mockUnlink = vi.fn();
      const mockClose = vi.fn();

      render(
        <NodeLinkDialog
          open={true}
          nodeLabel="Reference"
          tasks={[]}
          notes={[]}
          currentExternalUrl="https://example.com"
          onClose={mockClose}
          onLinkTask={vi.fn()}
          onLinkNote={vi.fn()}
          onLinkUrl={vi.fn()}
          onUnlink={mockUnlink}
        />
      );

      const unlinkBtn = screen.getByText("Unlink");
      expect(unlinkBtn).toBeInTheDocument();
      fireEvent.click(unlinkBtn);

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: Drag & Drop Reparenting & Cycle Prevention
  // --------------------------------------------------------------------------
  describe("Feature 5 — Drag & Drop Reparenting & Cycle Detection", () => {
    it("detects and prevents cycles in topic hierarchy using willCreateCycle", () => {
      const edges = [
        { source: "root", target: "parent" },
        { source: "parent", target: "child" },
        { source: "child", target: "grandchild" },
      ];

      // Adding proposed edge from source -> target:
      // Reparenting child under root means proposed edge is root -> child
      expect(willCreateCycle("root", "child", edges)).toBe(false);

      // Reparenting grandchild under root means proposed edge is root -> grandchild
      expect(willCreateCycle("root", "grandchild", edges)).toBe(false);

      // Reparenting parent under grandchild means proposed edge is grandchild -> parent
      // parent can reach grandchild, so grandchild -> parent creates a cycle
      expect(willCreateCycle("grandchild", "parent", edges)).toBe(true);

      // Reparenting child under grandchild means proposed edge is grandchild -> child
      // child can reach grandchild, so grandchild -> child creates a cycle
      expect(willCreateCycle("grandchild", "child", edges)).toBe(true);

      // Reparenting to self is always a cycle
      expect(willCreateCycle("parent", "parent", edges)).toBe(true);
    });

    it("renders visual drop target indicator when isDropTarget is true", () => {
      const targetNodeId = generateNodeId();
      render(
        <MindMapNode
          id={targetNodeId}
          data={{
            label: "Target Parent Topic",
            color: "blue",
            isDropTarget: true,
          }}
          selected={false}
          type="mind"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />
      );

      // Should show drop target highlight badge
      const indicator = screen.getByTestId("drop-target-indicator");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent("Drop to Reparent");

      // Node wrapper should have emerald ring highlight
      const nodeCard = screen.getByTestId(`mindmap-node-${targetNodeId}`);
      expect(nodeCard.className).toContain("ring-emerald-500");
    });
  });

  // --------------------------------------------------------------------------
  // Feature 4: Safe Deletion & Children Preservation
  // --------------------------------------------------------------------------
  describe("Feature 4 — Safe Deletion & Children Preservation", () => {
    it("safely reparents children to grandparent when deleting an intermediate topic", () => {
      const rootId = generateNodeId();
      const parentId = generateNodeId();
      const child1Id = generateNodeId();
      const child2Id = generateNodeId();

      const onSaveMock = vi.fn();
      const initialNodes: MapNodeItem[] = [
        { id: rootId, position: { x: 0, y: 0 }, data: { label: "Central Root", isRoot: true, color: "violet" } },
        { id: parentId, position: { x: 200, y: 0 }, data: { label: "Middle Topic", color: "blue" } },
        { id: child1Id, position: { x: 400, y: -40 }, data: { label: "Child 1", color: "mint" } },
        { id: child2Id, position: { x: 400, y: 40 }, data: { label: "Child 2", color: "mint" } },
      ];

      const initialEdges: MapEdgeItem[] = [
        { id: generateEdgeId(), source: rootId, target: parentId },
        { id: generateEdgeId(), source: parentId, target: child1Id },
        { id: generateEdgeId(), source: parentId, target: child2Id },
      ];

      render(
        <MindMapCanvas
          nodes={initialNodes}
          edges={initialEdges}
          onSave={onSaveMock}
          theme="calm"
          layout="balanced"
        />
      );

      // Select Middle Topic and trigger delete dialog
      const middleNode = screen.getByText("Middle Topic");
      fireEvent.click(middleNode);

      // Press Delete key
      fireEvent.keyDown(window, { key: "Delete" });

      // NodeDeleteDialog should open because it has children
      const deleteDialogTitle = screen.getByText(/Delete Topic: [“"]Middle Topic[”"]/);
      expect(deleteDialogTitle).toBeInTheDocument();

      // Click "Delete Topic & Keep Subtopics"
      const keepChildrenBtn = screen.getByText("Delete Topic & Keep Subtopics");
      act(() => {
        fireEvent.click(keepChildrenBtn);
      });

      // Verify onSave was called with children reparented to rootId
      expect(onSaveMock).toHaveBeenCalled();
      const lastSaveCall = onSaveMock.mock.calls[onSaveMock.mock.calls.length - 1];
      const savedNodes: MapNodeItem[] = lastSaveCall[0];
      const savedEdges: MapEdgeItem[] = lastSaveCall[1];

      // parentId should be deleted
      expect(savedNodes.some((n) => n.id === parentId)).toBe(false);
      // Children should still exist
      expect(savedNodes.some((n) => n.id === child1Id)).toBe(true);
      expect(savedNodes.some((n) => n.id === child2Id)).toBe(true);

      // Edges should now connect rootId directly to child1 and child2
      const child1Edge = savedEdges.find((e) => e.target === child1Id);
      const child2Edge = savedEdges.find((e) => e.target === child2Id);
      expect(child1Edge?.source).toBe(rootId);
      expect(child2Edge?.source).toBe(rootId);
    });
  });
});
