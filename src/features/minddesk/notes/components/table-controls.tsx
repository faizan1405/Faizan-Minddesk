import React from "react";
import type { Editor } from "@tiptap/core";
import {
  Columns,
  Plus,
  Rows,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TableControlsProps {
  editor: Editor | null;
}

export function TableControls({ editor }: TableControlsProps) {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="sticky top-2 z-20 mx-auto my-2 flex max-w-fit items-center gap-1 rounded-xl border border-border bg-card/95 px-2 py-1 shadow-md backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-1.5 px-1.5 text-muted-foreground font-medium border-r border-border pr-2">
        <TableIcon className="size-3.5 text-primary" />
        <span>Table</span>
      </div>

      {/* Row operations */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent text-foreground"
          >
            <Rows className="size-3.5 text-muted-foreground" />
            <span>Row</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          <div className="flex flex-col gap-0.5 text-xs">
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-accent flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).addRowBefore().run()}
            >
              <Plus className="size-3 text-muted-foreground" />
              <span>Add row above</span>
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-accent flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).addRowAfter().run()}
            >
              <Plus className="size-3 text-muted-foreground" />
              <span>Add row below</span>
            </button>
            <div className="h-px bg-border my-0.5" />
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).deleteRow().run()}
            >
              <Trash2 className="size-3" />
              <span>Delete row</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Column operations */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent text-foreground"
          >
            <Columns className="size-3.5 text-muted-foreground" />
            <span>Column</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <div className="flex flex-col gap-0.5 text-xs">
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-accent flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).addColumnBefore().run()}
            >
              <Plus className="size-3 text-muted-foreground" />
              <span>Add column left</span>
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-accent flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).addColumnAfter().run()}
            >
              <Plus className="size-3 text-muted-foreground" />
              <span>Add column right</span>
            </button>
            <div className="h-px bg-border my-0.5" />
            <button
              type="button"
              className="rounded px-2 py-1 text-left hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
              onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).deleteColumn().run()}
            >
              <Trash2 className="size-3" />
              <span>Delete column</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        className="rounded px-2 py-1 hover:bg-accent text-foreground"
        onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).toggleHeaderRow().run()}
        title="Toggle header row"
      >
        Header Row
      </button>

      <div className="h-4 w-px bg-border mx-0.5" />

      <button
        type="button"
        className="rounded px-2 py-1 hover:bg-destructive/10 text-destructive flex items-center gap-1"
        onClick={() => (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>).deleteTable().run()}
        title="Delete entire table"
      >
        <Trash2 className="size-3" />
        <span>Delete table</span>
      </button>
    </div>
  );
}
