"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
  type OnNodeDrag,
  type ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng, toSvg, toJpeg } from "html-to-image";
import { Link2 } from "lucide-react";

import type {
  MapEdgeItem,
  MapNodeItem,
  MindMapLayout,
  MindMapTheme,
  TaskItem,
  NoteItem,
} from "./types";
import {
  applyLayout,
  calculateNonDisruptiveNodePosition,
  checkNodeOverlap,
  createPdfFromJpeg,
  estimateNodeDimensions,
  findRootNode,
  generateEdgeId,
  generateNodeId,
  getChildrenIds,
  getParentId,
  getSubtreeNodeIds,
  willCreateCycle,
} from "./utils/mind-map-utils";
import { THEME_CONFIGS } from "./mind-map/theme-tokens";
import {
  MindMapNode,
  type FlowNodeData,
  type MindFlowNode,
} from "./mind-map/mind-map-node";
import { MindMapToolbar } from "./mind-map/mind-map-toolbar";
import {
  NodeNoteDialog,
  NodeLinkDialog,
  NodeDeleteDialog,
} from "./mind-map/mind-map-dialogs";

interface HistoryState {
  nodes: MindFlowNode[];
  edges: Edge[];
}

export interface MindMapCanvasProps {
  nodes: MapNodeItem[];
  edges: MapEdgeItem[];
  onSave: (nodes: MapNodeItem[], edges: MapEdgeItem[]) => void;
  theme?: MindMapTheme;
  layout?: MindMapLayout;
  onThemeChange?: (theme: MindMapTheme) => void;
  onLayoutChange?: (layout: MindMapLayout) => void;
  availableTasks?: TaskItem[];
  availableNotes?: NoteItem[];
}

export function MindMapCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onSave,
  theme = "calm",
  layout = "balanced",
  onThemeChange,
  onLayoutChange,
  availableTasks = [],
  availableNotes = [],
}: MindMapCanvasProps) {
  const [currentTheme, setCurrentTheme] = useState<MindMapTheme>(theme);
  const [currentLayout, setCurrentLayout] = useState<MindMapLayout>(layout);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [hoveredDropTargetId, setHoveredDropTargetId] = useState<string | null>(null);

  // Dialog states
  const [noteDialogNodeId, setNoteDialogNodeId] = useState<string | null>(null);
  const [linkDialogNodeId, setLinkDialogNodeId] = useState<string | null>(null);
  const [deleteConfirmNodeId, setDeleteConfirmNodeId] = useState<string | null>(null);

  const isHistoryActionRef = useRef(false);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<MindFlowNode, Edge> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeConfig = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.calm;

  // Initialize Flow Nodes
  const initializeFlowNodes = useCallback(
    (inputNodes: MapNodeItem[]): MindFlowNode[] => {
      const rootNode = findRootNode(inputNodes, initialEdges);
      return inputNodes.map((n) => ({
        id: n.id,
        type: "mind",
        position: n.position || { x: 0, y: 0 },
        data: {
          ...n.data,
          isRoot: n.id === rootNode?.id,
          theme: currentTheme,
        },
      }));
    },
    [currentTheme, initialEdges]
  );

  const [nodes, setNodes] = useState<MindFlowNode[]>(() =>
    initializeFlowNodes(initialNodes)
  );

  const [edges, setEdges] = useState<Edge[]>(() =>
    initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: Boolean(e.animated),
      label: e.label,
      style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
    }))
  );

  // Undo / Redo history stacks (initialized with initial graph snapshot)
  const [history, setHistory] = useState<HistoryState[]>(() => [
    { nodes, edges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync with prop updates
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    setCurrentLayout(layout);
  }, [layout]);

  // Compute children count map for collapse indicators
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      map.set(edge.source, (map.get(edge.source) || 0) + 1);
    }
    return map;
  }, [edges]);

  // 10. Collapse / Expand: compute all descendants that should be hidden
  const collapsedHiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    const treeEdges = edges.filter((e) => e.label !== "relates to");

    for (const node of nodes) {
      if (node.data.collapsed) {
        const descendants = getSubtreeNodeIds(node.id, treeEdges);
        for (const descId of descendants) {
          if (descId !== node.id) {
            hidden.add(descId);
          }
        }
      }
    }
    return hidden;
  }, [edges, nodes]);

  const displayNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      hidden: collapsedHiddenNodeIds.has(n.id),
    }));
  }, [nodes, collapsedHiddenNodeIds]);

  const displayEdges = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      hidden: collapsedHiddenNodeIds.has(e.source) || collapsedHiddenNodeIds.has(e.target),
    }));
  }, [edges, collapsedHiddenNodeIds]);

  // Record history snapshot
  const pushHistory = useCallback(
    (newNodes: MindFlowNode[], newEdges: Edge[]) => {
      if (isHistoryActionRef.current) return;
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { nodes: newNodes, edges: newEdges }].slice(-50);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Autosave callback
  const triggerSave = useCallback(
    (currentNodes: MindFlowNode[], currentEdges: Edge[]) => {
      const serializedNodes: MapNodeItem[] = currentNodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: {
          label: n.data.label,
          color: n.data.color,
          shape: n.data.shape,
          icon: n.data.icon,
          note: n.data.note,
          collapsed: n.data.collapsed,
          linkedTaskId: n.data.linkedTaskId,
          linkedNoteId: n.data.linkedNoteId,
          externalUrl: n.data.externalUrl,
          fontSize: n.data.fontSize,
          isRoot: n.data.isRoot,
        },
        type: "mind",
      }));

      const serializedEdges: MapEdgeItem[] = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: Boolean(e.animated),
        label: typeof e.label === "string" ? e.label : undefined,
        type: e.type || "smoothstep",
      }));

      onSave(serializedNodes, serializedEdges);
    },
    [onSave]
  );

  // Layout runner
  const applyLayoutToGraph = useCallback(
    (
      targetLayout: MindMapLayout,
      currentNodes: MindFlowNode[],
      currentEdges: Edge[]
    ): MindFlowNode[] => {
      if (targetLayout === "freeform") return currentNodes;

      const items: MapNodeItem[] = currentNodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: n.data,
      }));
      const edgeItems: MapEdgeItem[] = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      const laidOut = applyLayout(items, edgeItems, targetLayout);
      const posMap = new Map(laidOut.map((n) => [n.id, n.position]));

      return currentNodes.map((node) => ({
        ...node,
        position: posMap.get(node.id) || node.position,
      }));
    },
    []
  );

  // Node Mutations
  const updateNodeLabel = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((curr) => {
        const next = curr.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        pushHistory(next, edges);
        triggerSave(next, edges);
        return next;
      });
    },
    [edges, pushHistory, triggerSave]
  );

  const addChildNode = useCallback(
    (parentId?: string) => {
      const rootNode = findRootNode(nodes, edges);
      const targetParentId = parentId || selectedNodeId || rootNode?.id || nodes[0]?.id;
      if (!targetParentId) return;

      const nextId = generateNodeId();
      const nextEdgeId = generateEdgeId();
      const parentNode = nodes.find((n) => n.id === targetParentId);
      if (!parentNode) return;

      const calculatedPos = calculateNonDisruptiveNodePosition({
        type: "child",
        targetNodeId: targetParentId,
        nodes,
        edges,
        layout: currentLayout,
      });

      const newNode: MindFlowNode = {
        id: nextId,
        type: "mind",
        selected: true,
        position: calculatedPos,
        data: {
          label: "New topic",
          color: parentNode?.data.color || "blue",
          shape: "rounded",
          fontSize: "base",
          theme: currentTheme,
        },
      };

      const newEdge: Edge = {
        id: nextEdgeId,
        source: targetParentId,
        target: nextId,
        type: "smoothstep",
        style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
      };

      const unselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
      const nextNodes = [...unselectedNodes, newNode];
      const nextEdges = [...edges, newEdge];

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextId);
      setEditingNodeId(nextId);

      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [
      selectedNodeId,
      nodes,
      edges,
      currentTheme,
      themeConfig.edgeStroke,
      currentLayout,
      pushHistory,
      triggerSave,
    ]
  );

  const addSiblingNode = useCallback(
    (siblingId?: string) => {
      const rootNode = findRootNode(nodes, edges);
      const targetSiblingId = siblingId || selectedNodeId || rootNode?.id || nodes[0]?.id;
      if (!targetSiblingId) return;

      // If target is root, add child instead
      if (targetSiblingId === rootNode?.id) {
        addChildNode(targetSiblingId);
        return;
      }

      const parentEdge = edges.find((e) => e.target === targetSiblingId && e.label !== "relates to");
      const parentId = parentEdge?.source;

      if (!parentId) {
        // If node has no parent, add child instead
        addChildNode(targetSiblingId);
        return;
      }

      const nextId = generateNodeId();
      const nextEdgeId = generateEdgeId();
      const siblingNode = nodes.find((n) => n.id === targetSiblingId);

      const calculatedPos = calculateNonDisruptiveNodePosition({
        type: "sibling",
        targetNodeId: targetSiblingId,
        nodes,
        edges,
        layout: currentLayout,
      });

      const newNode: MindFlowNode = {
        id: nextId,
        type: "mind",
        selected: true,
        position: calculatedPos,
        data: {
          label: "New topic",
          color: siblingNode?.data.color || "mint",
          shape: siblingNode?.data.shape || "rounded",
          fontSize: "base",
          theme: currentTheme,
        },
      };

      const newEdge: Edge = {
        id: nextEdgeId,
        source: parentId,
        target: nextId,
        type: "smoothstep",
        style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
      };

      const unselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
      const nextNodes = [...unselectedNodes, newNode];
      const nextEdges = [...edges, newEdge];

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextId);
      setEditingNodeId(nextId);

      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [
      selectedNodeId,
      nodes,
      edges,
      addChildNode,
      currentTheme,
      themeConfig.edgeStroke,
      currentLayout,
      pushHistory,
      triggerSave,
    ]
  );

  const startConnecting = useCallback((sourceId: string) => {
    setConnectingSourceId(sourceId);
  }, []);

  const cancelConnecting = useCallback(() => {
    setConnectingSourceId(null);
  }, []);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: MindFlowNode) => {
      if (connectingSourceId) {
        if (connectingSourceId === node.id) {
          setConnectingSourceId(null);
          return;
        }

        const exists = edges.some(
          (e) =>
            (e.source === connectingSourceId && e.target === node.id) ||
            (e.source === node.id && e.target === connectingSourceId)
        );

        if (!exists) {
          const newEdge: Edge = {
            id: generateEdgeId(),
            source: connectingSourceId,
            target: node.id,
            type: "smoothstep",
            style: {
              stroke: themeConfig.edgeStroke,
              strokeWidth: 2,
              strokeDasharray: "5 5",
            },
            label: "relates to",
          };

          const nextEdges = [...edges, newEdge];
          setEdges(nextEdges);
          pushHistory(nodes, nextEdges);
          triggerSave(nodes, nextEdges);
        }

        setConnectingSourceId(null);
        setSelectedNodeId(node.id);
        return;
      }

      setSelectedNodeId(node.id);
    },
    [connectingSourceId, edges, nodes, pushHistory, themeConfig.edgeStroke, triggerSave]
  );


  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodes.find((n) => n.id === nodeId);
      if (!source) return;

      const nextId = generateNodeId();
      const parentId = getParentId(nodeId, edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));

      const dim = estimateNodeDimensions(source);
      const candX = source.position.x + 30;
      let candY = source.position.y + 60;
      let step = 1;
      const testCol = (x: number, y: number) =>
        nodes.some((n) =>
          checkNodeOverlap(
            { x, y, width: dim.width, height: dim.height },
            { x: n.position.x, y: n.position.y, width: dim.width, height: dim.height },
            16,
            12
          )
        );
      while (testCol(candX, candY) && step <= 50) {
        candY += 40;
        step++;
      }

      const duplicate: MindFlowNode = {
        id: nextId,
        type: "mind",
        selected: true,
        position: {
          x: candX,
          y: candY,
        },
        data: {
          ...source.data,
          label: `${source.data.label} (Copy)`,
          isRoot: false,
        },
      };

      const unselected = nodes.map((n) => ({ ...n, selected: false }));
      const nextNodes = [...unselected, duplicate];
      const nextEdges = [...edges];

      if (parentId) {
        nextEdges.push({
          id: generateEdgeId(),
          source: parentId,
          target: nextId,
          type: "smoothstep",
          style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
        });
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextId);

      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [nodes, edges, themeConfig.edgeStroke, pushHistory, triggerSave]
  );

  const deleteNodeSafely = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.data.isRoot) {
        // Prevent deleting root without resetting map
        return;
      }

      const childIds = getChildrenIds(nodeId, edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));
      if (childIds.length > 0) {
        setDeleteConfirmNodeId(nodeId);
      } else {
        // Delete leaf directly without rearranging existing nodes
        const nextNodes = nodes.filter((n) => n.id !== nodeId);
        const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

        setNodes(nextNodes);
        setEdges(nextEdges);
        setSelectedNodeId(null);
        pushHistory(nextNodes, nextEdges);
        triggerSave(nextNodes, nextEdges);
      }
    },
    [nodes, edges, pushHistory, triggerSave]
  );

  const deleteEntireBranch = useCallback(
    (nodeId: string) => {
      const subtreeIds = getSubtreeNodeIds(
        nodeId,
        edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
      );

      const nextNodes = nodes.filter((n) => !subtreeIds.has(n.id));
      const nextEdges = edges.filter(
        (e) => !subtreeIds.has(e.source) && !subtreeIds.has(e.target)
      );

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [nodes, edges, pushHistory, triggerSave]
  );

  const deleteNodeKeepChildren = useCallback(
    (nodeId: string) => {
      const edgeItems = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
      const parentId = getParentId(nodeId, edgeItems);
      const childIds = getChildrenIds(nodeId, edgeItems);

      const nextNodes = nodes.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

      // Reparent children to parent node if parent exists
      if (parentId) {
        for (const childId of childIds) {
          nextEdges.push({
            id: generateEdgeId(),
            source: parentId,
            target: childId,
            type: "smoothstep",
            style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
          });
        }
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [nodes, edges, themeConfig.edgeStroke, pushHistory, triggerSave]
  );

  const changeNodeColor = useCallback(
    (nodeId: string, color: string) => {
      setNodes((curr) => {
        const next = curr.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, color } } : n
        );
        pushHistory(next, edges);
        triggerSave(next, edges);
        return next;
      });
    },
    [edges, pushHistory, triggerSave]
  );

  const changeNodeShape = useCallback(
    (nodeId: string, shape: "rounded" | "pill" | "rectangle" | "diamond" | "circle") => {
      setNodes((curr) => {
        const next = curr.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, shape } } : n
        );
        pushHistory(next, edges);
        triggerSave(next, edges);
        return next;
      });
    },
    [edges, pushHistory, triggerSave]
  );

  const toggleBranchCollapse = useCallback(
    (nodeId: string) => {
      setNodes((curr) => {
        const target = curr.find((n) => n.id === nodeId);
        if (!target) return curr;
        const nextCollapsed = !target.data.collapsed;

        const next = curr.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, collapsed: nextCollapsed } } : n
        );
        pushHistory(next, edges);
        triggerSave(next, edges);
        return next;
      });
    },
    [edges, pushHistory, triggerSave]
  );

  // Undo / Redo Execution
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    isHistoryActionRef.current = true;
    const previous = history[historyIndex - 1];
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistoryIndex((prev) => prev - 1);
    triggerSave(previous.nodes, previous.edges);
    isHistoryActionRef.current = false;
  }, [history, historyIndex, triggerSave]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isHistoryActionRef.current = true;
    const next = history[historyIndex + 1];
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryIndex((prev) => prev + 1);
    triggerSave(next.nodes, next.edges);
    isHistoryActionRef.current = false;
  }, [history, historyIndex, triggerSave]);

  // Layout style preference switcher (sets preferred style without rearranging existing nodes)
  const handleLayoutChange = useCallback(
    (newLayout: MindMapLayout) => {
      setCurrentLayout(newLayout);
      onLayoutChange?.(newLayout);
    },
    [onLayoutChange]
  );

  // Dedicated Auto Arrange Runner (explicitly organizes entire mind map into clean hierarchy)
  const handleAutoArrange = useCallback(
    (explicitLayout?: MindMapLayout) => {
      const layoutToUse = explicitLayout || (currentLayout === "freeform" ? "balanced" : currentLayout);
      const laidOut = applyLayoutToGraph(layoutToUse, nodes, edges);
      setNodes(laidOut);
      pushHistory(laidOut, edges);
      triggerSave(laidOut, edges);

      setTimeout(() => {
        reactFlowInstance?.fitView({ duration: 400, padding: 0.2 });
      }, 50);
    },
    [applyLayoutToGraph, currentLayout, edges, nodes, pushHistory, reactFlowInstance, triggerSave]
  );

  // Theme switcher
  const handleThemeChange = useCallback(
    (newTheme: MindMapTheme) => {
      setCurrentTheme(newTheme);
      onThemeChange?.(newTheme);
      const updatedNodes = nodes.map((n) => ({
        ...n,
        data: { ...n.data, theme: newTheme },
      }));
      setNodes(updatedNodes);
      triggerSave(updatedNodes, edges);
    },
    [edges, nodes, onThemeChange, triggerSave]
  );

  // React Flow Handlers
  const onNodesChange = useCallback(
    (changes: NodeChange<MindFlowNode>[]) => {
      setNodes((curr) => {
        const next = applyNodeChanges(changes, curr);
        const hasPositionChange = changes.some(
          (c) => c.type === "position" && !c.dragging
        );
        if (hasPositionChange) {
          triggerSave(next, edges);
        }
        return next;
      });
    },
    [edges, triggerSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((curr) => {
        const next = applyEdgeChanges(changes, curr);
        const hasRemoval = changes.some((c) => c.type === "remove");
        if (hasRemoval) {
          triggerSave(nodes, next);
          pushHistory(nodes, next);
        }
        return next;
      });
    },
    [nodes, pushHistory, triggerSave]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Cycle prevention
      const edgeItems = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
      if (willCreateCycle(connection.source, connection.target, edgeItems)) {
        return;
      }

      const newEdge: Edge = {
        id: generateEdgeId(),
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
      };

      setEdges((curr) => {
        const next = addEdge(newEdge, curr);
        pushHistory(nodes, next);
        triggerSave(nodes, next);
        return next;
      });
    },
    [edges, nodes, pushHistory, themeConfig.edgeStroke, triggerSave]
  );

  // 5. Drag & Drop Reparenting Handlers (with Cycle Prevention & Target Highlighting)
  const handleNodeDrag: OnNodeDrag<MindFlowNode> = useCallback(
    (_event, draggedNode) => {
      if (draggedNode.data.isRoot) {
        if (hoveredDropTargetId) setHoveredDropTargetId(null);
        return;
      }

      const treeEdges = edges.filter((e) => e.label !== "relates to");
      const draggedDim = estimateNodeDimensions(draggedNode);
      const draggedRect = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
        width: draggedDim.width,
        height: draggedDim.height,
      };

      let foundTargetId: string | null = null;

      for (const candidate of nodes) {
        if (candidate.id === draggedNode.id) continue;
        if (collapsedHiddenNodeIds.has(candidate.id)) continue;
        if (willCreateCycle(candidate.id, draggedNode.id, treeEdges)) continue;

        const candDim = estimateNodeDimensions(candidate);
        const candRect = {
          x: candidate.position.x,
          y: candidate.position.y,
          width: candDim.width,
          height: candDim.height,
        };

        if (checkNodeOverlap(draggedRect, candRect, 10, 10)) {
          foundTargetId = candidate.id;
          break;
        }
      }

      if (foundTargetId !== hoveredDropTargetId) {
        setHoveredDropTargetId(foundTargetId);
      }
    },
    [collapsedHiddenNodeIds, edges, hoveredDropTargetId, nodes]
  );

  const handleNodeDragStop: OnNodeDrag<MindFlowNode> = useCallback(
    (_event, draggedNode) => {
      if (hoveredDropTargetId && !draggedNode.data.isRoot) {
        const targetParentId = hoveredDropTargetId;
        setHoveredDropTargetId(null);

        const treeEdges = edges.filter((e) => e.label !== "relates to");
        if (
          targetParentId !== draggedNode.id &&
          !willCreateCycle(targetParentId, draggedNode.id, treeEdges)
        ) {
          // Remove old parent tree edge targeting draggedNode.id
          const nextEdges = edges.filter(
            (e) => !(e.target === draggedNode.id && e.label !== "relates to")
          );

          // Add new tree edge from targetParentId to draggedNode.id
          const newEdge: Edge = {
            id: generateEdgeId(),
            source: targetParentId,
            target: draggedNode.id,
            type: "smoothstep",
            style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
          };
          nextEdges.push(newEdge);

          const nextNodes = nodes.map((n) =>
            n.id === draggedNode.id ? { ...n, position: draggedNode.position } : n
          );

          setNodes(nextNodes);
          setEdges(nextEdges);
          pushHistory(nextNodes, nextEdges);
          triggerSave(nextNodes, nextEdges);
          return;
        }
      }

      setHoveredDropTargetId(null);
    },
    [edges, hoveredDropTargetId, nodes, pushHistory, themeConfig.edgeStroke, triggerSave]
  );

  // Search & Navigation
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = nodes.filter((n) => n.data.label.toLowerCase().includes(q)).map((n) => n.id);
    setSearchMatches(matches);
    setCurrentMatchIndex(0);

    if (matches[0] && reactFlowInstance) {
      const matchNode = nodes.find((n) => n.id === matches[0]);
      if (matchNode) {
        reactFlowInstance.setCenter(matchNode.position.x + 90, matchNode.position.y + 25, {
          zoom: 1.2,
          duration: 300,
        });
      }
    }
  }, [nodes, reactFlowInstance, searchQuery]);

  const nextSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    const targetId = searchMatches[nextIdx];
    const matchNode = nodes.find((n) => n.id === targetId);
    if (matchNode && reactFlowInstance) {
      reactFlowInstance.setCenter(matchNode.position.x + 90, matchNode.position.y + 25, {
        zoom: 1.2,
        duration: 300,
      });
    }
  }, [currentMatchIndex, nodes, reactFlowInstance, searchMatches]);

  const prevSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    const targetId = searchMatches[prevIdx];
    const matchNode = nodes.find((n) => n.id === targetId);
    if (matchNode && reactFlowInstance) {
      reactFlowInstance.setCenter(matchNode.position.x + 90, matchNode.position.y + 25, {
        zoom: 1.2,
        duration: 300,
      });
    }
  }, [currentMatchIndex, nodes, reactFlowInstance, searchMatches]);

  // Viewport Helpers
  const handleZoomIn = () => reactFlowInstance?.zoomIn({ duration: 250 });
  const handleZoomOut = () => reactFlowInstance?.zoomOut({ duration: 250 });
  const handleFitView = () => reactFlowInstance?.fitView({ duration: 350 });
  const handleCenterRoot = () => {
    const root = nodes.find((n) => n.data.isRoot) || nodes[0];
    if (root && reactFlowInstance) {
      reactFlowInstance.setCenter(root.position.x + 90, root.position.y + 25, {
        zoom: 1,
        duration: 350,
      });
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        addChildNode();
      } else if (e.key === "Enter") {
        e.preventDefault();
        addSiblingNode();
      } else if (e.key === "F2" || (e.key === " " && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        if (selectedNodeId) {
          setEditingNodeId(selectedNodeId);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNodeSafely(selectedNodeId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedNodeId) {
          duplicateNode(selectedNodeId);
        }
      } else if (e.key === "Escape") {
        if (connectingSourceId) {
          setConnectingSourceId(null);
        } else {
          setSelectedNodeId(null);
          setEditingNodeId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    addChildNode,
    addSiblingNode,
    connectingSourceId,
    deleteNodeSafely,
    duplicateNode,
    handleRedo,
    handleUndo,
    selectedNodeId,
  ]);


  // Export handlers
  const exportPng = async () => {
    if (!containerRef.current || !reactFlowInstance) return;
    const viewportElem = containerRef.current.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportElem) return;

    try {
      const bounds = getNodesBounds(nodes);
      const viewport = getViewportForBounds(
        bounds,
        bounds.width + 100,
        bounds.height + 100,
        0.5,
        2,
        0.1
      );

      const dataUrl = await toPng(viewportElem, {
        backgroundColor: themeConfig.canvasBg,
        pixelRatio: 2,
        width: bounds.width + 120,
        height: bounds.height + 120,
        style: {
          width: `${bounds.width + 120}px`,
          height: `${bounds.height + 120}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });

      const a = document.createElement("a");
      a.download = `minddesk-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      // Fallback export viewport
      const dataUrl = await toPng(viewportElem, {
        backgroundColor: themeConfig.canvasBg,
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.download = `minddesk-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    }
  };

  const exportSvg = async () => {
    if (!containerRef.current) return;
    const viewportElem = containerRef.current.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportElem) return;

    try {
      const dataUrl = await toSvg(viewportElem, {
        backgroundColor: themeConfig.canvasBg,
      });
      const a = document.createElement("a");
      a.download = `minddesk-${Date.now()}.svg`;
      a.href = dataUrl;
      a.click();
    } catch {
      // Fallback
    }
  };

  const exportPdf = async () => {
    if (!containerRef.current) return;
    const viewportElem = containerRef.current.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportElem) return;

    try {
      const bounds = getNodesBounds(nodes);
      const width = Math.max(bounds.width + 120, 800);
      const height = Math.max(bounds.height + 120, 600);

      const dataUrl = await toJpeg(viewportElem, {
        backgroundColor: themeConfig.canvasBg,
        quality: 0.95,
      });

      const base64 = dataUrl.split(",")[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pdfBlob = createPdfFromJpeg(bytes, width, height);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.download = `minddesk-${Date.now()}.pdf`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
    }
  };

  const exportJson = () => {
    const payload = {
      app: "MindDesk",
      version: 1,
      theme: currentTheme,
      layout: currentLayout,
      nodes: nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated,
        label: e.label,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `minddesk-map-${Date.now()}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          const importedNodes = initializeFlowNodes(parsed.nodes);
          const importedEdges = parsed.edges.map((edge: MapEdgeItem) => ({
            id: edge.id || generateEdgeId(),
            source: edge.source,
            target: edge.target,
            type: "smoothstep",
            animated: Boolean(edge.animated),
            style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
          }));

          setNodes(importedNodes);
          setEdges(importedEdges);
          pushHistory(importedNodes, importedEdges);
          triggerSave(importedNodes, importedEdges);
          setTimeout(() => reactFlowInstance?.fitView({ duration: 350 }), 50);
        }
      } catch {
        // Ignore parse error
      }
    };
    reader.readAsText(file);
  };

  // Node types registration: supports "mind", "idea", "task_ref", "note_ref", "group", "default"
  const nodeTypes = useMemo(
    () => ({
      mind: (props: NodeProps<MindFlowNode>) => (
        <MindMapNode
          {...props}
          data={{
            ...props.data,
            isSelected: selectedNodeId === props.id,
            isConnectingSource: connectingSourceId === props.id,
            isDropTarget: hoveredDropTargetId === props.id,
            externalUrl: props.data.externalUrl,
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
            onStartConnecting: startConnecting,
            onChangeColor: changeNodeColor,
            onChangeShape: changeNodeShape,
            onToggleCollapse: toggleBranchCollapse,
            onOpenNoteEditor: (nodeId) => setNoteDialogNodeId(nodeId),
            onOpenLinkModal: (nodeId) => setLinkDialogNodeId(nodeId),
            onOpenIconPicker: (emoji) => {
              setNodes((curr) => {
                const next = curr.map((n) =>
                  n.id === props.id ? { ...n, data: { ...n.data, icon: emoji } } : n
                );
                pushHistory(next, edges);
                triggerSave(next, edges);
                return next;
              });
            },
            setEditingNodeId,
          }}
        />
      ),
      idea: (props: NodeProps<MindFlowNode>) => (
        <MindMapNode
          {...props}
          data={{
            ...props.data,
            isSelected: selectedNodeId === props.id,
            isConnectingSource: connectingSourceId === props.id,
            isDropTarget: hoveredDropTargetId === props.id,
            externalUrl: props.data.externalUrl,
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
            onStartConnecting: startConnecting,
            onChangeColor: changeNodeColor,
            onChangeShape: changeNodeShape,
            onToggleCollapse: toggleBranchCollapse,
            onOpenNoteEditor: (nodeId) => setNoteDialogNodeId(nodeId),
            onOpenLinkModal: (nodeId) => setLinkDialogNodeId(nodeId),
            onOpenIconPicker: (emoji) => {
              setNodes((curr) => {
                const next = curr.map((n) =>
                  n.id === props.id ? { ...n, data: { ...n.data, icon: emoji } } : n
                );
                pushHistory(next, edges);
                triggerSave(next, edges);
                return next;
              });
            },
            setEditingNodeId,
          }}
        />
      ),
      default: (props: NodeProps<MindFlowNode>) => (
        <MindMapNode
          {...props}
          data={{
            ...props.data,
            isSelected: selectedNodeId === props.id,
            isConnectingSource: connectingSourceId === props.id,
            isDropTarget: hoveredDropTargetId === props.id,
            externalUrl: props.data.externalUrl,
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
            onStartConnecting: startConnecting,
            onChangeColor: changeNodeColor,
            onChangeShape: changeNodeShape,
            onToggleCollapse: toggleBranchCollapse,
            onOpenNoteEditor: (nodeId) => setNoteDialogNodeId(nodeId),
            onOpenLinkModal: (nodeId) => setLinkDialogNodeId(nodeId),
            setEditingNodeId,
          }}
        />
      ),
    }),
    [
      addChildNode,
      addSiblingNode,
      changeNodeColor,
      changeNodeShape,
      childCountMap,
      connectingSourceId,
      deleteNodeSafely,
      duplicateNode,
      edges,
      editingNodeId,
      hoveredDropTargetId,
      pushHistory,
      searchMatches,
      selectedNodeId,
      startConnecting,
      toggleBranchCollapse,
      triggerSave,
      updateNodeLabel,
    ]
  );

  const activeNoteNode = nodes.find((n) => n.id === noteDialogNodeId);
  const activeLinkNode = nodes.find((n) => n.id === linkDialogNodeId);
  const activeDeleteNode = nodes.find((n) => n.id === deleteConfirmNodeId);

  return (
    <div
      ref={containerRef}
      data-testid="mind-map-canvas-container"
      data-theme={currentTheme}
      className={`relative w-full h-[calc(100vh-14rem)] min-h-[550px] rounded-2xl border overflow-hidden shadow-sm transition-colors duration-200 ${
        connectingSourceId ? "cursor-crosshair" : ""
      }`}
      style={{
        backgroundColor: themeConfig.canvasBg,
        borderColor: themeConfig.toolbarBorder,
      }}
    >
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importJson(file);
        }}
      />

      {/* Main Top Toolbar */}
      <MindMapToolbar
        theme={currentTheme}
        layout={currentLayout}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        searchQuery={searchQuery}
        matchCount={searchMatches.length}
        currentMatchIndex={currentMatchIndex}
        onThemeChange={handleThemeChange}
        onLayoutChange={handleLayoutChange}
        onAutoArrange={() => handleAutoArrange()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSearchChange={setSearchQuery}
        onNextMatch={nextSearchMatch}
        onPrevMatch={prevSearchMatch}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onCenterRoot={handleCenterRoot}
        onAddTopic={() => addChildNode()}
        onExportPng={exportPng}
        onExportSvg={exportSvg}
        onExportPdf={exportPdf}
        onExportJson={exportJson}
        onImportJson={() => fileInputRef.current?.click()}
      />

      {/* Floating Relationship Connecting Indicator Banner */}
      {connectingSourceId && (
        <div
          data-testid="relationship-connecting-banner"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-xl animate-in fade-in slide-in-from-top-2 border border-indigo-400/30"
        >
          <Link2 className="h-4 w-4 animate-pulse text-indigo-200" />
          <span className="text-xs font-medium">
            Connecting &ldquo;{nodes.find((n) => n.id === connectingSourceId)?.data.label || "topic"}&rdquo; &rarr; Click target topic
          </span>
          <button
            type="button"
            className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
            onClick={cancelConnecting}
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        nodesDraggable={true}
        panOnDrag={true}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onPaneClick={() => {
          setConnectingSourceId(null);
          setSelectedNodeId(null);
          setEditingNodeId(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: themeConfig.edgeStroke, strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={themeConfig.gridColor}
        />
        <Controls
          className="!bottom-4 !left-4 !bg-card/90 !border !rounded-xl !shadow-md backdrop-blur-sm"
          style={{ borderColor: themeConfig.toolbarBorder }}
          showInteractive={false}
        />
        <MiniMap
          className="!bottom-4 !right-4 !border !rounded-xl !shadow-md"
          style={{
            backgroundColor: themeConfig.minimapBg,
            borderColor: themeConfig.toolbarBorder,
          }}
          maskColor={themeConfig.minimapMask}
          nodeColor={(n) => {
            const nodeData = n.data as FlowNodeData;
            return themeConfig.colors[nodeData.color]?.accent || themeConfig.colors.violet.accent;
          }}
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Dialog 1: Note / Description Editor */}
      {activeNoteNode && (
        <NodeNoteDialog
          open={Boolean(noteDialogNodeId)}
          nodeLabel={activeNoteNode.data.label}
          initialNote={activeNoteNode.data.note || ""}
          onClose={() => setNoteDialogNodeId(null)}
          onSave={(noteText) => {
            setNodes((curr) => {
              const next = curr.map((n) =>
                n.id === activeNoteNode.id
                  ? { ...n, data: { ...n.data, note: noteText } }
                  : n
              );
              pushHistory(next, edges);
              triggerSave(next, edges);
              return next;
            });
          }}
        />
      )}

      {/* Dialog 2: Link to Task, Note or External URL */}
      {activeLinkNode && (
        <NodeLinkDialog
          open={Boolean(linkDialogNodeId)}
          nodeLabel={activeLinkNode.data.label}
          tasks={availableTasks}
          notes={availableNotes}
          currentTaskId={activeLinkNode.data.linkedTaskId}
          currentNoteId={activeLinkNode.data.linkedNoteId}
          currentExternalUrl={activeLinkNode.data.externalUrl}
          onClose={() => setLinkDialogNodeId(null)}
          onLinkTask={(taskId) => {
            setNodes((curr) => {
              const next = curr.map((n) =>
                n.id === activeLinkNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        linkedTaskId: taskId,
                        linkedNoteId: undefined,
                        externalUrl: undefined,
                      },
                    }
                  : n
              );
              pushHistory(next, edges);
              triggerSave(next, edges);
              return next;
            });
          }}
          onLinkNote={(noteId) => {
            setNodes((curr) => {
              const next = curr.map((n) =>
                n.id === activeLinkNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        linkedNoteId: noteId,
                        linkedTaskId: undefined,
                        externalUrl: undefined,
                      },
                    }
                  : n
              );
              pushHistory(next, edges);
              triggerSave(next, edges);
              return next;
            });
          }}
          onLinkUrl={(url) => {
            setNodes((curr) => {
              const next = curr.map((n) =>
                n.id === activeLinkNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        externalUrl: url,
                        linkedTaskId: undefined,
                        linkedNoteId: undefined,
                      },
                    }
                  : n
              );
              pushHistory(next, edges);
              triggerSave(next, edges);
              return next;
            });
          }}
          onUnlink={() => {
            setNodes((curr) => {
              const next = curr.map((n) =>
                n.id === activeLinkNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        linkedTaskId: undefined,
                        linkedNoteId: undefined,
                        externalUrl: undefined,
                      },
                    }
                  : n
              );
              pushHistory(next, edges);
              triggerSave(next, edges);
              return next;
            });
          }}
        />
      )}

      {/* Dialog 3: Delete Confirmation */}
      {activeDeleteNode && (
        <NodeDeleteDialog
          open={Boolean(deleteConfirmNodeId)}
          nodeLabel={activeDeleteNode.data.label}
          childCount={childCountMap.get(activeDeleteNode.id) || 0}
          onClose={() => setDeleteConfirmNodeId(null)}
          onDeleteBranch={() => deleteEntireBranch(activeDeleteNode.id)}
          onDeleteNodeKeepChildren={() => deleteNodeKeepChildren(activeDeleteNode.id)}
        />
      )}
    </div>
  );
}
