import { CheckSquare, FileText, Network, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

export default function MindMapsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-domain-map" />
            <h2 className="text-base font-semibold text-foreground">
              Mind Maps
            </h2>
            <Badge variant="map">React Flow Interactive Canvas</Badge>
          </div>
          <p className="text-xs text-foreground-muted">
            Visual idea graphs with first-class MySQL node persistence and
            task/note node bindings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span>Add Child</span>
          <Kbd keys={["Tab"]} />
          <span>Add Sibling</span>
          <Kbd keys={["Enter"]} />
        </div>
      </div>

      {/* Interactive Canvas Architecture Shell */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Root Idea Node Preview */}
          <div className="rounded-xl border-2 border-domain-map/60 bg-surface-muted/50 p-4 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <Badge variant="map">Idea Node</Badge>
              <Sparkles className="h-3.5 w-3.5 text-domain-map" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              MindDesk Core Vision
            </h3>
            <p className="mt-1 text-xs text-foreground-muted">
              Central concept node with keyboard child spawning and customizable
              semantic colors.
            </p>
          </div>

          {/* Linked Task Node Preview */}
          <div className="rounded-xl border border-domain-task/50 bg-surface-muted/50 p-4 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <Badge variant="task">Task-Linked Node</Badge>
              <CheckSquare className="h-3.5 w-3.5 text-domain-task" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Ship Phase 5 Graph Sync
            </h3>
            <p className="mt-1 text-xs text-foreground-muted">
              Reflects live completion status from the Tasks table and supports
              1-click conversion.
            </p>
          </div>

          {/* Linked Note Node Preview */}
          <div className="rounded-xl border border-domain-note/50 bg-surface-muted/50 p-4 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <Badge variant="note">Note-Linked Node</Badge>
              <FileText className="h-3.5 w-3.5 text-domain-note" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Graph Diff Specification
            </h3>
            <p className="mt-1 text-xs text-foreground-muted">
              Displays live note excerpts and opens the linked Tiptap document
              in the side inspector.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
