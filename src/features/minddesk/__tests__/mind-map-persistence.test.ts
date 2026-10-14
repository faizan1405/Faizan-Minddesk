import { describe, expect, it } from "vitest";
import {
  sanitizeMapIdentifiers as sanitizeInRepo,
  toSemanticEdgeType,
  toSemanticNodeType,
} from "@/lib/sync/sync-repository";
import {
  applyLayout,
  createDefaultMindMap,
  findRootNode,
  generateEdgeId,
  generateMapId,
  generateNodeId,
  getChildrenIds,
  getParentId,
  getSubtreeNodeIds,
  sanitizeMapIdentifiers,
  willCreateCycle,
} from "../utils/mind-map-utils";
import { THEME_CONFIGS } from "../mind-map/theme-tokens";
import type { MapEdgeItem, MapNodeItem, MindMapItem } from "../types";

describe("Mind Map Identifier Sanitization & Collision Prevention", () => {
  it("sanitizes legacy hardcoded IDs (root, idea, root-idea) to map-scoped unique IDs", () => {
    const legacyMap: MindMapItem = {
      id: "map-123",
      title: "Test Map",
      createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      nodes: [
        {
          id: "root",
          type: "mind",
          position: { x: 0, y: 0 },
          data: { label: "Central Topic", isRoot: true },
        },
        {
          id: "idea",
          type: "mind",
          position: { x: 250, y: 0 },
          data: { label: "Child Idea" },
        },
      ],
      edges: [
        {
          id: "root-idea",
          source: "root",
          target: "idea",
          type: "smoothstep",
        },
      ],
    };

    const sanitized = sanitizeMapIdentifiers(legacyMap);

    expect(sanitized.nodes[0].id).toBe("map-123_root");
    expect(sanitized.nodes[1].id).toBe("map-123_idea");
    expect(sanitized.edges[0].id).toBe("map-123_root-idea");
    expect(sanitized.edges[0].source).toBe("map-123_root");
    expect(sanitized.edges[0].target).toBe("map-123_idea");

    // Also verify sanitizeInRepo has identical safe behavior
    const sanitizedRepo = sanitizeInRepo(legacyMap);
    expect(sanitizedRepo.nodes[0].id).toBe("map-123_root");
    expect(sanitizedRepo.edges[0].source).toBe("map-123_root");
  });

  it("prevents collisions across multiple maps with previously identical IDs", () => {
    const mapA: MindMapItem = {
      id: "map-AAA",
      title: "Map A",
      createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      nodes: [
        { id: "root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Root A", isRoot: true } },
        { id: "idea", type: "mind", position: { x: 200, y: 0 }, data: { label: "Idea A" } },
      ],
      edges: [{ id: "root-idea", source: "root", target: "idea" }],
    };

    const mapB: MindMapItem = {
      id: "map-BBB",
      title: "Map B",
      createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      nodes: [
        { id: "root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Root B", isRoot: true } },
        { id: "idea", type: "mind", position: { x: 200, y: 0 }, data: { label: "Idea B" } },
      ],
      edges: [{ id: "root-idea", source: "root", target: "idea" }],
    };

    const sanitizedA = sanitizeMapIdentifiers(mapA);
    const sanitizedB = sanitizeMapIdentifiers(mapB);

    const allNodeIds = [...sanitizedA.nodes.map((n) => n.id), ...sanitizedB.nodes.map((n) => n.id)];
    const allEdgeIds = [...sanitizedA.edges.map((e) => e.id), ...sanitizedB.edges.map((e) => e.id)];

    expect(new Set(allNodeIds).size).toBe(4);
    expect(new Set(allEdgeIds).size).toBe(2);
  });

  it("leaves modern maps with UUIDs untouched", () => {
    const uuidMap: MindMapItem = {
      id: "map-999",
      title: "UUID Map",
      createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      nodes: [
        { id: "node_custom_1", type: "mind", position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true } },
        { id: "node_custom_2", type: "mind", position: { x: 200, y: 0 }, data: { label: "Child" } },
      ],
      edges: [{ id: "edge_custom_1", source: "node_custom_1", target: "node_custom_2" }],
    };

    const result = sanitizeMapIdentifiers(uuidMap);
    expect(result.nodes[0].id).toBe("node_custom_1");
    expect(result.nodes[1].id).toBe("node_custom_2");
    expect(result.edges[0].id).toBe("edge_custom_1");
  });

  it("generates unique IDs using ID generators", () => {
    const n1 = generateNodeId();
    const n2 = generateNodeId();
    const e1 = generateEdgeId();
    const m1 = generateMapId();

    expect(n1).toMatch(/^node_/);
    expect(n2).toMatch(/^node_/);
    expect(n1).not.toBe(n2);
    expect(e1).toMatch(/^edge_/);
    expect(m1).toMatch(/^map_/);
  });

  it("creates a default mind map with collision-proof IDs", () => {
    const map = createDefaultMindMap("Strategy 2026", "paper", "horizontal");

    expect(map.title).toBe("Strategy 2026");
    expect(map.theme).toBe("paper");
    expect(map.layout).toBe("horizontal");
    expect(map.nodes.length).toBeGreaterThanOrEqual(2);
    expect(map.edges.length).toBeGreaterThanOrEqual(1);

    // Verify all IDs are prefixed and distinct
    const nodeIds = map.nodes.map((n) => n.id);
    expect(new Set(nodeIds).size).toBe(map.nodes.length);
    nodeIds.forEach((id) => expect(id).toMatch(/^node_/));

    // Verify root node exists
    const root = findRootNode(map.nodes, map.edges);
    expect(root).toBeDefined();
    expect(root?.data.isRoot).toBe(true);
  });
});

describe("Semantic Node & Edge Type Mapping for Prisma Persistence", () => {
  it("converts custom React Flow 'mind' node to database enum 'idea'", () => {
    expect(toSemanticNodeType("mind")).toBe("idea");
    expect(toSemanticNodeType(undefined)).toBe("idea");
    expect(toSemanticNodeType("unknown_random")).toBe("idea");
  });

  it("maps linkedTaskId to 'task_ref'", () => {
    expect(toSemanticNodeType("mind", { linkedTaskId: "task-abc" })).toBe("task_ref");
  });

  it("maps linkedNoteId to 'note_ref'", () => {
    expect(toSemanticNodeType("mind", { linkedNoteId: "note-xyz" })).toBe("note_ref");
  });

  it("maps groups to 'group'", () => {
    expect(toSemanticNodeType("group")).toBe("group");
    expect(toSemanticNodeType("mind", { isGroup: true })).toBe("group");
  });

  it("preserves valid existing database enums", () => {
    expect(toSemanticNodeType("idea")).toBe("idea");
    expect(toSemanticNodeType("task_ref")).toBe("task_ref");
    expect(toSemanticNodeType("note_ref")).toBe("note_ref");
    expect(toSemanticNodeType("group")).toBe("group");
  });

  it("validates and normalizes edge types", () => {
    expect(toSemanticEdgeType("smoothstep")).toBe("smoothstep");
    expect(toSemanticEdgeType("bezier")).toBe("bezier");
    expect(toSemanticEdgeType("straight")).toBe("straight");
    expect(toSemanticEdgeType("default")).toBe("default");
    expect(toSemanticEdgeType("invalid-type")).toBe("smoothstep");
    expect(toSemanticEdgeType("step")).toBe("smoothstep");
    expect(toSemanticEdgeType(null)).toBe("smoothstep");
  });
});

describe("Tree Graph Hierarchy, Traversals & Cycle Prevention", () => {
  const nodes: MapNodeItem[] = [
    { id: "R", type: "mind", position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true } },
    { id: "A", type: "mind", position: { x: 0, y: 0 }, data: { label: "Child A" } },
    { id: "B", type: "mind", position: { x: 0, y: 0 }, data: { label: "Child B" } },
    { id: "A1", type: "mind", position: { x: 0, y: 0 }, data: { label: "Sub A1" } },
    { id: "A2", type: "mind", position: { x: 0, y: 0 }, data: { label: "Sub A2" } },
    { id: "A1_sub", type: "mind", position: { x: 0, y: 0 }, data: { label: "Sub A1 Deep" } },
  ];

  const edges: MapEdgeItem[] = [
    { id: "e1", source: "R", target: "A" },
    { id: "e2", source: "R", target: "B" },
    { id: "e3", source: "A", target: "A1" },
    { id: "e4", source: "A", target: "A2" },
    { id: "e5", source: "A1", target: "A1_sub" },
  ];

  it("navigates parents and children correctly", () => {
    const root = findRootNode(nodes, edges);
    expect(root?.id).toBe("R");

    expect(getParentId("A", edges)).toBe("R");
    expect(getParentId("B", edges)).toBe("R");
    expect(getParentId("A1", edges)).toBe("A");
    expect(getParentId("A1_sub", edges)).toBe("A1");
    expect(getParentId("R", edges)).toBeUndefined();

    expect(getChildrenIds("R", edges)).toEqual(["A", "B"]);
    expect(getChildrenIds("A", edges)).toEqual(["A1", "A2"]);
    expect(getChildrenIds("A1", edges)).toEqual(["A1_sub"]);
    expect(getChildrenIds("B", edges)).toEqual([]);
  });

  it("collects all descendant IDs of a subtree using getSubtreeNodeIds", () => {
    const descA = getSubtreeNodeIds("A", edges);
    expect(descA).toEqual(new Set(["A", "A1", "A2", "A1_sub"]));

    const descA1 = getSubtreeNodeIds("A1", edges);
    expect(descA1).toEqual(new Set(["A1", "A1_sub"]));

    const descB = getSubtreeNodeIds("B", edges);
    expect(descB).toEqual(new Set(["B"]));

    const descRoot = getSubtreeNodeIds("R", edges);
    expect(descRoot).toEqual(new Set(["R", "A", "B", "A1", "A2", "A1_sub"]));
  });

  it("prevents direct and indirect cycles (A -> B -> A)", () => {
    // Attempting to connect A to R or A1 back to R would create cycle
    expect(willCreateCycle("A", "R", edges)).toBe(true);
    expect(willCreateCycle("A1", "A", edges)).toBe(true);
    expect(willCreateCycle("A1_sub", "R", edges)).toBe(true);
    expect(willCreateCycle("A", "A", edges)).toBe(true);
  });

  it("allows non-cyclical hierarchical connections", () => {
    // Connecting B to A1_sub is valid (B has no edge path to A1_sub)
    expect(willCreateCycle("B", "A1_sub", edges)).toBe(false);
    expect(willCreateCycle("A2", "B", edges)).toBe(false);
  });
});

describe("Mind Map Automatic Layout Engines", () => {
  const testNodes: MapNodeItem[] = [
    { id: "root", type: "mind", position: { x: 0, y: 0 }, data: { label: "Central", isRoot: true } },
    { id: "c1", type: "mind", position: { x: 0, y: 0 }, data: { label: "Branch 1" } },
    { id: "c2", type: "mind", position: { x: 0, y: 0 }, data: { label: "Branch 2" } },
    { id: "c3", type: "mind", position: { x: 0, y: 0 }, data: { label: "Branch 3" } },
    { id: "c4", type: "mind", position: { x: 0, y: 0 }, data: { label: "Branch 4" } },
  ];

  const testEdges: MapEdgeItem[] = [
    { id: "e1", source: "root", target: "c1" },
    { id: "e2", source: "root", target: "c2" },
    { id: "e3", source: "root", target: "c3" },
    { id: "e4", source: "root", target: "c4" },
  ];

  it("Balanced Layout: balances branches to both left (negative X) and right (positive X)", () => {
    const layoutNodes = applyLayout(testNodes, testEdges, "balanced");
    const root = layoutNodes.find((n) => n.id === "root");
    expect(root?.position.x).toBe(0);
    expect(root?.position.y).toBe(0);

    const rightBranches = layoutNodes.filter((n) => n.id !== "root" && n.position.x > 0);
    const leftBranches = layoutNodes.filter((n) => n.id !== "root" && n.position.x < 0);

    // 4 branches divided: 2 right, 2 left
    expect(rightBranches.length).toBe(2);
    expect(leftBranches.length).toBe(2);

    // Sibling branches should not occupy the exact same Y position
    const rightYs = rightBranches.map((b) => b.position.y);
    expect(rightYs[0]).not.toBe(rightYs[1]);
  });

  it("Horizontal Tree Layout: positions root on left and all children with positive X", () => {
    const layoutNodes = applyLayout(testNodes, testEdges, "horizontal");
    const root = layoutNodes.find((n) => n.id === "root");
    expect(root?.position.x).toBe(0);

    const children = layoutNodes.filter((n) => n.id !== "root");
    children.forEach((c) => {
      expect(c.position.x).toBeGreaterThan(0);
    });

    // Check vertical distribution: all 4 children have distinct Y positions
    const childYs = new Set(children.map((c) => c.position.y));
    expect(childYs.size).toBe(4);
  });

  it("Vertical Tree Layout: positions root at top and all children with positive Y", () => {
    const layoutNodes = applyLayout(testNodes, testEdges, "vertical");
    const root = layoutNodes.find((n) => n.id === "root");
    expect(root?.position.y).toBe(0);

    const children = layoutNodes.filter((n) => n.id !== "root");
    children.forEach((c) => {
      expect(c.position.y).toBeGreaterThan(0);
    });

    // Check horizontal distribution: all 4 children have distinct X positions
    const childXs = new Set(children.map((c) => c.position.x));
    expect(childXs.size).toBe(4);
  });

  it("Radial Map Layout: distributes children evenly in circular orbits", () => {
    const layoutNodes = applyLayout(testNodes, testEdges, "radial");
    const root = layoutNodes.find((n) => n.id === "root");
    expect(root?.position.x).toBe(0);
    expect(root?.position.y).toBe(0);

    const children = layoutNodes.filter((n) => n.id !== "root");
    // Verify distance from origin is approximately equal to radius (220)
    children.forEach((c) => {
      // Allow for node dimension centering offset
      const dist = Math.sqrt(
        (c.position.x + 90) * (c.position.x + 90) +
        (c.position.y + 25) * (c.position.y + 25)
      );
      expect(dist).toBeGreaterThan(150);
      expect(dist).toBeLessThan(300);
    });
  });

  it("Freeform Canvas: preserves user-specified coordinates without auto-repositioning", () => {
    const customPositions: MapNodeItem[] = [
      { id: "root", type: "mind", position: { x: 123, y: 456 }, data: { label: "Root", isRoot: true } },
      { id: "c1", type: "mind", position: { x: 789, y: 101 }, data: { label: "Child" } },
    ];
    const layoutNodes = applyLayout(customPositions, testEdges, "freeform");
    expect(layoutNodes[0].position).toEqual({ x: 123, y: 456 });
    expect(layoutNodes[1].position).toEqual({ x: 789, y: 101 });
  });
});

describe("Theme Token Contrast & Color Scoping", () => {
  it("defines high contrast and complete color palettes for Calm, Paper, and Midnight", () => {
    const themes = ["calm", "paper", "midnight"] as const;

    themes.forEach((theme) => {
      const config = THEME_CONFIGS[theme];
      expect(config).toBeDefined();
      expect(config.canvasBg).toBeDefined();
      expect(config.nodeBg).toBeDefined();
      expect(config.nodeText).toBeDefined();
      expect(config.rootBg).toBeDefined();
      expect(config.toolbarBg).toBeDefined();
      expect(config.toolbarText).toBeDefined();
      expect(Object.keys(config.colors).length).toBeGreaterThanOrEqual(6);
    });

    // Verify Paper theme aesthetic: warm ivory canvas with dark charcoal text
    expect(THEME_CONFIGS.paper.canvasBg).toBe("#fbf8f2");
    expect(THEME_CONFIGS.paper.nodeText).toBe("#1c1917");
    expect(THEME_CONFIGS.paper.toolbarText).toBe("#292524");

    // Verify Midnight theme aesthetic: deep navy canvas with bright off-white text
    expect(THEME_CONFIGS.midnight.canvasBg).toBe("#0f172a");
    expect(THEME_CONFIGS.midnight.nodeText).toBe("#f8fafc");
    expect(THEME_CONFIGS.midnight.toolbarText).toBe("#f8fafc");
  });
});
