"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandIcon, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDeskData } from "@/features/minddesk/store";
import { mainLinks } from "@/features/minddesk/workspace";
import {
  workspaceRoutes,
  type WorkspaceView,
} from "@/features/minddesk/workspace-types";
import { useUIStore } from "@/stores/ui-store";

export function CommandPalette() {
  const router = useRouter();
  const { data, setSelectedItem } = useDeskData();
  const isOpen = useUIStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const [query, setQuery] = React.useState("");

  const searchItems = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return [
      ...data.tasks
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({
          id: item.id,
          label: item.title,
          kind: "Task",
          view: "tasks" as WorkspaceView,
        })),
      ...data.notes
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({
          id: item.id,
          label: item.title,
          kind: "Note",
          view: "notes" as WorkspaceView,
        })),
      ...data.maps
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({
          id: item.id,
          label: item.title,
          kind: "Mind map",
          view: "maps" as WorkspaceView,
        })),
      ...data.projects
        .filter((item) => item.name.toLowerCase().includes(text))
        .map((item) => ({
          id: item.id,
          label: item.name,
          kind: "Project",
          view: "projects" as WorkspaceView,
        })),
    ].slice(0, 8);
  }, [data.maps, data.notes, data.projects, data.tasks, query]);

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    setOpen(false);
    setQuery("");
  }

  function navigate(view: WorkspaceView, itemId?: string) {
    setSelectedItem(itemId ?? null);
    handleClose();
    router.push(workspaceRoutes[view]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-[15vh] overscroll-contain"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search your workspace"
      data-testid="command-palette-dialog"
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            aria-label="Search your workspace"
            className="h-14 border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Search tasks, notes, projects…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close search"
            className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="minddesk-scrollbar max-h-80 overflow-y-auto p-2">
          {query.trim() ? (
            searchItems.length ? (
              searchItems.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent"
                  onClick={() => navigate(item.view, item.id)}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-muted">
                    <Search className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.kind}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing found. Try another search.
              </p>
            )
          ) : (
            <div className="p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Jump to
              </p>
              <div className="grid grid-cols-2 gap-2">
                {mainLinks.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(id)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-accent"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <CommandIcon className="size-3" /> Search across your workspace
        </div>
      </div>
    </div>
  );
}
