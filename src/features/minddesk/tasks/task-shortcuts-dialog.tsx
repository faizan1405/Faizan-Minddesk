"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

export interface TaskShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { key: "Enter", description: "Create or confirm task creation" },
  { key: "Esc", description: "Cancel editing or close dialogs" },
  { key: "Space", description: "Toggle completion of selected task" },
  { key: "↑ / ↓", description: "Navigate between tasks" },
  { key: "⌘ / Ctrl + Z", description: "Undo last task completion or delete" },
  { key: "⌘ / Ctrl + ]", description: "Indent / add subtask" },
  { key: "⌘ / Ctrl + [", description: "Outdent / promote subtask" },
  { key: "?", description: "Open keyboard shortcuts reference" },
];

export function TaskShortcutsDialog({
  open,
  onOpenChange,
}: TaskShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-card border-border">
        <DialogHeader className="flex flex-row items-center gap-2.5 pb-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Keyboard className="size-4" />
          </div>
          <DialogTitle className="text-base font-semibold">
            Google Tasks Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border/60 text-xs pt-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-muted-foreground">{description}</span>
              <Kbd className="font-mono text-[11px] px-2 py-0.5">{key}</Kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
