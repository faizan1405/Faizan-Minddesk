"use client";

import React from "react";
import { ChevronRight, FileText, Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NoteItem } from "../../types";

interface SubpagesSectionProps {
  parentNote: NoteItem;
  subpages: NoteItem[];
  allNotes: NoteItem[];
  onNavigateToNote: (id: string) => void;
  onCreateSubpage: (title?: string) => void;
  onDeleteSubpage?: (id: string) => void;
}

export function SubpagesSection({
  parentNote,
  subpages,
  allNotes,
  onNavigateToNote,
  onCreateSubpage,
  onDeleteSubpage,
}: SubpagesSectionProps) {
  return (
    <section
      aria-label="Subpages section"
      className="my-8 rounded-2xl border border-border/80 bg-card/50 p-4 sm:p-5 shadow-2xs backdrop-blur-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Subpages</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {subpages.length}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateSubpage()}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs"
          title={`Add subpage under ${parentNote.title || "this note"}`}
        >
          <Plus className="size-3.5" />
          <span>Add subpage</span>
        </Button>
      </div>

      {/* Subpages Grid / Empty State */}
      {subpages.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {subpages.map((subpage) => {
            const grandchildren = allNotes.filter((n) => n.parentId === subpage.id);
            return (
              <div
                key={subpage.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigateToNote(subpage.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToNote(subpage.id);
                  }
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:bg-card/90 hover:shadow-xs cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-soft text-sm">
                      {subpage.icon || "📄"}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onDeleteSubpage && (
                        <button
                          type="button"
                          aria-label={`Delete ${subpage.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSubpage(subpage.id);
                          }}
                          className="size-6 grid place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Delete subpage"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                      <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {subpage.title || "Untitled"}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {subpage.excerpt || "No content preview."}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span>{subpage.updated || "Recently"}</span>
                  {grandchildren.length > 0 && (
                    <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 font-medium">
                      <Layers className="size-2.5 text-primary" />
                      <span>{grandchildren.length} nested</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-7 px-4 text-center">
          <div className="grid size-9 place-items-center rounded-xl bg-muted/60 text-muted-foreground mb-2">
            <FileText className="size-4" />
          </div>
          <p className="text-xs font-medium text-foreground">No subpages in this document yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground max-w-sm">
            Nest child documents here by clicking <span className="font-semibold text-foreground">Add subpage</span> or typing{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">/page</code> in the editor.
          </p>
        </div>
      )}
    </section>
  );
}
