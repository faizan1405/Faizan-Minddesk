import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Plus,
  Quote,
  Trash2,
  Type,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SlashContext } from "../types";

interface BlockHandleProps {
  editor: Editor | null;
  context: SlashContext;
  onOpenSlashAtPos?: (pos: number) => void;
}

export function BlockHoverHandle({ editor, context, onOpenSlashAtPos }: BlockHandleProps) {
  const [activeNode, setActiveNode] = useState<HTMLElement | null>(null);
  const [handlePos, setHandlePos] = useState<{ top: number; left: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !editor.view) return;

    const editorDom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen) return;

      const target = e.target as HTMLElement | null;
      if (!target || !editorDom.contains(target)) {
        // If moving inside the handle itself, don't hide
        if (containerRef.current && containerRef.current.contains(target)) {
          return;
        }
        return;
      }

      // Find top-level block inside ProseMirror
      let blockEl: HTMLElement | null = target;
      while (blockEl && blockEl.parentElement && blockEl.parentElement !== editorDom) {
        blockEl = blockEl.parentElement;
      }

      if (blockEl && blockEl.parentElement === editorDom) {
        const rect = blockEl.getBoundingClientRect();
        setActiveNode(blockEl);
        setHandlePos({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX - 52,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [editor, menuOpen]);

  if (!editor || !handlePos || !activeNode) return null;

  const getResolvedPos = () => {
    try {
      const pos = editor.view.posAtDOM(activeNode, 0);
      const $pos = editor.state.doc.resolve(Math.max(0, pos));
      const node = $pos.nodeAfter || $pos.parent;
      return { pos, $pos, node };
    } catch {
      return null;
    }
  };

  const handleAddBelow = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { $pos, node } = resolved;
    const afterPos = $pos.pos + (node ? node.nodeSize : 0);

    editor
      .chain()
      .focus()
      .insertContentAt(afterPos, { type: "paragraph" })
      .setTextSelection(afterPos + 1)
      .run();

    onOpenSlashAtPos?.(afterPos + 1);
  };

  const handleAddAbove = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { pos } = resolved;

    editor
      .chain()
      .focus()
      .insertContentAt(pos, { type: "paragraph" })
      .setTextSelection(pos + 1)
      .run();
  };

  const handleDuplicate = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { $pos, node } = resolved;
    if (!node) return;

    const afterPos = $pos.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(afterPos, node.toJSON())
      .run();
    setMenuOpen(false);
  };

  const handleDelete = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { $pos, node } = resolved;
    if (!node) return;

    const from = $pos.pos;
    const to = from + node.nodeSize;
    editor.chain().focus().deleteRange({ from, to }).run();
    setMenuOpen(false);
    setActiveNode(null);
    setHandlePos(null);
  };

  const handleMoveUp = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { $pos, node } = resolved;
    if (!node) return;

    const prevPos = $pos.before();
    const $prev = editor.state.doc.resolve(prevPos);
    const index = $pos.index();
    if (index === 0) return; // Already at top

    const from = $pos.pos;
    const to = from + node.nodeSize;
    const nodeJson = node.toJSON();

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt($prev.posAtIndex(index - 1), nodeJson)
      .run();
    setMenuOpen(false);
  };

  const handleMoveDown = () => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    const { $pos, node } = resolved;
    if (!node) return;

    const from = $pos.pos;
    const to = from + node.nodeSize;
    const nextPos = to;
    if (nextPos >= editor.state.doc.content.size) return;

    const nodeJson = node.toJSON();
    const $next = editor.state.doc.resolve(nextPos);
    const nextNode = $next.nodeAfter;
    if (!nextNode) return;

    const insertAt = nextPos + nextNode.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, nodeJson)
      .deleteRange({ from, to })
      .run();
    setMenuOpen(false);
  };

  const handleConvertToTask = () => {
    const text = activeNode.textContent?.trim() || "Untitled task";
    context.createMindDeskTask(text);
    setMenuOpen(false);
  };

  // Drag and drop block reordering
  const handleDragStart = (e: React.DragEvent) => {
    const resolved = getResolvedPos();
    if (!resolved) return;
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", resolved.pos.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: `${handlePos.top}px`,
        left: `${handlePos.left}px`,
      }}
      className={`z-30 flex items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 px-1 py-0.5 shadow-sm backdrop-blur-md transition-opacity duration-150 animate-in fade-in ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      {/* Add block button */}
      <button
        type="button"
        onClick={handleAddBelow}
        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Click to add a block below"
      >
        <Plus className="size-3.5" />
      </button>

      {/* Drag handle / Context Menu */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="grid size-6 cursor-grab active:cursor-grabbing place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Drag to move or click to open block menu"
          >
            <GripVertical className="size-3.5" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5" align="start">
          <div className="flex flex-col gap-0.5 text-xs">
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Block Actions
            </div>

            <button
              type="button"
              onClick={handleAddAbove}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span>Add block above</span>
            </button>

            <button
              type="button"
              onClick={handleAddBelow}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span>Add block below</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Duplicate block</span>
            </button>

            <button
              type="button"
              onClick={handleMoveUp}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
            >
              <ArrowUp className="size-3.5 text-muted-foreground" />
              <span>Move up</span>
            </button>

            <button
              type="button"
              onClick={handleMoveDown}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
            >
              <ArrowDown className="size-3.5 text-muted-foreground" />
              <span>Move down</span>
            </button>

            <button
              type="button"
              onClick={handleConvertToTask}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left text-primary font-medium"
            >
              <CheckSquare className="size-3.5" />
              <span>Convert to MindDesk Task</span>
            </button>

            <div className="h-px bg-border my-1" />

            {/* Turn into section */}
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Turn into
            </div>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <Type className="size-3.5 text-muted-foreground" />
              <span>Text</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <Heading1 className="size-3.5 text-muted-foreground" />
              <span>Heading 1</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <Heading2 className="size-3.5 text-muted-foreground" />
              <span>Heading 2</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <Heading3 className="size-3.5 text-muted-foreground" />
              <span>Heading 3</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <List className="size-3.5 text-muted-foreground" />
              <span>Bulleted list</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <ListOrdered className="size-3.5 text-muted-foreground" />
              <span>Numbered list</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleTaskList().run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <CheckSquare className="size-3.5 text-muted-foreground" />
              <span>To-do list</span>
            </button>

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-left"
            >
              <Quote className="size-3.5 text-muted-foreground" />
              <span>Quote</span>
            </button>

            <div className="h-px bg-border my-1" />

            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-destructive/10 text-left font-medium"
            >
              <Trash2 className="size-3.5" />
              <span>Delete block</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
