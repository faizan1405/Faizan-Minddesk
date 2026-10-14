"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ListTodo, Map, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeskData } from "@/features/minddesk/store";
import type { TaskItem } from "@/features/minddesk/types";
import { createDefaultMindMap } from "@/features/minddesk/utils/mind-map-utils";
import { useUIStore } from "@/stores/ui-store";

type CaptureType = "task" | "note" | "map";

export function QuickCaptureModal() {
  const router = useRouter();
  const { update, setSelectedItem } = useDeskData();
  const isOpen = useUIStore((state) => state.isQuickCaptureOpen);
  const setOpen = useUIStore((state) => state.setQuickCaptureOpen);
  const [quickType, setQuickType] = React.useState<CaptureType>("task");
  const [quickDraft, setQuickDraft] = React.useState("");

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    setQuickDraft("");
    setOpen(false);
  }

  function createQuick(event: React.FormEvent) {
    event.preventDefault();
    const title = quickDraft.trim();
    if (!title) return;

    if (quickType === "task") {
      const task: TaskItem = {
        id: crypto.randomUUID(),
        title,
        note: "",
        due: "Today",
        priority: "medium",
        complete: false,
        starred: false,
        projectId: "personal",
        subtasks: [],
      };
      update((current) => ({ ...current, tasks: [task, ...current.tasks] }));
      setSelectedItem(null);
      handleClose();
      router.push("/tasks");
    } else if (quickType === "note") {
      const id = crypto.randomUUID();
      update((current) => ({
        ...current,
        notes: [
          {
            id,
            title,
            excerpt: "A new note, ready to unfold.",
            content: `${title}\n\n`,
            icon: "✎",
            updated: "Just now",
            projectId: "personal",
            starred: false,
          },
          ...current.notes,
        ],
      }));
      setSelectedItem(id);
      handleClose();
      router.push("/notes");
    } else {
      const newMap = createDefaultMindMap(title);
      update((current) => ({
        ...current,
        maps: [newMap, ...current.maps],
      }));
      setSelectedItem(newMap.id);
      handleClose();
      router.push("/mind-maps");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overscroll-contain"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Capture a thought"
      data-testid="quick-capture-dialog"
    >
      <div
        className="relative grid w-full max-w-lg gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Capture a thought
          </h2>
          <p className="text-sm text-muted-foreground">
            Put it somewhere you can find it again.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close quick capture"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>

        <div className="grid grid-cols-3 gap-2">
          {(["task", "note", "map"] as const).map((kind) => (
            <Button
              key={kind}
              type="button"
              variant={quickType === kind ? "secondary" : "outline"}
              onClick={() => setQuickType(kind)}
            >
              {kind === "task" ? (
                <ListTodo />
              ) : kind === "note" ? (
                <FileText />
              ) : (
                <Map />
              )}
              {kind === "task" ? "Task" : kind === "note" ? "Note" : "Mind map"}
            </Button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={createQuick}>
          <Input
            autoFocus
            aria-label={`${quickType} title`}
            placeholder={
              quickType === "task"
                ? "What needs doing?"
                : quickType === "note"
                  ? "Give this note a name…"
                  : "What are you exploring?"
            }
            value={quickDraft}
            onChange={(event) => setQuickDraft(event.target.value)}
          />
          <Button type="submit" disabled={!quickDraft.trim()}>
            <Plus /> Create
          </Button>
        </form>
      </div>
    </div>
  );
}
