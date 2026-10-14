"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  CheckSquare,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Palette,
  Shapes,
  Smile,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MapNodeItem, MindMapTheme } from "../types";
import { THEME_CONFIGS, COLOR_OPTIONS, SHAPE_OPTIONS, EMOJI_PALETTE } from "./theme-tokens";

export type FlowNodeData = MapNodeItem["data"] & {
  theme?: MindMapTheme;
  isSearchMatch?: boolean;
  childCount?: number;
  hasChildren?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  onAddChild?: (parentId: string) => void;
  onAddSibling?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onChangeColor?: (nodeId: string, color: string) => void;
  onChangeShape?: (nodeId: string, shape: "rounded" | "pill" | "rectangle" | "diamond" | "circle") => void;
  onOpenNoteEditor?: (nodeId: string) => void;
  onOpenIconPicker?: (nodeId: string) => void;
  onOpenLinkModal?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
  isEditing?: boolean;
  setEditingNodeId?: (id: string | null) => void;
};

export type MindFlowNode = Node<FlowNodeData>;

export const MindMapNode = memo(function MindMapNode({
  id,
  data,
  selected,
}: NodeProps<MindFlowNode>) {
  const [localEditing, setLocalEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label || "");
  const [activeMenu, setActiveMenu] = useState<"color" | "shape" | "emoji" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const themeName = data.theme || "calm";
  const theme = THEME_CONFIGS[themeName] || THEME_CONFIGS.calm;
  const colorToken = theme.colors[data.color] || theme.colors.violet;

  const isRoot = Boolean(data.isRoot);
  const isEditing = localEditing || data.isEditing;

  useEffect(() => {
    setEditValue(data.label || "");
  }, [data.label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setActiveMenu(null);
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setLocalEditing(false);
    data.setEditingNodeId?.(null);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== data.label) {
      data.onLabelChange?.(id, trimmed);
    } else {
      setEditValue(data.label || "");
    }
  }, [data, editValue, id]);

  const cancelEdit = useCallback(() => {
    setLocalEditing(false);
    data.setEditingNodeId?.(null);
    setEditValue(data.label || "");
  }, [data]);

  // Shape class resolution
  const shape = data.shape || "rounded";
  const shapeClass =
    shape === "pill"
      ? "rounded-full px-5 py-2.5"
      : shape === "rectangle"
      ? "rounded-none px-4 py-2.5"
      : shape === "diamond"
      ? "rounded-lg px-5 py-3 transform"
      : shape === "circle"
      ? "rounded-full aspect-square flex flex-col items-center justify-center p-3 text-center"
      : "rounded-xl px-4 py-2.5"; // rounded card default

  // Node container styling
  const nodeStyle: React.CSSProperties = isRoot
    ? {
        backgroundColor: theme.rootBg,
        color: theme.rootText,
        borderColor: theme.rootBorder,
        boxShadow: selected ? `0 0 0 3px ${theme.edgeStrokeSelected}` : theme.nodeShadow,
      }
    : {
        backgroundColor: colorToken.bg,
        color: colorToken.text,
        borderColor: colorToken.border,
        boxShadow: selected ? `0 0 0 3px ${theme.edgeStrokeSelected}` : theme.nodeShadow,
      };

  return (
    <div className="relative group select-none">
      {/* Target handle on Left */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !border-2 !border-background transition-transform group-hover:scale-125"
        style={{ backgroundColor: colorToken.accent }}
      />
      {/* Target handle on Top for vertical layouts */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: colorToken.accent }}
      />

      {/* Floating Contextual Toolbar for Selected Node */}
      {selected && !isEditing && (
        <div
          data-testid="node-context-toolbar"
          className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-lg border px-1.5 py-1 shadow-lg backdrop-blur-md transition-all animate-in fade-in zoom-in-95"
          style={{
            backgroundColor: theme.toolbarBg,
            borderColor: theme.toolbarBorder,
            color: theme.toolbarText,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add Child */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Add Subtopic (Tab)"
            onClick={() => data.onAddChild?.(id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          {/* Add Sibling (if not root) */}
          {!isRoot && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
              title="Add Sibling (Enter)"
              onClick={() => data.onAddSibling?.(id)}
            >
              <span className="font-bold text-xs">+</span>
            </Button>
          )}

          {/* Edit Label */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Edit Topic (F2)"
            onClick={() => {
              setLocalEditing(true);
              data.setEditingNodeId?.(id);
            }}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>

          {/* Color Palette Toggle */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
              title="Change Color"
              onClick={() => setActiveMenu(activeMenu === "color" ? null : "color")}
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
            {activeMenu === "color" && (
              <div
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 grid grid-cols-4 gap-1.5 p-2 rounded-lg border shadow-xl bg-card"
                style={{ borderColor: theme.toolbarBorder }}
              >
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    className="h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-125"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => {
                      data.onChangeColor?.(id, c.id);
                      setActiveMenu(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Shape Picker Toggle */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
              title="Change Shape"
              onClick={() => setActiveMenu(activeMenu === "shape" ? null : "shape")}
            >
              <Shapes className="h-3.5 w-3.5" />
            </Button>
            {activeMenu === "shape" && (
              <div
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1 p-1.5 rounded-lg border shadow-xl bg-card min-w-[120px]"
                style={{ borderColor: theme.toolbarBorder }}
              >
                {SHAPE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="text-left px-2 py-1 text-xs rounded hover:bg-muted text-foreground transition-colors"
                    onClick={() => {
                      data.onChangeShape?.(id, s.id);
                      setActiveMenu(null);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Emoji / Icon Picker */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
              title="Add Icon / Marker"
              onClick={() => setActiveMenu(activeMenu === "emoji" ? null : "emoji")}
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
            {activeMenu === "emoji" && (
              <div
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 grid grid-cols-4 gap-1 p-2 rounded-lg border shadow-xl bg-card"
                style={{ borderColor: theme.toolbarBorder }}
              >
                {EMOJI_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="h-6 w-6 text-sm flex items-center justify-center rounded hover:bg-muted hover:scale-125 transition-transform"
                    onClick={() => {
                      data.onOpenIconPicker?.(emoji);
                      setActiveMenu(null);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note Editor */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
            title={data.note ? "Edit Description Note" : "Add Note / Description"}
            onClick={() => data.onOpenNoteEditor?.(id)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>

          {/* Link to Task / Note */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Link to Note or Task"
            onClick={() => data.onOpenLinkModal?.(id)}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>

          {/* Duplicate */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Duplicate Topic (Ctrl+D)"
            onClick={() => data.onDuplicateNode?.(id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          {/* Delete Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs rounded text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
            title={isRoot ? "Cannot delete central topic" : "Delete (Delete / Backspace)"}
            disabled={isRoot}
            onClick={() => data.onDeleteNode?.(id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Main Node Card */}
      <div
        data-testid={`mindmap-node-${id}`}
        className={`relative border transition-all duration-150 cursor-pointer min-w-[150px] max-w-[320px] ${shapeClass} ${
          data.isSearchMatch ? "ring-4 ring-amber-400 ring-offset-2 animate-pulse" : ""
        }`}
        style={nodeStyle}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setLocalEditing(true);
          data.setEditingNodeId?.(id);
        }}
      >
        {/* Badges / Metadata Header */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {data.icon && <span className="text-sm select-none">{data.icon}</span>}
          {data.note && (
            <span
              title="Has attached note / description"
              className="inline-flex items-center text-[10px] opacity-75 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenNoteEditor?.(id);
              }}
            >
              <MessageSquare className="h-3 w-3" />
            </span>
          )}
          {data.linkedTaskId && (
            <span
              title="Linked Task"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-300 font-medium"
            >
              <CheckSquare className="h-2.5 w-2.5" /> Task
            </span>
          )}
          {data.linkedNoteId && (
            <span
              title="Linked Document"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 font-medium"
            >
              <FileText className="h-2.5 w-2.5" /> Doc
            </span>
          )}
        </div>

        {/* Node Content / Inline Input */}
        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            aria-label="Edit mind map topic"
            className="w-full min-w-[120px] bg-transparent text-inherit font-semibold outline-none border-b border-current"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
              // Prevent keyboard shortcuts from firing while typing
              e.stopPropagation();
            }}
          />
        ) : (
          <div
            className={`font-semibold leading-snug break-words ${
              isRoot ? "text-base tracking-tight" : "text-sm"
            }`}
          >
            {data.label || "Untitled Idea"}
          </div>
        )}

        {/* Note Excerpt Preview */}
        {data.note && !isEditing && (
          <p className="mt-1 text-xs opacity-70 line-clamp-1 italic font-normal">
            {data.note}
          </p>
        )}

        {/* Collapse / Expand Toggle Button for Nodes with Children */}
        {data.hasChildren && (
          <button
            type="button"
            title={data.collapsed ? "Expand subtopics" : "Collapse subtopics"}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-5 w-5 rounded-full border shadow-sm text-[10px] font-bold transition-transform hover:scale-110"
            style={{
              backgroundColor: theme.nodeBg,
              color: colorToken.accent,
              borderColor: colorToken.border,
            }}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.(id);
            }}
          >
            {data.collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <span className="leading-none text-[9px]">{data.childCount || 1}</span>
            )}
          </button>
        )}
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !border-2 !border-background transition-transform group-hover:scale-125"
        style={{ backgroundColor: colorToken.accent }}
      />
      {/* Source handle on Bottom for vertical layouts */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: colorToken.accent }}
      />
    </div>
  );
});
