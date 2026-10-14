"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronRight,
  FolderOpen,
  FolderMinus,
  FolderPlus,
  Image as ImageIcon,
  MoreHorizontal,
  Star,
  Trash2,
  Copy,
  Download,
  X,
  FileText,
  AlertCircle,
  Check,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NoteItem, ProjectItem } from "../../types";
import { COVER_PRESETS, EMOJI_OPTIONS, getNoteAncestors, getProjectHueColor } from "../types";
import type { SaveStatus } from "@/types/domain";
import { useDeskData } from "../../store";

interface NoteHeaderProps {
  note: NoteItem;
  allNotes: NoteItem[];
  projects: ProjectItem[];
  onUpdate: (changes: Partial<NoteItem>) => void;
  onNavigateToNote: (noteId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  saveStatus: SaveStatus;
}

export function NoteHeader({
  note,
  allNotes,
  projects,
  onUpdate,
  onNavigateToNote,
  onDuplicate,
  onDelete,
  onExportMarkdown,
  onExportJson,
  saveStatus,
}: NoteHeaderProps) {
  const { persistImmediately } = useDeskData();
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  // Multi-level ancestor chain resolution
  const ancestors = useMemo(() => getNoteAncestors(note, allNotes), [note, allNotes]);
  const immediateParent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

  // Safe project resolution — NEVER fall back to projects[0] or fake "Personal"
  const currentProject = useMemo(() => {
    if (!note.projectId) return null;
    return projects.find((p) => p.id === note.projectId) || null;
  }, [note.projectId, projects]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [projectSearch, projects]);

  // Compute set of descendant IDs to prevent cycle when setting parent
  const descendantIds = useMemo(() => {
    const set = new Set<string>([note.id]);
    let added = true;
    while (added) {
      added = false;
      for (const n of allNotes) {
        if (n.parentId && set.has(n.parentId) && !set.has(n.id)) {
          set.add(n.id);
          added = true;
        }
      }
    }
    return set;
  }, [allNotes, note.id]);

  return (
    <div className="relative mb-6">
      {/* Cover Image Banner */}
      {note.coverImage ? (
        <div
          className="group relative h-48 w-full overflow-hidden rounded-2xl transition-all sm:h-56"
          style={{
            background: note.coverImage.startsWith("linear-gradient")
              ? note.coverImage
              : `url(${note.coverImage}) center/cover no-repeat`,
          }}
        >
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-background/80 backdrop-blur-md text-xs hover:bg-background"
              onClick={() => setCoverPickerOpen(true)}
            >
              <ImageIcon className="size-3.5 mr-1" /> Change cover
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-background/80 backdrop-blur-md text-xs hover:bg-background text-destructive"
              onClick={() => onUpdate({ coverImage: null })}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Breadcrumbs & Top Meta Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        {/* Hierarchical Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          {/* Project Layer Breadcrumb */}
          {currentProject ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: getProjectHueColor(currentProject.hue) }}
              />
              <span className="truncate max-w-[120px]">{currentProject.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
              <FileText className="size-3" />
              <span>Unassigned</span>
            </span>
          )}

          <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />

          {/* Ancestor Notes */}
          {ancestors.map((ancestor) => (
            <React.Fragment key={ancestor.id}>
              <button
                type="button"
                onClick={() => onNavigateToNote(ancestor.id)}
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px] cursor-pointer"
                title={`Navigate to ${ancestor.title || "Untitled"}`}
              >
                <span>{ancestor.icon || "📄"}</span>
                <span className="truncate">{ancestor.title || "Untitled"}</span>
              </button>
              <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
            </React.Fragment>
          ))}

          {/* Current Note */}
          <span className="truncate font-semibold text-foreground/90 max-w-[180px]">
            {note.title || "Untitled"}
          </span>
        </div>

        {/* Top Right Save Status & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === "error" || saveStatus === "offline" ? (
            <button
              type="button"
              onClick={() => {
                void persistImmediately();
              }}
              className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer font-medium"
              title="Click to retry saving to MySQL"
            >
              <AlertCircle className="size-3" />
              {saveStatus === "error" ? "Save failed — Click to retry" : "Offline — Pending sync"}
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
              {saveStatus === "saving" ? (
                <>
                  <span className="inline-block size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Saving…
                </>
              ) : saveStatus === "loading" ? (
                <>
                  <span className="inline-block size-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Loading…
                </>
              ) : (
                <>
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                  Synced
                </>
              )}
              <span className="text-muted-foreground/50">·</span> {note.updated}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer"
            aria-label={note.starred ? "Remove from favorites" : "Add to favorites"}
            onClick={() => onUpdate({ starred: !note.starred })}
          >
            <Star
              className={`size-4 ${note.starred ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 cursor-pointer" aria-label="More options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={onDuplicate} className="gap-2 cursor-pointer">
                <Copy className="size-3.5" /> Duplicate note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportMarkdown} className="gap-2 cursor-pointer">
                <Download className="size-3.5" /> Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportJson} className="gap-2 cursor-pointer">
                <Download className="size-3.5" /> Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="size-3.5" /> Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cover / Icon prompt bar if not set */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {!note.coverImage && (
          <button
            type="button"
            onClick={() => setCoverPickerOpen(true)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          >
            <ImageIcon className="size-3.5" /> Add cover
          </button>
        )}
      </div>

      {/* Cover Picker Popover */}
      {coverPickerOpen && (
        <div className="my-3 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold">Choose Cover Gradient</span>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setCoverPickerOpen(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-6">
            {COVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onUpdate({ coverImage: preset.url });
                  setCoverPickerOpen(false);
                }}
                className={`group h-14 rounded-lg p-1.5 text-left text-white shadow-xs transition-transform hover:scale-[1.02] cursor-pointer ${preset.previewClass}`}
              >
                <span className="block truncate text-[10px] font-semibold drop-shadow-sm">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Icon & Title Input */}
      <div className="mt-4 flex items-start gap-3">
        <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Click to change icon"
            >
              {note.icon || "✎"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Select note icon</div>
            <div className="grid grid-cols-6 gap-1 pt-1 text-center text-xl">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="grid size-9 place-items-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    onUpdate({ icon: emoji });
                    setIconPickerOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            aria-label="Note title"
            value={note.title}
            placeholder="Untitled"
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50 sm:text-4xl"
          />

          {/* Notion-style Properties Row: Project & Parent */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Project Assignment Popover */}
            <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Project assignment"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer ${
                    currentProject
                      ? "border border-border/80 bg-muted/60 text-foreground font-medium hover:bg-muted"
                      : "border border-dashed border-border/80 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/60 hover:text-foreground"
                  }`}
                  title={currentProject ? `Project: ${currentProject.name}` : "Assign to a project"}
                >
                  {currentProject ? (
                    <>
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: getProjectHueColor(currentProject.hue) }}
                      />
                      <FolderOpen className="size-3 text-primary" />
                      <span className="truncate max-w-[140px]">{currentProject.name}</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="size-3 text-muted-foreground" />
                      <span>No project (Unassigned)</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-68 p-1.5" align="start">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FolderOpen className="size-3.5 text-primary" />
                    <span>MindDesk Project</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Shared organizational layer across Notes, Tasks & Mind Maps
                  </div>
                </div>

                {projects.length > 4 && (
                  <div className="px-1 py-1 mb-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 size-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search projects…"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs minddesk-scrollbar">
                  {/* Unassign option */}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({ projectId: undefined });
                      setProjectPickerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                      !currentProject
                        ? "bg-accent font-medium text-foreground"
                        : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderMinus className="size-3.5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">Unassigned</div>
                        <div className="text-[10px] text-muted-foreground">Standalone document without a project</div>
                      </div>
                    </div>
                    {!currentProject && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>

                  <div className="my-1 border-t border-border/60" />

                  {/* List of Projects */}
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((proj) => {
                      const isSelected = currentProject?.id === proj.id;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            onUpdate({ projectId: proj.id });
                            setProjectPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent font-medium text-foreground"
                              : "hover:bg-muted/70 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: getProjectHueColor(proj.hue) }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{proj.name}</div>
                              {proj.description && (
                                <div className="truncate text-[10px] text-muted-foreground">
                                  {proj.description}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  ) : projects.length === 0 ? (
                    <div className="py-3 px-2 text-center text-xs text-muted-foreground">
                      No projects exist yet. Create a project in the Projects view to organize notes, tasks, and maps together.
                    </div>
                  ) : (
                    <div className="py-2 px-2 text-center text-xs text-muted-foreground">
                      No matching projects found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Parent Document Selector */}
            <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Parent document"
                  className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                  title="Configure parent document in hierarchy"
                >
                  <FileText className="size-3 text-muted-foreground" />
                  <span>
                    {immediateParent ? `Sub-page of: ${immediateParent.title || "Untitled"}` : "Add parent page"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1.5" align="start">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <div className="text-xs font-semibold text-foreground">Hierarchy Placement</div>
                  <div className="text-[11px] text-muted-foreground">Nest this note under a parent document</div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs minddesk-scrollbar">
                  {/* Detach / top-level option */}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({ parentId: null });
                      setParentPickerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                      !note.parentId
                        ? "bg-accent font-medium text-foreground"
                        : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>(Top-level document / No parent)</span>
                    {!note.parentId && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>

                  <div className="my-1 border-t border-border/60" />

                  {/* Candidate parents excluding self and descendants */}
                  {allNotes
                    .filter((n) => !descendantIds.has(n.id))
                    .map((candidate) => {
                      const isSelected = note.parentId === candidate.id;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => {
                            onUpdate({ parentId: candidate.id });
                            setParentPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent font-medium text-foreground"
                              : "hover:bg-muted/70 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{candidate.icon || "📄"}</span>
                            <span className="truncate">{candidate.title || "Untitled"}</span>
                          </div>
                          {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
