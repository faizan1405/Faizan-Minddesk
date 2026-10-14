"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckSquare, FileText, Trash2, AlertTriangle, Link as LinkIcon } from "lucide-react";
import type { TaskItem, NoteItem } from "../types";

// 1. Note / Description Editor Dialog
export function NodeNoteDialog({
  open,
  nodeLabel,
  initialNote,
  onClose,
  onSave,
}: {
  open: boolean;
  nodeLabel: string;
  initialNote: string;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [noteText, setNoteText] = useState(initialNote);

  React.useEffect(() => {
    setNoteText(initialNote);
  }, [initialNote, open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Topic Note: {nodeLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <textarea
            autoFocus
            rows={6}
            aria-label="Topic note description"
            className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add detailed notes, markdown snippets, or research references for this idea…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(noteText);
              onClose();
            }}
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 2. Link Node to Task or Note Dialog
export function NodeLinkDialog({
  open,
  nodeLabel,
  tasks,
  notes,
  currentTaskId,
  currentNoteId,
  onClose,
  onLinkTask,
  onLinkNote,
  onUnlink,
}: {
  open: boolean;
  nodeLabel: string;
  tasks: TaskItem[];
  notes: NoteItem[];
  currentTaskId?: string;
  currentNoteId?: string;
  onClose: () => void;
  onLinkTask: (taskId: string) => void;
  onLinkNote: (noteId: string) => void;
  onUnlink: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"task" | "note">("task");
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Link Topic: {nodeLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex border-b gap-4 text-xs font-semibold">
          <button
            type="button"
            className={`pb-2 transition-colors ${
              activeTab === "task"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("task")}
          >
            Tasks ({tasks.length})
          </button>
          <button
            type="button"
            className={`pb-2 transition-colors ${
              activeTab === "note"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("note")}
          >
            Documents & Notes ({notes.length})
          </button>
        </div>

        <div className="py-2">
          <input
            placeholder={`Search ${activeTab === "task" ? "tasks" : "notes"}…`}
            className="w-full h-8 px-2.5 rounded-lg border border-input text-xs outline-none focus:ring-1 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="mt-2 max-h-56 overflow-y-auto divide-y rounded-lg border">
            {activeTab === "task" ? (
              filteredTasks.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">
                  No matching tasks found.
                </p>
              ) : (
                filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={`w-full text-left p-2.5 text-xs flex items-center justify-between hover:bg-muted transition-colors ${
                      currentTaskId === task.id ? "bg-primary/10 font-medium" : ""
                    }`}
                    onClick={() => {
                      onLinkTask(task.id);
                      onClose();
                    }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="truncate">{task.title}</span>
                    </span>
                    {currentTaskId === task.id && (
                      <span className="text-[10px] text-primary font-bold">Linked</span>
                    )}
                  </button>
                ))
              )
            ) : filteredNotes.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">
                No matching notes found.
              </p>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={`w-full text-left p-2.5 text-xs flex items-center justify-between hover:bg-muted transition-colors ${
                    currentNoteId === note.id ? "bg-primary/10 font-medium" : ""
                  }`}
                  onClick={() => {
                    onLinkNote(note.id);
                    onClose();
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                    <span className="truncate">{note.title}</span>
                  </span>
                  {currentNoteId === note.id && (
                    <span className="text-[10px] text-primary font-bold">Linked</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          {(currentTaskId || currentNoteId) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
              onClick={() => {
                onUnlink();
                onClose();
              }}
            >
              Unlink
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 3. Delete Node & Branch Confirmation Dialog
export function NodeDeleteDialog({
  open,
  nodeLabel,
  childCount,
  onClose,
  onDeleteBranch,
  onDeleteNodeKeepChildren,
}: {
  open: boolean;
  nodeLabel: string;
  childCount: number;
  onClose: () => void;
  onDeleteBranch: () => void;
  onDeleteNodeKeepChildren: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" /> Delete Topic: &ldquo;{nodeLabel}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This topic has <strong className="text-foreground">{childCount}</strong> subtopic
          {childCount > 1 ? "s" : ""}. Choose how you would like to proceed:
        </p>

        <div className="grid gap-2 py-2">
          <Button
            variant="destructive"
            size="sm"
            className="justify-start gap-2 h-auto py-2.5 px-3"
            onClick={() => {
              onDeleteBranch();
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-xs">Delete Entire Branch</div>
              <div className="text-[11px] opacity-80 font-normal">
                Permanently remove &ldquo;{nodeLabel}&rdquo; and all its {childCount} subtopic
                {childCount > 1 ? "s" : ""}.
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-auto py-2.5 px-3 text-foreground"
            onClick={() => {
              onDeleteNodeKeepChildren();
              onClose();
            }}
          >
            <div className="text-left">
              <div className="font-semibold text-xs">Delete Topic & Keep Subtopics</div>
              <div className="text-[11px] text-muted-foreground font-normal">
                Remove &ldquo;{nodeLabel}&rdquo; only, reconnecting its subtopics to its parent.
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
