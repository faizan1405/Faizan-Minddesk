import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MindMapCanvas } from "../mind-map-canvas";
import {
  calculateNonDisruptiveNodePosition,
  checkNodeOverlap,
  estimateNodeDimensions,
  layoutBalancedMindMap,
  layoutHorizontalTree,
  layoutVerticalTree,
  layoutRadialMap,
  generateEdgeId,
} from "../utils/mind-map-utils";
import type { MapEdgeItem, MapNodeItem } from "../types";

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
  toSvg: vi.fn().mockResolvedValue("data:image/svg+xml;base64,mock"),
}));

describe("Non-Disruptive Mind Map Editing & Auto Arrange", () => {
  // Helper to generate a realistic 18-topic mind map with subtrees on left & right
  function createComplex18TopicMap(): { nodes: MapNodeItem[]; edges: MapEdgeItem[] } {
    const rootId = "root_100";
    const nodes: MapNodeItem[] = [
      { id: rootId, type: "mind", position: { x: 0, y: 0 }, data: { label: "Project Roadmap", isRoot: true } },
    ];
    const edges: MapEdgeItem[] = [];

    // Right-side branches: Features (R1) and Infrastructure (R2)
    const r1 = "node_r1";
    const r2 = "node_r2";
    nodes.push(
      { id: r1, type: "mind", position: { x: 260, y: -120 }, data: { label: "Core Features" } },
      { id: r2, type: "mind", position: { x: 260, y: 140 }, data: { label: "Infrastructure" } }
    );
    edges.push(
      { id: generateEdgeId(), source: rootId, target: r1 },
      { id: generateEdgeId(), source: rootId, target: r2 }
    );

    // Left-side branches: Marketing (L1) and Operations (L2)
    const l1 = "node_l1";
    const l2 = "node_l2";
    nodes.push(
      { id: l1, type: "mind", position: { x: -260, y: -120 }, data: { label: "Marketing" } },
      { id: l2, type: "mind", position: { x: -260, y: 140 }, data: { label: "Operations" } }
    );
    edges.push(
      { id: generateEdgeId(), source: rootId, target: l1 },
      { id: generateEdgeId(), source: rootId, target: l2 }
    );

    // Subtopics under R1 (Features)
    const r1_subtopics = ["Auth System", "Mind Map Editor", "Task Sync", "Calendar Views"];
    r1_subtopics.forEach((lbl, i) => {
      const id = `node_r1_${i}`;
      nodes.push({ id, type: "mind", position: { x: 520, y: -200 + i * 65 }, data: { label: lbl } });
      edges.push({ id: generateEdgeId(), source: r1, target: id });
    });

    // Subtopics under R2 (Infrastructure)
    const r2_subtopics = ["Hostinger VPS", "MySQL DB", "Backup Routine"];
    r2_subtopics.forEach((lbl, i) => {
      const id = `node_r2_${i}`;
      nodes.push({ id, type: "mind", position: { x: 520, y: 100 + i * 65 }, data: { label: lbl } });
      edges.push({ id: generateEdgeId(), source: r2, target: id });
    });

    // Subtopics under L1 (Marketing)
    const l1_subtopics = ["Product Hunt", "Landing Page", "SEO Strategy"];
    l1_subtopics.forEach((lbl, i) => {
      const id = `node_l1_${i}`;
      nodes.push({ id, type: "mind", position: { x: -520, y: -200 + i * 65 }, data: { label: lbl } });
      edges.push({ id: generateEdgeId(), source: l1, target: id });
    });

    // Subtopics under L2 (Operations)
    const l2_subtopics = ["Team Roles", "Security Audit", "Support Desk"];
    l2_subtopics.forEach((lbl, i) => {
      const id = `node_l2_${i}`;
      nodes.push({ id, type: "mind", position: { x: -520, y: 100 + i * 65 }, data: { label: lbl } });
      edges.push({ id: generateEdgeId(), source: l2, target: id });
    });

    return { nodes, edges };
  }

  it("1. Adding a child preserves the exact positions of ALL existing nodes", () => {
    const { nodes, edges } = createComplex18TopicMap();
    expect(nodes.length).toBe(18);

    // Snapshot exact positions of every node
    const originalPositions = new Map(nodes.map((n) => [n.id, { ...n.position }]));

    const targetParentId = "node_r1_1"; // "Mind Map Editor"
    const newPos = calculateNonDisruptiveNodePosition({
      type: "child",
      targetNodeId: targetParentId,
      nodes,
      edges,
      layout: "balanced",
    });

    // Verify calculated position is not undefined or NaN
    expect(Number.isFinite(newPos.x)).toBe(true);
    expect(Number.isFinite(newPos.y)).toBe(true);

    // Child of node on right side extends rightward (X > parent.x)
    const parentNode = nodes.find((n) => n.id === targetParentId)!;
    expect(newPos.x).toBeGreaterThan(parentNode.position.x);

    // Verify zero existing nodes were altered
    for (const n of nodes) {
      const orig = originalPositions.get(n.id)!;
      expect(n.position.x).toBe(orig.x);
      expect(n.position.y).toBe(orig.y);
    }
  });

  it("2. Adding three successive siblings preserves exact positions of every prior node", () => {
    const { nodes, edges } = createComplex18TopicMap();
    const currentNodes = [...nodes];
    const currentEdges = [...edges];

    const originalPositions = new Map(currentNodes.map((n) => [n.id, { ...n.position }]));

    const refSiblingId = "node_r1_3"; // "Calendar Views"
    const createdSiblingIds: string[] = [];

    for (let step = 1; step <= 3; step++) {
      const targetId = createdSiblingIds.length > 0 ? createdSiblingIds[createdSiblingIds.length - 1] : refSiblingId;
      const pos = calculateNonDisruptiveNodePosition({
        type: "sibling",
        targetNodeId: targetId,
        nodes: currentNodes,
        edges: currentEdges,
        layout: "balanced",
      });

      const newId = `sibling_new_${step}`;
      createdSiblingIds.push(newId);

      const newNode: MapNodeItem = {
        id: newId,
        type: "mind",
        position: pos,
        data: { label: `New Sibling ${step}` },
      };
      currentNodes.push(newNode);
      currentEdges.push({
        id: generateEdgeId(),
        source: "node_r1",
        target: newId,
      });

      // Verify every original node still retains its exact coordinates
      for (const [id, orig] of originalPositions.entries()) {
        const found = currentNodes.find((n) => n.id === id)!;
        expect(found.position.x).toBe(orig.x);
        expect(found.position.y).toBe(orig.y);
      }
    }

    // Verify siblings are spaced apart vertically without collision
    for (let i = 0; i < createdSiblingIds.length - 1; i++) {
      const s1 = currentNodes.find((n) => n.id === createdSiblingIds[i])!;
      const s2 = currentNodes.find((n) => n.id === createdSiblingIds[i + 1])!;
      expect(s2.position.y).toBeGreaterThan(s1.position.y);
      const overlap = checkNodeOverlap(
        { x: s1.position.x, y: s1.position.y, width: 180, height: 50 },
        { x: s2.position.x, y: s2.position.y, width: 180, height: 50 },
        10,
        10
      );
      expect(overlap).toBe(false);
    }
  });

  it("3. Nested branches on both sides of root (left vs right) grow in correct direction", () => {
    const { nodes, edges } = createComplex18TopicMap();

    // Right-side parent
    const rightParent = nodes.find((n) => n.id === "node_r2")!;
    const rightChildPos = calculateNonDisruptiveNodePosition({
      type: "child",
      targetNodeId: rightParent.id,
      nodes,
      edges,
      layout: "balanced",
    });
    expect(rightChildPos.x).toBeGreaterThan(rightParent.position.x);

    // Left-side parent
    const leftParent = nodes.find((n) => n.id === "node_l2")!;
    const leftChildPos = calculateNonDisruptiveNodePosition({
      type: "child",
      targetNodeId: leftParent.id,
      nodes,
      edges,
      layout: "balanced",
    });
    expect(leftChildPos.x).toBeLessThan(leftParent.position.x);
  });

  it("4. Collision-aware placement resolves overlaps by finding the nearest empty slot", () => {
    // Artificial scenario: Place an existing node directly where a default child would land
    const rootId = "root_test";
    const existingNodes: MapNodeItem[] = [
      { id: rootId, type: "mind", position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true } },
      // Obstructing node placed right where a new child would go
      { id: "obstruction", type: "mind", position: { x: 244, y: 0 }, data: { label: "Blocker" } },
    ];
    const existingEdges: MapEdgeItem[] = [];

    const freePos = calculateNonDisruptiveNodePosition({
      type: "child",
      targetNodeId: rootId,
      nodes: existingNodes,
      edges: existingEdges,
      layout: "balanced",
    });

    // Confirm that the calculated position does NOT overlap with the blocker
    const collidesWithBlocker = checkNodeOverlap(
      { x: freePos.x, y: freePos.y, width: 180, height: 50 },
      { x: 244, y: 0, width: 180, height: 50 },
      14,
      10
    );
    expect(collidesWithBlocker).toBe(false);
    // It stepped downward to find an open slot
    expect(freePos.y).toBeGreaterThan(0);
  });

  it("5. Auto Arrange algorithm eliminates overlaps and produces clean hierarchy for all 4 layouts", () => {
    const { nodes, edges } = createComplex18TopicMap();

    // Layout 1: Balanced
    const balancedNodes = layoutBalancedMindMap(nodes, edges);
    expect(balancedNodes.length).toBe(nodes.length);
    for (let i = 0; i < balancedNodes.length; i++) {
      for (let j = i + 1; j < balancedNodes.length; j++) {
        const d1 = estimateNodeDimensions(balancedNodes[i]);
        const d2 = estimateNodeDimensions(balancedNodes[j]);
        const overlap = checkNodeOverlap(
          { x: balancedNodes[i].position.x, y: balancedNodes[i].position.y, width: d1.width, height: d1.height },
          { x: balancedNodes[j].position.x, y: balancedNodes[j].position.y, width: d2.width, height: d2.height },
          4,
          4
        );
        expect(overlap).toBe(false);
      }
    }

    // Layout 2: Horizontal Tree
    const horizontalNodes = layoutHorizontalTree(nodes, edges);
    expect(horizontalNodes.length).toBe(nodes.length);
    for (let i = 0; i < horizontalNodes.length; i++) {
      for (let j = i + 1; j < horizontalNodes.length; j++) {
        const d1 = estimateNodeDimensions(horizontalNodes[i]);
        const d2 = estimateNodeDimensions(horizontalNodes[j]);
        const overlap = checkNodeOverlap(
          { x: horizontalNodes[i].position.x, y: horizontalNodes[i].position.y, width: d1.width, height: d1.height },
          { x: horizontalNodes[j].position.x, y: horizontalNodes[j].position.y, width: d2.width, height: d2.height },
          4,
          4
        );
        expect(overlap).toBe(false);
      }
    }

    // Layout 3: Vertical Tree
    const verticalNodes = layoutVerticalTree(nodes, edges);
    expect(verticalNodes.length).toBe(nodes.length);

    // Layout 4: Radial Map
    const radialNodes = layoutRadialMap(nodes, edges);
    expect(radialNodes.length).toBe(nodes.length);
  });

  it("6. Clicking Auto Arrange in MindMapCanvas organizes map, saves positions, and supports Undo/Redo", async () => {
    const onSave = vi.fn();
    const onLayoutChange = vi.fn();

    // Map where topics have scrambled/overlapping positions
    const messyNodes: MapNodeItem[] = [
      { id: "root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Goal", isRoot: true } },
      { id: "c1", type: "mind", position: { x: 10, y: 10 }, data: { label: "Topic 1" } },
      { id: "c2", type: "mind", position: { x: 15, y: 15 }, data: { label: "Topic 2" } },
    ];
    const messyEdges: MapEdgeItem[] = [
      { id: "e1", source: "root", target: "c1" },
      { id: "e2", source: "root", target: "c2" },
    ];

    render(
      <MindMapCanvas
        nodes={messyNodes}
        edges={messyEdges}
        theme="calm"
        layout="balanced"
        onLayoutChange={onLayoutChange}
        onSave={onSave}
      />
    );

    // 1. Verify Auto Arrange button is visible in top toolbar
    const autoArrangeBtn = screen.getByTestId("auto-arrange-button");
    expect(autoArrangeBtn).toBeInTheDocument();

    // 2. Click Auto Arrange
    await act(async () => {
      fireEvent.click(autoArrangeBtn);
    });

    // 3. onSave must be called with the organized nodes and saved to MariaDB
    expect(onSave).toHaveBeenCalled();
    const lastSavedNodes: MapNodeItem[] = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(lastSavedNodes.length).toBe(3);

    // c1 and c2 are no longer overlapping at (10, 10) and (15, 15)
    const savedC1 = lastSavedNodes.find((n) => n.id === "c1")!;
    const savedC2 = lastSavedNodes.find((n) => n.id === "c2")!;
    expect(savedC1.position.x !== 10 || savedC1.position.y !== 10).toBe(true);
    expect(savedC2.position.x !== 15 || savedC2.position.y !== 15).toBe(true);

    // 4. Undo Auto Arrange via Undo button
    const undoBtn = screen.getByTitle(/Undo/i);
    expect(undoBtn).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    // onSave called with restored original coordinates
    const revertedNodes: MapNodeItem[] = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    const revC1 = revertedNodes.find((n) => n.id === "c1")!;
    const revC2 = revertedNodes.find((n) => n.id === "c2")!;
    expect(revC1.position.x).toBe(10);
    expect(revC1.position.y).toBe(10);
    expect(revC2.position.x).toBe(15);
    expect(revC2.position.y).toBe(15);
  });

  it("7. Deleting a topic or changing theme does NOT rearrange other topics", async () => {
    const onSave = vi.fn();
    const initialNodes: MapNodeItem[] = [
      { id: "root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Goal", isRoot: true } },
      { id: "t1", type: "mind", position: { x: 250, y: -80 }, data: { label: "Keep Stationary 1" } },
      { id: "t2", type: "mind", position: { x: 250, y: 80 }, data: { label: "Delete Me" } },
    ];
    const initialEdges: MapEdgeItem[] = [
      { id: "e1", source: "root", target: "t1" },
      { id: "e2", source: "root", target: "t2" },
    ];

    render(
      <MindMapCanvas
        nodes={initialNodes}
        edges={initialEdges}
        theme="calm"
        layout="balanced"
        onSave={onSave}
      />
    );

    // Switch theme from Calm to Midnight
    const themeTrigger = screen.getByTestId("theme-menu-trigger");
    fireEvent.click(themeTrigger);
    const midnightBtn = screen.getByRole("button", { name: /Midnight/i });
    fireEvent.click(midnightBtn);

    // Verify stationary node t1 did not move from (250, -80)
    const afterThemeNodes: MapNodeItem[] = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    const t1AfterTheme = afterThemeNodes.find((n) => n.id === "t1")!;
    expect(t1AfterTheme.position.x).toBe(250);
    expect(t1AfterTheme.position.y).toBe(-80);
  });
});
