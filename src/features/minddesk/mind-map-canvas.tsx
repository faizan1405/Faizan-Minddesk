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
  type ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Dialog states
  const [noteDialogNodeId, setNoteDialogNodeId] = useState<string | null>(null);
  const [linkDialogNodeId, setLinkDialogNodeId] = useState<string | null>(null);
  const [deleteConfirmNodeId, setDeleteConfirmNodeId] = useState<string | null>(null);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
      const targetParentId = parentId || selectedNodeId || nodes[0]?.id;
      if (!targetParentId) return;

      const nextId = generateNodeId();
      const nextEdgeId = generateEdgeId();
      const parentNode = nodes.find((n) => n.id === targetParentId);

      const newNode: MindFlowNode = {
        id: nextId,
        type: "mind",
        position: {
          x: (parentNode?.position.x ?? 0) + 240,
          y: (parentNode?.position.y ?? 0) + 50,
        },
        data: {
          label: "New topic",
          color: "blue",
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

      let nextNodes = [...nodes, newNode];
      const nextEdges = [...edges, newEdge];

      if (currentLayout !== "freeform") {
        nextNodes = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextId);
      setEditingNodeId(nextId);

      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);

      setTimeout(() => {
        reactFlowInstance?.fitView({ duration: 300, maxZoom: 1.2 });
      }, 50);
    },
    [
      selectedNodeId,
      nodes,
      edges,
      currentTheme,
      themeConfig.edgeStroke,
      currentLayout,
      applyLayoutToGraph,
      pushHistory,
      triggerSave,
      reactFlowInstance,
    ]
  );

  const addSiblingNode = useCallback(
    (siblingId?: string) => {
      const targetSiblingId = siblingId || selectedNodeId || nodes[0]?.id;
      if (!targetSiblingId) return;

      const parentEdge = edges.find((e) => e.target === targetSiblingId);
      const parentId = parentEdge?.source;

      if (!parentId) {
        // If node has no parent (e.g. root), add child instead
        addChildNode(targetSiblingId);
        return;
      }

      const nextId = generateNodeId();
      const nextEdgeId = generateEdgeId();
      const siblingNode = nodes.find((n) => n.id === targetSiblingId);

      const newNode: MindFlowNode = {
        id: nextId,
        type: "mind",
        position: {
          x: (siblingNode?.position.x ?? 0) + 20,
          y: (siblingNode?.position.y ?? 0) + 60,
        },
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

      let nextNodes = [...nodes, newNode];
      const nextEdges = [...edges, newEdge];

      if (currentLayout !== "freeform") {
        nextNodes = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
      }

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
      applyLayoutToGraph,
      pushHistory,
      triggerSave,
    ]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodes.find((n) => n.id === nodeId);
      if (!source) return;

      const nextId = generateNodeId();
      const parentId = getParentId(nodeId, edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));

      const duplicate: MindFlowNode = {
        id: nextId,
        type: "mind",
        position: {
          x: source.position.x + 30,
          y: source.position.y + 60,
        },
        data: {
          ...source.data,
          label: `${source.data.label} (Copy)`,
          isRoot: false,
        },
      };

      let nextNodes = [...nodes, duplicate];
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

      if (currentLayout !== "freeform") {
        nextNodes = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextId);

      pushHistory(nextNodes, nextEdges);
      triggerSave(nextNodes, nextEdges);
    },
    [nodes, edges, themeConfig.edgeStroke, currentLayout, applyLayoutToGraph, pushHistory, triggerSave]
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
        // Delete leaf directly
        const nextNodes = nodes.filter((n) => n.id !== nodeId);
        const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

        let laidOut = nextNodes;
        if (currentLayout !== "freeform") {
          laidOut = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
        }

        setNodes(laidOut);
        setEdges(nextEdges);
        setSelectedNodeId(null);
        pushHistory(laidOut, nextEdges);
        triggerSave(laidOut, nextEdges);
      }
    },
    [nodes, edges, currentLayout, applyLayoutToGraph, pushHistory, triggerSave]
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

      let laidOut = nextNodes;
      if (currentLayout !== "freeform") {
        laidOut = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
      }

      setNodes(laidOut);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      pushHistory(laidOut, nextEdges);
      triggerSave(laidOut, nextEdges);
    },
    [nodes, edges, currentLayout, applyLayoutToGraph, pushHistory, triggerSave]
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

      let laidOut = nextNodes;
      if (currentLayout !== "freeform") {
        laidOut = applyLayoutToGraph(currentLayout, nextNodes, nextEdges);
      }

      setNodes(laidOut);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      pushHistory(laidOut, nextEdges);
      triggerSave(laidOut, nextEdges);
    },
    [nodes, edges, themeConfig.edgeStroke, currentLayout, applyLayoutToGraph, pushHistory, triggerSave]
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
        triggerSave(next, edges);
        return next;
      });
    },
    [edges, triggerSave]
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

  // Layout switcher
  const handleLayoutChange = useCallback(
    (newLayout: MindMapLayout) => {
      setCurrentLayout(newLayout);
      onLayoutChange?.(newLayout);
      const laidOut = applyLayoutToGraph(newLayout, nodes, edges);
      setNodes(laidOut);
      pushHistory(laidOut, edges);
      triggerSave(laidOut, edges);

      setTimeout(() => {
        reactFlowInstance?.fitView({ duration: 400 });
      }, 50);
    },
    [applyLayoutToGraph, edges, nodes, onLayoutChange, pushHistory, reactFlowInstance, triggerSave]
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
      } else if (e.key === "F2") {
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
        setSelectedNodeId(null);
        setEditingNodeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    addChildNode,
    addSiblingNode,
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
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
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
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
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
            childCount: childCountMap.get(props.id) || 0,
            hasChildren: (childCountMap.get(props.id) || 0) > 0,
            isSearchMatch: searchMatches.includes(props.id),
            isEditing: editingNodeId === props.id,
            onLabelChange: updateNodeLabel,
            onAddChild: addChildNode,
            onAddSibling: addSiblingNode,
            onDeleteNode: deleteNodeSafely,
            onDuplicateNode: duplicateNode,
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
      deleteNodeSafely,
      duplicateNode,
      edges,
      editingNodeId,
      pushHistory,
      searchMatches,
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
      className="relative w-full h-[calc(100vh-14rem)] min-h-[550px] rounded-2xl border overflow-hidden shadow-sm transition-colors duration-200"
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
        onExportJson={exportJson}
        onImportJson={() => fileInputRef.current?.click()}
      />

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => {
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

      {/* Dialog 2: Link to Task / Note */}
      {activeLinkNode && (
        <NodeLinkDialog
          open={Boolean(linkDialogNodeId)}
          nodeLabel={activeLinkNode.data.label}
          tasks={availableTasks}
          notes={availableNotes}
          currentTaskId={activeLinkNode.data.linkedTaskId}
          currentNoteId={activeLinkNode.data.linkedNoteId}
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
