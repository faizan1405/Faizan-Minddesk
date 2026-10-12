import { CheckSquare, FileText, FolderKanban, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SAMPLE_PROJECTS = [
  {
    id: "proj-product",
    name: "Product Strategy",
    description:
      "Core product roadmap, user interviews, and high-level architecture mind maps.",
    color: "bg-domain-map",
    tasks: 8,
    notes: 5,
    maps: 2,
  },
  {
    id: "proj-research",
    name: "Knowledge Base",
    description:
      "Long-form engineering notes, design system references, and reading syntheses.",
    color: "bg-domain-note",
    tasks: 4,
    notes: 12,
    maps: 3,
  },
  {
    id: "proj-sprint",
    name: "Q4 Deliverables",
    description:
      "Execution checklists, recurring weekly reviews, and milestone dependency graphs.",
    color: "bg-domain-task",
    tasks: 14,
    notes: 3,
    maps: 1,
  },
];

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Projects
            </h2>
            <Badge variant="secondary">Cross-Domain Containers</Badge>
          </div>
          <p className="text-xs text-foreground-muted">
            Organize tasks, rich-text notes, and mind maps together under unified
            project workspaces.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SAMPLE_PROJECTS.map((project) => (
          <div
            key={project.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-colors hover:border-foreground-muted/40"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className={`h-3 w-3 rounded-full ${project.color}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {project.name}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-foreground-muted">
                {project.description}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5 text-domain-task" />
                {project.tasks}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-domain-note" />
                {project.notes}
              </span>
              <span className="inline-flex items-center gap-1">
                <Network className="h-3.5 w-3.5 text-domain-map" />
                {project.maps}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
