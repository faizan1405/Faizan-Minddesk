import React, { useState } from "react";
import {
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  MoreHorizontal,
  Star,
  Trash2,
  Copy,
  Download,
  X,
  FileText,
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
import { COVER_PRESETS, EMOJI_OPTIONS } from "../types";

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
  saveStatus: "saved" | "saving" | "unsaved";
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
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Parent note breadcrumb resolution
  const parentNote = note.parentId ? allNotes.find((n) => n.id === note.parentId) : null;
  const currentProject = projects.find((p) => p.id === note.projectId) || projects[0];

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
        <div className="flex items-center gap-1.5 min-w-0">
          {parentNote ? (
            <>
              <button
                type="button"
                onClick={() => onNavigateToNote(parentNote.id)}
                className="flex items-center gap-1 truncate font-medium hover:text-foreground transition-colors"
              >
                <span>{parentNote.icon}</span>
                <span className="truncate">{parentNote.title}</span>
              </button>
              <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
            </>
          ) : null}
          <span className="truncate font-semibold text-foreground/80">{note.title || "Untitled"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground/70">
            {saveStatus === "saving" ? "Saving…" : "Saved in this browser"} · {note.updated}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={note.starred ? "Remove from favorites" : "Add to favorites"}
            onClick={() => onUpdate({ starred: !note.starred })}
          >
            <Star
              className={`size-4 ${note.starred ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="More options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={onDuplicate} className="gap-2">
                <Copy className="size-3.5" /> Duplicate note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportMarkdown} className="gap-2">
                <Download className="size-3.5" /> Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportJson} className="gap-2">
                <Download className="size-3.5" /> Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
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
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
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
                className={`group h-14 rounded-lg p-1.5 text-left text-white shadow-xs transition-transform hover:scale-[1.02] ${preset.previewClass}`}
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
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl shadow-xs transition-transform hover:scale-105 active:scale-95"
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
                  className="grid size-9 place-items-center rounded-lg hover:bg-accent transition-colors"
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

          {/* Project & Parent Metadata Row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <FolderOpen className="size-3 text-primary" />
                  <span>{currentProject?.name || "Personal"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">Assign Project</div>
                <div className="flex flex-col gap-0.5 text-xs">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => onUpdate({ projectId: proj.id })}
                      className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent"
                    >
                      <span>{proj.icon}</span>
                      <span className="truncate">{proj.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Parent Document Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <FileText className="size-3 text-muted-foreground" />
                  <span>{parentNote ? `Sub-page of: ${parentNote.title}` : "Add parent page"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-1" align="start">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">Parent Document</div>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onUpdate({ parentId: null })}
                    className="rounded px-2 py-1 text-left hover:bg-accent text-muted-foreground"
                  >
                    (No parent / Top-level document)
                  </button>
                  {allNotes
                    .filter((n) => n.id !== note.id && n.parentId !== note.id) // Prevent self or direct cycle
                    .map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onUpdate({ parentId: n.id })}
                        className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent"
                      >
                        <span>{n.icon}</span>
                        <span className="truncate">{n.title}</span>
                      </button>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
