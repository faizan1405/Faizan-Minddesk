"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Settings,
  SunMoon,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/stores/ui-store";
import { Kbd } from "@/components/ui/kbd";

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isOpen = useUIStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  if (!isOpen) {
    return null;
  }

  function runCommand(callback: () => void) {
    setOpen(false);
    callback();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[14vh] backdrop-blur-[2px] overscroll-contain"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      data-testid="command-palette-dialog"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Menu" className="flex flex-col">
          <div className="flex items-center border-b border-border px-3.5">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-foreground-muted" />
            <Command.Input
              autoFocus
              placeholder="Search tasks, notes, mind maps, or type a command..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close command palette"
              className="rounded p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 overscroll-contain">
            <Command.Empty className="py-8 text-center text-sm text-foreground-muted">
              No matching commands or workspace items found.
            </Command.Empty>

            <Command.Group
              heading="Quick Actions"
              className="px-2 py-1.5 text-xs font-semibold tracking-wider text-foreground-muted uppercase"
            >
              <Command.Item
                onSelect={() => runCommand(() => setQuickCaptureOpen(true))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <Plus className="h-4 w-4 text-primary" />
                  Quick Capture Task or Idea
                </span>
                <Kbd keys={["Alt", "C"]} />
              </Command.Item>

              <Command.Item
                onSelect={() =>
                  runCommand(() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  )
                }
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <SunMoon className="h-4 w-4 text-foreground-muted" />
                  Toggle Light / Dark Theme
                </span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Navigation"
              className="mt-1 px-2 py-1.5 text-xs font-semibold tracking-wider text-foreground-muted uppercase"
            >
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4 w-4 text-foreground-muted" />
                  Go to Dashboard
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push("/tasks"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <CheckSquare className="h-4 w-4 text-domain-task" />
                  Go to Tasks
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push("/notes"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-domain-note" />
                  Go to Notes
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push("/mind-maps"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <Network className="h-4 w-4 text-domain-map" />
                  Go to Mind Maps
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push("/projects"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <FolderKanban className="h-4 w-4 text-foreground-muted" />
                  Go to Projects
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push("/settings"))}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-surface-muted"
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-foreground-muted" />
                  Go to Settings
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-3.5 py-2 text-xs text-foreground-muted">
            <span>Navigate with ↑↓ arrows, Enter to select</span>
            <Kbd keys={["Esc"]} />
          </div>
        </Command>
      </div>
    </div>
  );
}
