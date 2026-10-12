import { FileText, Link2, Pin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

const SAMPLE_NOTES = [
  {
    id: "n-1",
    title: "MindDesk Architecture & Sync Protocol",
    excerpt:
      "Write-ahead local recovery buffer paired with optimistic version counters in PostgreSQL...",
    updatedAt: "Just now",
    pinned: true,
    backlinks: 4,
  },
  {
    id: "n-2",
    title: "Q4 Product Discovery & User Research",
    excerpt:
      "Key workflows connecting daily tasks with structured long-form documentation and visual maps...",
    updatedAt: "2 hours ago",
    pinned: true,
    backlinks: 2,
  },
  {
    id: "n-3",
    title: "Keyboard-First Ergonomics Reference",
    excerpt:
      "Designing zero-latency slash commands (/), inline entity mentions ([[), and graph navigation...",
    updatedAt: "Yesterday",
    pinned: false,
    backlinks: 3,
  },
];

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-domain-note" />
            <h2 className="text-base font-semibold text-foreground">Notes</h2>
            <Badge variant="note">Notion-Inspired Tiptap Editor</Badge>
          </div>
          <p className="text-xs text-foreground-muted">
            Distraction-free rich-text documents with slash commands, [[
            cross-links, and version snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <span>Slash Menu</span>
          <Kbd keys={["/"]} />
          <span>Link Entity</span>
          <Kbd keys={["[["]} />
        </div>
      </div>

      {/* Notes Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {SAMPLE_NOTES.map((note) => (
          <article
            key={note.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-foreground-muted/40"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {note.title}
                </h3>
                {note.pinned && (
                  <Pin className="h-3.5 w-3.5 shrink-0 text-domain-note" />
                )}
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-foreground-muted">
                {note.excerpt}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-foreground-muted">
              <span>{note.updatedAt}</span>
              <span className="inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {note.backlinks} links
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Editor Measure Preview */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mx-auto max-w-[70ch] space-y-3">
          <div className="flex items-center gap-2 text-xs text-domain-note">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Reading Canvas Typography Preview (16px / 1.65 line-height)</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Connected Knowledge Without Friction
          </h3>
          <p className="text-base leading-[1.65] text-foreground/90">
            In Phase 4, this reading surface hosts the interactive Tiptap
            ProseMirror editor with debounced write-ahead auto-saving, inline
            task checklists, and bi-directional entity chips linking directly to
            tasks and mind-map nodes.
          </p>
        </div>
      </div>
    </div>
  );
}
