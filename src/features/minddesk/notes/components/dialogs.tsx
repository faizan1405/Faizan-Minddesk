import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Image as ImageIcon,
  ListTodo,
  Map,
  Plus,
  Search,
} from "lucide-react";
import type { MindMapItem, NoteItem, TaskItem } from "../../types";

export function ImageInsertDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onInsert(url.trim());
      setUrl("");
      onOpenChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onInsert(reader.result);
          onOpenChange(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Insert Image
          </DialogTitle>
          <DialogDescription>
            Enter a web image URL or select a local image. (Stored locally in prototype).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <Input
              placeholder="https://images.unsplash.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase">or choose file</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border p-4 hover:border-primary/50 hover:bg-accent/40 transition-colors">
            <ImageIcon className="size-6 text-muted-foreground mb-1" />
            <span className="text-xs font-medium text-foreground">Upload from device</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, SVG, WebP up to 5MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!url.trim()}>
              Insert image
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NoteReferenceDialog({
  open,
  onOpenChange,
  notes,
  currentNoteId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: NoteItem[];
  currentNoteId: string;
  onSelect: (note: NoteItem) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = notes.filter(
    (n) => n.id !== currentNoteId && n.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Link Note
          </DialogTitle>
          <DialogDescription>Select an existing document to reference.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length > 0 ? (
              filtered.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    onSelect(note);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="text-base">{note.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{note.excerpt}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">No notes found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MindMapReferenceDialog({
  open,
  onOpenChange,
  maps,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maps: MindMapItem[];
  onSelect: (map: MindMapItem) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = maps.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="size-4 text-primary" /> Link Mind Map
          </DialogTitle>
          <DialogDescription>Select an existing mind map to embed as a link.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search mind maps…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length > 0 ? (
              filtered.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => {
                    onSelect(map);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="grid size-7 place-items-center rounded bg-primary/10 text-primary">
                    <Map className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{map.title}</p>
                    <p className="text-[11px] text-muted-foreground">{map.nodes.length} nodes</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">No mind maps found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskReferenceDialog({
  open,
  onOpenChange,
  tasks,
  onCreateTask,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskItem[];
  onCreateTask: (title: string) => TaskItem;
  onSelect: (task: TaskItem) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  const handleCreateNew = () => {
    if (!query.trim()) return;
    const newTask = onCreateTask(query.trim());
    onSelect(newTask);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="size-4 text-primary" /> MindDesk Task
          </DialogTitle>
          <DialogDescription>Link an existing task or create a new one.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search or type task title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          {query.trim() && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="size-4" />
              <span>Create new task: &quot;{query.trim()}&quot;</span>
            </button>
          )}

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length > 0 ? (
              filtered.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    onSelect(task);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="grid size-5 place-items-center rounded border border-muted-foreground/30 text-xs">
                    {task.complete ? "✓" : ""}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${task.complete ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Due: {task.due}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">No existing tasks found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
