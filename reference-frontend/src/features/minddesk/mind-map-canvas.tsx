import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Download, Plus, RotateCcw } from "lucide-react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import type { MapEdgeItem, MapNodeItem } from "./types";

type MapNodeData = { label: string; color: string };
type FlowNode = Node<MapNodeData>;

function MindNode({ id, data, selected, onLabelChange }: NodeProps<FlowNode> & { onLabelChange: (id: string, label: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} />
      <div
        className={`minddesk-map-node ${selected ? "selected" : ""}`}
        data-color={data.color}
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <input
            autoFocus
            aria-label="Edit mind map idea"
            className="w-full min-w-0 bg-transparent text-inherit outline-none"
            value={data.label}
            onChange={(event) => onLabelChange(id, event.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : data.label}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function MindMapCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onSave,
  theme = "calm",
  layout = "freeform",
  onThemeChange,
  onLayoutChange,
}: {
  nodes: MapNodeItem[];
  edges: MapEdgeItem[];
  onSave: (nodes: MapNodeItem[], edges: MapEdgeItem[]) => void;
  theme?: "calm" | "paper" | "midnight";
  layout?: "freeform" | "tree" | "radial";
  onThemeChange?: (theme: "calm" | "paper" | "midnight") => void;
  onLayoutChange?: (layout: "freeform" | "tree" | "radial") => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes as FlowNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges as Edge[]);
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const updateNodeLabel = useCallback((id: string, label: string) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node));
  }, [setNodes]);
  const nodeTypes = useMemo(() => ({
    mind: (props: NodeProps<FlowNode>) => <MindNode {...props} onLabelChange={updateNodeLabel} />,
  }), [updateNodeLabel]);
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge({ ...connection, type: "smoothstep" }, current));
    },
    [setEdges],
  );

  const addChildNode = () => {
    const parentId = selected ?? nodes[0]?.id;
    if (!parentId) return;
    const parent = nodes.find((node) => node.id === parentId);
    const nextId = `idea-${Date.now()}`;
    setNodes((current) => [
      ...current,
      {
        id: nextId,
        type: "mind",
        position: { x: (parent?.position.x ?? 250) + 250, y: (parent?.position.y ?? 200) + 65 },
        data: { label: "New idea", color: "blue" },
      },
    ]);
    setEdges((current) => [...current, { id: `edge-${nextId}`, source: parentId, target: nextId, type: "smoothstep" }]);
    setSelected(nextId);
  };

  const addSiblingNode = () => {
    const selectedId = selected ?? nodes[0]?.id;
    if (!selectedId) return;
    const parentEdge = edges.find((edge) => edge.target === selectedId);
    const parentId = parentEdge?.source ?? selectedId;
    const reference = nodes.find((node) => node.id === selectedId);
    const nextId = `idea-${Date.now()}`;
    setNodes((current) => [
      ...current,
      {
        id: nextId,
        type: "mind",
        position: { x: (reference?.position.x ?? 250) + 230, y: (reference?.position.y ?? 180) + 78 },
        data: { label: "New idea", color: "mint" },
      },
    ]);
    setEdges((current) => [...current, { id: `edge-${nextId}`, source: parentId, target: nextId, type: "smoothstep" }]);
    setSelected(nextId);
  };

  const saveMap = () => onSave(nodes as MapNodeItem[], edges as MapEdgeItem[]);
  const exportMap = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minddesk-map.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPng = async () => {
    const canvas = canvasRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!canvas) return;
    try {
      const dataUrl = await toPng(canvas, { pixelRatio: 2, backgroundColor: theme === "midnight" ? "#20212a" : theme === "paper" ? "#f6f0e5" : "#ffffff" });
      const link = document.createElement("a");
      link.download = "minddesk-map.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Mind map PNG export failed", error);
    }
  };
  const arrange = (nextLayout: "freeform" | "tree" | "radial") => {
    onLayoutChange?.(nextLayout);
    if (nextLayout === "freeform") return;
    setNodes((current) => {
      if (nextLayout === "radial") {
        const center = current.find((node) => !edges.some((edge) => edge.target === node.id)) ?? current[0];
        if (!center) return current;
        const others = current.filter((node) => node.id !== center.id);
        return current.map((node) => {
          if (node.id === center.id) return { ...node, position: { x: 340, y: 240 } };
          const index = others.findIndex((item) => item.id === node.id);
          const angle = (index / others.length) * Math.PI * 2;
          return { ...node, position: { x: 340 + Math.cos(angle) * 300, y: 240 + Math.sin(angle) * 190 } };
        });
      }
      const children = new Map<string, FlowNode[]>();
      edges.forEach((edge) => {
        const list = children.get(edge.source) ?? [];
        const child = current.find((node) => node.id === edge.target);
        if (child) children.set(edge.source, [...list, child]);
      });
      const root = current.find((node) => !edges.some((edge) => edge.target === node.id)) ?? current[0];
      if (!root) return current;
      const positions = new Map<string, { x: number; y: number }>();
      const queue: { node: FlowNode; depth: number; index: number }[] = [{ node: root, depth: 0, index: 0 }];
      const seen = new Set<string>();
      let nextIndex = 0;
      while (queue.length) {
        const item = queue.shift()!;
        if (seen.has(item.node.id)) continue;
        seen.add(item.node.id);
        const position = { x: 120 + item.depth * 280, y: 100 + item.index * 120 };
        positions.set(item.node.id, position);
        (children.get(item.node.id) ?? []).forEach((child) => queue.push({ node: child, depth: item.depth + 1, index: nextIndex++ }));
      }
      return current.map((node) => positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node);
    });
  };

  return (
    <div ref={canvasRef} className="map-canvas" data-theme={theme}>
      <div className="map-toolbar" aria-label="Mind map tools">
        <Button variant="outline" size="sm" onClick={addChildNode}>
          <Plus aria-hidden="true" /> Add idea
        </Button>
        <select aria-label="Mind map theme" value={theme} onChange={(event) => onThemeChange?.(event.target.value as "calm" | "paper" | "midnight")} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="calm">Calm</option><option value="paper">Paper</option><option value="midnight">Midnight</option>
        </select>
        <select aria-label="Mind map layout" value={layout} onChange={(event) => arrange(event.target.value as "freeform" | "tree" | "radial")} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="freeform">Freeform</option><option value="tree">Tree</option><option value="radial">Radial</option>
        </select>
        <Button variant="ghost" size="icon" aria-label="Fit map to view" title="Fit map to view" onClick={() => void flow?.fitView({ padding: 0.22 })}>
          <RotateCcw aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Export map as PNG" title="Export map as PNG" onClick={() => void exportPng()}><Download aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" aria-label="Export map as JSON" title="Export map as JSON" onClick={exportMap}>
          <span className="text-xs font-bold">JSON</span>
        </Button>
        <Button size="sm" onClick={saveMap}>Save map</Button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelected(node.id)}
        onNodeDragStop={saveMap}
        onNodeDoubleClick={(_, node) => setSelected(node.id)}
        onPaneClick={() => setSelected(null)}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
          if (event.key === "Tab") { event.preventDefault(); addChildNode(); }
          if (event.key === "Enter") { event.preventDefault(); addSiblingNode(); }
        }}
        onInit={setFlow}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.28}
        maxZoom={1.8}
        deleteKeyCode={"Backspace"}
        defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 2 } }}
      >
        <Background gap={24} size={1} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}