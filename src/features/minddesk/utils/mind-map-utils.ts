import type {
  MapEdgeItem,
  MapNodeItem,
  MindMapItem,
  MindMapLayout,
  MindMapTheme,
} from "../types";

// ============================================================================
// 1. Unique ID Generators & Sanitizers (36-character VARCHAR(36) Safe)
// ============================================================================

/**
 * Checks if a string is a standard 36-character UUID (8-4-4-4-12 hex format).
 */
export function isValidUuid(str: unknown): boolean {
  if (typeof str !== "string" || str.length !== 36) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Deterministically derives an RFC4122-compliant 36-character UUID from any arbitrary string seed.
 * Guarantees output is always exactly 36 characters, collision-resistant, and 100% deterministic
 * across all runs, retries, and environments (server, client, worker).
 */
export function deterministicUuid(seed: string): string {
  if (isValidUuid(seed)) {
    return seed.toLowerCase();
  }

  // 128-bit hash state using four 32-bit FNV-1a variations with distinct primes
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x27d4eb2f;
  let h3 = 0x811c9dc5 ^ 0x5a1f9cd1;
  let h4 = 0x811c9dc5 ^ 0x3c6ef372;

  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x01000193);
    h3 = Math.imul(h3 ^ ((ch << 1) + 1), 0x01000193);
    h4 = Math.imul(h4 ^ (ch * 31 + 7), 0x01000193);
  }

  const toHex = (num: number) => (num >>> 0).toString(16).padStart(8, "0");
  const hex = (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).slice(0, 32);

  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = "4" + hex.slice(13, 16);
  const part4 = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20);
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

/**
 * Standard 36-character UUID generator (fits MariaDB VARCHAR(36) perfectly).
 * NEVER adds string prefixes that push character length beyond 36.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().toLowerCase();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateNodeId(): string {
  return generateId();
}

export function generateEdgeId(): string {
  return generateId();
}

export function generateMapId(): string {
  return generateId();
}

/**
 * Sanitizes map, node, and edge IDs so every identifier is guaranteed:
 * 1. Exactly <= 36 characters (valid UUID fitting MariaDB VarChar(36)).
 * 2. Deterministic: legacy IDs ('root', 'idea', 'root-idea') or overlong IDs ('map_...', 'node_...')
 *    are migrated stably to deterministic UUIDs without churning on retries.
 * 3. Consistent: edge source and target foreign-key references are preserved and remapped accurately.
 */
export function sanitizeMapIdentifiers(map: MindMapItem): MindMapItem {
  if (!map) return map;

  const sanitizedMapId = isValidUuid(map.id) ? map.id : deterministicUuid(map.id || generateMapId());
  const idMap = new Map<string, string>();

  // Check if map itself had an overlong or non-UUID id
  const mapIdChanged = sanitizedMapId !== map.id;

  const nodes = Array.isArray(map.nodes) ? map.nodes : [];
  let nodesChanged = mapIdChanged;

  const sanitizedNodes = nodes.map((node) => {
    const isClean = isValidUuid(node.id);
    if (!isClean) {
      nodesChanged = true;
      const newNodeId = deterministicUuid(`${sanitizedMapId}:node:${node.id}`);
      idMap.set(node.id, newNodeId);
      return { ...node, id: newNodeId };
    }
    return node;
  });

  const edges = Array.isArray(map.edges) ? map.edges : [];
  let edgesChanged = false;

  const sanitizedEdges = edges.map((edge) => {
    const mappedSource = idMap.get(edge.source) || (isValidUuid(edge.source) ? edge.source : deterministicUuid(`${sanitizedMapId}:node:${edge.source}`));
    const mappedTarget = idMap.get(edge.target) || (isValidUuid(edge.target) ? edge.target : deterministicUuid(`${sanitizedMapId}:node:${edge.target}`));
    const mappedEdgeId = isValidUuid(edge.id) ? edge.id : deterministicUuid(`${sanitizedMapId}:edge:${edge.id}`);

    if (
      mappedSource !== edge.source ||
      mappedTarget !== edge.target ||
      mappedEdgeId !== edge.id
    ) {
      edgesChanged = true;
      return {
        ...edge,
        id: mappedEdgeId,
        source: mappedSource,
        target: mappedTarget,
      };
    }
    return edge;
  });

  if (!mapIdChanged && !nodesChanged && !edgesChanged) {
    return map;
  }

  return {
    ...map,
    id: sanitizedMapId,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };
}

/**
 * Factory for creating a brand-new professional mind map with collision-free IDs.
 */
export function createDefaultMindMap(
  title = "Untitled mind map",
  theme: MindMapTheme = "calm",
  layout: MindMapLayout = "balanced"
): MindMapItem {
  const mapId = generateMapId();
  const rootId = generateNodeId();
  const ideaId = generateNodeId();
  const edgeId = generateEdgeId();

  return {
    id: mapId,
    title,
    updated: "Just now",
    starred: false,
    theme,
    layout,
    nodes: [
      {
        id: rootId,
        position: { x: 0, y: 0 },
        data: {
          label: title || "Central Topic",
          color: "violet",
          shape: "rounded",
          fontSize: "lg",
          isRoot: true,
        },
        type: "mind",
      },
      {
        id: ideaId,
        position: { x: 260, y: 0 },
        data: {
          label: "Main Topic",
          color: "blue",
          shape: "rounded",
          fontSize: "base",
        },
        type: "mind",
      },
    ],
    edges: [
      {
        id: edgeId,
        source: rootId,
        target: ideaId,
        type: "smoothstep",
        animated: false,
      },
    ],
  };
}

// ============================================================================
// 2. Tree Hierarchy Traversal & Manipulation
// ============================================================================

export interface TreeNode {
  id: string;
  node: MapNodeItem;
  children: TreeNode[];
  parent?: TreeNode;
  depth: number;
  width: number;
  height: number;
  subtreeHeight: number;
}

export function findRootNode<T extends { id: string; data?: { isRoot?: boolean } }>(
  nodes: T[],
  edges: { source: string; target: string }[]
): T | undefined {
  if (nodes.length === 0) return undefined;
  // Node with isRoot flag
  const explicitRoot = nodes.find((n) => n.data?.isRoot);
  if (explicitRoot) return explicitRoot;

  // Otherwise, node that is not a target of any edge
  const targetIds = new Set(edges.map((e) => e.target));
  const candidate = nodes.find((n) => !targetIds.has(n.id));
  return candidate || nodes[0];
}

export function getChildrenIds(nodeId: string, edges: { source: string; target: string }[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

export function getParentId(nodeId: string, edges: { source: string; target: string }[]): string | undefined {
  const parentEdge = edges.find((e) => e.target === nodeId);
  return parentEdge?.source;
}

export function getSubtreeNodeIds(startNodeId: string, edges: { source: string; target: string }[]): Set<string> {

  const result = new Set<string>([startNodeId]);
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = edges.filter((e) => e.source === current).map((e) => e.target);
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return result;
}

export function willCreateCycle(
  sourceId: string,
  targetId: string,
  edges: MapEdgeItem[]
): boolean {
  if (sourceId === targetId) return true;
  // If targetId can reach sourceId, adding sourceId -> targetId creates a cycle
  const visited = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;
    visited.add(current);

    // Look at outgoing edges from current
    for (const e of edges) {
      if (e.source === current && !visited.has(e.target)) {
        queue.push(e.target);
      }
    }
  }

  return false;
}

// ============================================================================
// 3. Real Automatic Layout Algorithms (Balanced, Horizontal, Vertical, Radial)
// ============================================================================

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 50;
const HORIZONTAL_GAP = 70;
const VERTICAL_GAP = 28;

function estimateNodeDimensions(node: MapNodeItem): { width: number; height: number } {
  const label = node.data?.label || "";
  const lines = label.split("\n");
  const maxLineLength = Math.max(...lines.map((l) => l.length), 8);
  const width = Math.min(Math.max(maxLineLength * 9.5 + 44, DEFAULT_NODE_WIDTH), 320);
  const height = Math.max(lines.length * 22 + 28, DEFAULT_NODE_HEIGHT);
  return { width, height };
}

function buildHierarchyTree(
  nodeId: string,
  nodeMap: Map<string, MapNodeItem>,
  edges: MapEdgeItem[],
  depth = 0,
  visited = new Set<string>()
): TreeNode | null {
  const node = nodeMap.get(nodeId);
  if (!node || visited.has(nodeId)) return null;
  visited.add(nodeId);

  const { width, height } = estimateNodeDimensions(node);
  const childIds = edges.filter((e) => e.source === nodeId).map((e) => e.target);
  const children: TreeNode[] = [];

  const treeNode: TreeNode = {
    id: nodeId,
    node,
    children,
    depth,
    width,
    height,
    subtreeHeight: height,
  };

  for (const childId of childIds) {
    const childTree = buildHierarchyTree(childId, nodeMap, edges, depth + 1, visited);
    if (childTree) {
      childTree.parent = treeNode;
      children.push(childTree);
    }
  }

  if (children.length > 0) {
    const childrenTotalHeight = children.reduce(
      (sum, c, i) => sum + c.subtreeHeight + (i > 0 ? VERTICAL_GAP : 0),
      0
    );
    treeNode.subtreeHeight = Math.max(height, childrenTotalHeight);
  }

  return treeNode;
}

/**
 * 1. Balanced Mind Map Layout:
 * The central topic stays at (0, 0).
 * Top-level children are split evenly: half placed to the right, half placed to the left.
 * Subtrees grow outward with collision-free vertical distribution.
 */
export function layoutBalancedMindMap(
  nodes: MapNodeItem[],
  edges: MapEdgeItem[]
): MapNodeItem[] {
  if (nodes.length <= 1) return nodes;
  const root = findRootNode(nodes, edges);
  if (!root) return nodes;

  const nodeMap = new Map<string, MapNodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const topLevelChildrenIds = edges.filter((e) => e.source === root.id).map((e) => e.target);
  const rightChildIds: string[] = [];
  const leftChildIds: string[] = [];

  topLevelChildrenIds.forEach((id, idx) => {
    if (idx % 2 === 0) {
      rightChildIds.push(id);
    } else {
      leftChildIds.push(id);
    }
  });

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(root.id, { x: 0, y: 0 });

  const rootDim = estimateNodeDimensions(root);

  // Position subtrees in one direction (right = +1, left = -1)
  function layoutDirection(
    childIds: string[],
    direction: 1 | -1
  ) {
    const visited = new Set<string>([root!.id]);
    const subtrees: TreeNode[] = [];

    for (const id of childIds) {
      const tree = buildHierarchyTree(id, nodeMap, edges, 1, visited);
      if (tree) subtrees.push(tree);
    }

    const totalHeight = subtrees.reduce(
      (sum, t, i) => sum + t.subtreeHeight + (i > 0 ? VERTICAL_GAP : 0),
      0
    );

    let startY = -totalHeight / 2;

    function positionSubtree(tn: TreeNode, parentX: number, centerY: number) {
      const x = parentX + direction * (tn.width / 2 + HORIZONTAL_GAP);
      positions.set(tn.id, { x: direction === 1 ? x : x - tn.width, y: centerY - tn.height / 2 });

      if (tn.children.length === 0) return;

      const childrenTotalHeight = tn.children.reduce(
        (sum, c, i) => sum + c.subtreeHeight + (i > 0 ? VERTICAL_GAP : 0),
        0
      );
      let childStartY = centerY - childrenTotalHeight / 2;

      for (const child of tn.children) {
        const childCenterY = childStartY + child.subtreeHeight / 2;
        positionSubtree(child, direction === 1 ? x + tn.width / 2 : x - tn.width / 2, childCenterY);
        childStartY += child.subtreeHeight + VERTICAL_GAP;
      }
    }

    for (const tree of subtrees) {
      const centerY = startY + tree.subtreeHeight / 2;
      const startX = direction === 1 ? rootDim.width / 2 : -rootDim.width / 2;
      positionSubtree(tree, startX, centerY);
      startY += tree.subtreeHeight + VERTICAL_GAP;
    }
  }

  layoutDirection(rightChildIds, 1);
  layoutDirection(leftChildIds, -1);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return { ...node, position: pos };
    }
    return node;
  });
}

/**
 * 2. Horizontal Tree (Left to Right)
 */
export function layoutHorizontalTree(
  nodes: MapNodeItem[],
  edges: MapEdgeItem[]
): MapNodeItem[] {
  if (nodes.length <= 1) return nodes;
  const root = findRootNode(nodes, edges);
  if (!root) return nodes;

  const nodeMap = new Map<string, MapNodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const rootTree = buildHierarchyTree(root.id, nodeMap, edges, 0);
  if (!rootTree) return nodes;

  const positions = new Map<string, { x: number; y: number }>();

  function positionNode(tn: TreeNode, currentX: number, centerY: number) {
    positions.set(tn.id, { x: currentX, y: centerY - tn.height / 2 });

    if (tn.children.length === 0) return;

    const childrenTotalHeight = tn.children.reduce(
      (sum, c, i) => sum + c.subtreeHeight + (i > 0 ? VERTICAL_GAP : 0),
      0
    );
    let childStartY = centerY - childrenTotalHeight / 2;

    const nextX = currentX + tn.width + HORIZONTAL_GAP;
    for (const child of tn.children) {
      const childCenterY = childStartY + child.subtreeHeight / 2;
      positionNode(child, nextX, childCenterY);
      childStartY += child.subtreeHeight + VERTICAL_GAP;
    }
  }

  positionNode(rootTree, 0, 0);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * 3. Vertical Tree (Top to Bottom)
 */
export function layoutVerticalTree(
  nodes: MapNodeItem[],
  edges: MapEdgeItem[]
): MapNodeItem[] {
  if (nodes.length <= 1) return nodes;
  const root = findRootNode(nodes, edges);
  if (!root) return nodes;

  const nodeMap = new Map<string, MapNodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const rootTree = buildHierarchyTree(root.id, nodeMap, edges, 0);
  if (!rootTree) return nodes;

  // In vertical tree, compute subtree widths
  function computeSubtreeWidth(tn: TreeNode): number {
    if (tn.children.length === 0) return tn.width;
    const childrenWidth = tn.children.reduce(
      (sum, c, i) => sum + computeSubtreeWidth(c) + (i > 0 ? 36 : 0),
      0
    );
    return Math.max(tn.width, childrenWidth);
  }

  const subtreeWidths = new Map<string, number>();
  function calculateWidths(tn: TreeNode) {
    const w = computeSubtreeWidth(tn);
    subtreeWidths.set(tn.id, w);
    tn.children.forEach(calculateWidths);
  }
  calculateWidths(rootTree);

  const positions = new Map<string, { x: number; y: number }>();

  function positionVertical(tn: TreeNode, centerX: number, currentY: number) {
    positions.set(tn.id, { x: centerX - tn.width / 2, y: currentY });

    if (tn.children.length === 0) return;

    const totalWidth = subtreeWidths.get(tn.id) || tn.width;
    let childStartX = centerX - totalWidth / 2;
    const nextY = currentY + tn.height + 70;

    for (const child of tn.children) {
      const childWidth = subtreeWidths.get(child.id) || child.width;
      const childCenterX = childStartX + childWidth / 2;
      positionVertical(child, childCenterX, nextY);
      childStartX += childWidth + 36;
    }
  }

  positionVertical(rootTree, 0, 0);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * 4. Radial Map Layout (Concentric Orbits)
 */
export function layoutRadialMap(
  nodes: MapNodeItem[],
  edges: MapEdgeItem[]
): MapNodeItem[] {
  if (nodes.length <= 1) return nodes;
  const root = findRootNode(nodes, edges);
  if (!root) return nodes;

  const nodeMap = new Map<string, MapNodeItem>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(root.id, { x: 0, y: 0 });

  function countLeaves(nodeId: string, visited = new Set<string>()): number {
    visited.add(nodeId);
    const childIds = edges.filter((e) => e.source === nodeId && !visited.has(e.target)).map((e) => e.target);
    if (childIds.length === 0) return 1;
    return childIds.reduce((sum, c) => sum + countLeaves(c, visited), 0);
  }

  const topLevelChildren = edges.filter((e) => e.source === root!.id).map((e) => e.target);
  if (topLevelChildren.length === 0) return nodes;

  const totalLeaves = topLevelChildren.reduce((sum, id) => sum + countLeaves(id), 0);

  function layoutSubtree(
    nodeId: string,
    startAngle: number,
    endAngle: number,
    depth: number,
    visited: Set<string>
  ) {
    visited.add(nodeId);
    const midAngle = (startAngle + endAngle) / 2;
    const radius = depth * 220;
    const x = Math.round(radius * Math.cos(midAngle));
    const y = Math.round(radius * Math.sin(midAngle));

    const dim = estimateNodeDimensions(nodeMap.get(nodeId)!);
    positions.set(nodeId, { x: x - dim.width / 2, y: y - dim.height / 2 });

    const children = edges.filter((e) => e.source === nodeId && !visited.has(e.target)).map((e) => e.target);
    if (children.length === 0) return;

    const childLeaves = children.map((c) => countLeaves(c));
    const totalChildLeaves = childLeaves.reduce((a, b) => a + b, 0);

    let currentAngle = startAngle;
    const angleRange = endAngle - startAngle;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const slice = (childLeaves[i] / totalChildLeaves) * angleRange;
      layoutSubtree(child, currentAngle, currentAngle + slice, depth + 1, visited);
      currentAngle += slice;
    }
  }

  let currentAngle = 0;
  const visited = new Set<string>([root.id]);
  for (const childId of topLevelChildren) {
    const leaves = countLeaves(childId);
    const slice = (leaves / totalLeaves) * (2 * Math.PI);
    layoutSubtree(childId, currentAngle, currentAngle + slice, 1, visited);
    currentAngle += slice;
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * Universal Layout Dispatcher
 */
export function applyLayout(
  nodes: MapNodeItem[],
  edges: MapEdgeItem[],
  layout: MindMapLayout
): MapNodeItem[] {
  switch (layout) {
    case "balanced":
      return layoutBalancedMindMap(nodes, edges);
    case "horizontal":
    case "tree":
      return layoutHorizontalTree(nodes, edges);
    case "vertical":
      return layoutVerticalTree(nodes, edges);
    case "radial":
      return layoutRadialMap(nodes, edges);
    case "freeform":
    default:
      return nodes;
  }
}
