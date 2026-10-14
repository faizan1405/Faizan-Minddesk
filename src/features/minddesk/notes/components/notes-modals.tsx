"use client";

import React, { useMemo, useState } from "react";
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
import type { NoteItem, ProjectItem } from "../../types";
import { isDescendantOf, getProjectHueColor } from "../types";
import { FolderPlus, Move, Trash2, Edit2 } from "lucide-react";

// ----------------------------------------------------------------------------
// 1. Create Project Dialog
// ----------------------------------------------------------------------------
interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: {
    name: string;
    hue: "violet" | "mint" | "amber" | "blue";
    description?: string;
  }) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hue, setHue] = useState<"violet" | "mint" | "amber" | "blue">("violet");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({
      name: name.trim(),
      hue,
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
    setHue("violet");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="size-4 text-primary" />
            New Project
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create an organized project workspace with its own overview and page tree.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Project Name</label>
            <Input
              autoFocus
              placeholder="e.g. My Business, Personal, Marketing…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description (optional)</label>
            <Input
              placeholder="Short project summary or mission"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Accent Color</label>
            <div className="flex items-center gap-2 pt-1">
              {(["violet", "mint", "amber", "blue"] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setHue(color)}
                  className={`size-6 rounded-full border-2 transition-transform cursor-pointer ${
                    hue === color ? "scale-110 border-foreground shadow-xs" : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: getProjectHueColor(color) }}
                  title={color}
                  aria-label={`Select ${color} color`}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// 2. Rename Project Dialog
// ----------------------------------------------------------------------------
interface RenameProjectDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenameProject: (projectId: string, newName: string) => void;
}

export function RenameProjectDialog({
  project,
  open,
  onOpenChange,
  onRenameProject,
}: RenameProjectDialogProps) {
  const [name, setName] = useState(project?.name || "");

  React.useEffect(() => {
    if (project) setName(project.name);
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !name.trim()) return;
    onRenameProject(project.id, name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit2 className="size-4 text-primary" />
            Rename Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Project Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// 3. Delete Project Dialog
// ----------------------------------------------------------------------------
interface DeleteProjectDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteProject: (projectId: string, deleteNotes: boolean) => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleteProject,
}: DeleteProjectDialogProps) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="size-4" />
            Delete Project &quot;{project.name}&quot;
          </DialogTitle>
          <DialogDescription className="text-xs">
            How would you like to handle the notes inside this project?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-auto py-2.5 px-3 border-border hover:bg-muted/60"
            onClick={() => {
              onDeleteProject(project.id, false);
              onOpenChange(false);
            }}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Keep Pages (Unassign)</div>
              <div className="text-[11px] text-muted-foreground">
                Preserves all pages and subpages, moving them to General Pages.
              </div>
            </div>
          </Button>

          <Button
            variant="destructive"
            className="w-full justify-start text-xs h-auto py-2.5 px-3"
            onClick={() => {
              onDeleteProject(project.id, true);
              onOpenChange(false);
            }}
          >
            <div className="text-left">
              <div className="font-medium">Delete Project and All Its Pages</div>
              <div className="text-[11px] opacity-90">
                Permanently deletes this project and all notes assigned to it.
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// 4. Rename Page Dialog
// ----------------------------------------------------------------------------
interface RenamePageDialogProps {
  note: NoteItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
}

export function RenamePageDialog({
  note,
  open,
  onOpenChange,
  onRenameNote,
}: RenamePageDialogProps) {
  const [title, setTitle] = useState(note?.title || "");

  React.useEffect(() => {
    if (note) setTitle(note.title);
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !title.trim()) return;
    onRenameNote(note.id, title.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit2 className="size-4 text-primary" />
            Rename Page
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Page Title</label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// 5. Delete Page Dialog (Keep Subpages vs Delete Subtree)
// ----------------------------------------------------------------------------
interface DeletePageDialogProps {
  note: NoteItem | null;
  subpageCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteNote: (noteId: string, deleteSubtree: boolean) => void;
}

export function DeletePageDialog({
  note,
  subpageCount,
  open,
  onOpenChange,
  onDeleteNote,
}: DeletePageDialogProps) {
  if (!note) return null;

  const hasSubpages = subpageCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="size-4" />
            Delete Page &quot;{note.title || "Untitled"}&quot;
          </DialogTitle>
          <DialogDescription className="text-xs">
            {hasSubpages
              ? `This page contains ${subpageCount} nested subpage${subpageCount === 1 ? "" : "s"}. Choose how to proceed:`
              : "Are you sure you want to permanently delete this page? This action will sync to cloud persistence."}
          </DialogDescription>
        </DialogHeader>

        {hasSubpages ? (
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start text-xs h-auto py-2.5 px-3 border-border hover:bg-muted/60"
              onClick={() => {
                onDeleteNote(note.id, false);
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-medium text-foreground">Keep Subpages</div>
                <div className="text-[11px] text-muted-foreground">
                  Preserves nested subpages by moving them up to the parent level.
                </div>
              </div>
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start text-xs h-auto py-2.5 px-3"
              onClick={() => {
                onDeleteNote(note.id, true);
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Delete Entire Subtree</div>
                <div className="text-[11px] opacity-90">
                  Permanently deletes this page and all {subpageCount} nested subpage(s).
                </div>
              </div>
            </Button>
          </div>
        ) : null}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!hasSubpages && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteNote(note.id, false);
                onOpenChange(false);
              }}
            >
              Delete Page
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// 6. Move Page Dialog (With Cycle Prevention & Project Subtree Inheritance)
// ----------------------------------------------------------------------------
interface MovePageDialogProps {
  note: NoteItem | null;
  allNotes: NoteItem[];
  projects: ProjectItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveNote: (
    noteId: string,
    targetProjectId?: string,
    targetParentId?: string | null
  ) => void;
}

export function MovePageDialog({
  note,
  allNotes,
  projects,
  open,
  onOpenChange,
  onMoveNote,
}: MovePageDialogProps) {
  const [targetProjectId, setTargetProjectId] = useState<string>(note?.projectId || "unassigned");
  const [targetParentId, setTargetParentId] = useState<string>(note?.parentId || "none");

  React.useEffect(() => {
    if (note) {
      setTargetProjectId(note.projectId || "unassigned");
      setTargetParentId(note.parentId || "none");
    }
  }, [note]);

  // Candidates for parent page in the selected target project (with cycle prevention!)
  const eligibleParentNotes = useMemo(() => {
    if (!note) return [];
    return allNotes.filter((candidate) => {
      // 1. Cannot be the note itself
      if (candidate.id === note.id) return false;
      // 2. Cannot be a descendant of note (cycle prevention)
      if (isDescendantOf(candidate.id, note.id, allNotes)) return false;
      // 3. Must match the target project filter
      if (targetProjectId === "unassigned") {
        return !candidate.projectId;
      }
      return candidate.projectId === targetProjectId;
    });
  }, [allNotes, note, targetProjectId]);

  const handleMove = () => {
    if (!note) return;
    const finalProjectId = targetProjectId === "unassigned" ? undefined : targetProjectId;
    const finalParentId = targetParentId === "none" ? null : targetParentId;
    onMoveNote(note.id, finalProjectId, finalParentId);
    onOpenChange(false);
  };

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Move className="size-4 text-primary" />
            Move Page &quot;{note.title || "Untitled"}&quot;
          </DialogTitle>
          <DialogDescription className="text-xs">
            Move this page under another Project or as a nested subpage under another Page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Target Project Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Target Project</label>
            <select
              value={targetProjectId}
              onChange={(e) => {
                setTargetProjectId(e.target.value);
                setTargetParentId("none"); // Reset parent selection when project changes
              }}
              className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="unassigned">General (No Project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Parent Page Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Parent Page (Nesting)
            </label>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="none">Top Level (No Parent Page)</option>
              {eligibleParentNotes.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.icon || "📄"} {parent.title || "Untitled"}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Cycle prevention: Descendants of this page are automatically excluded.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleMove}>
            Move Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
