"use client";

import React from "react";
import { FileText, FolderOpen, Layers } from "lucide-react";
import type { ProjectItem, NoteItem } from "../../types";
import { type ProjectFilterValue, getProjectHueColor } from "../types";

interface ProjectFilterProps {
  projects: ProjectItem[];
  notes: NoteItem[];
  value: ProjectFilterValue;
  onChange: (val: ProjectFilterValue) => void;
  className?: string;
  compact?: boolean;
}

export function ProjectFilter({
  projects,
  notes,
  value,
  onChange,
  className = "",
  compact = false,
}: ProjectFilterProps) {
  // Precompute note counts
  const validProjectIds = React.useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const totalCount = notes.length;

  const unassignedCount = React.useMemo(() => {
    return notes.filter((n) => !n.projectId || !validProjectIds.has(n.projectId)).length;
  }, [notes, validProjectIds]);

  const projectCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (n.projectId && validProjectIds.has(n.projectId)) {
        counts[n.projectId] = (counts[n.projectId] || 0) + 1;
      }
    }
    return counts;
  }, [notes, validProjectIds]);

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3 text-primary" />
            Filter by Project
          </span>
          {value !== "all" && (
            <button
              type="button"
              onClick={() => onChange("all")}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs minddesk-scrollbar">
          {/* All projects */}
          <button
            type="button"
            onClick={() => onChange("all")}
            className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-all cursor-pointer ${
              value === "all"
                ? "bg-primary text-primary-foreground font-medium shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>All projects</span>
            <span
              className={`text-[10px] rounded-full px-1 ${
                value === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Unassigned */}
          <button
            type="button"
            onClick={() => onChange("unassigned")}
            className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-all cursor-pointer ${
              value === "unassigned"
                ? "bg-primary text-primary-foreground font-medium shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <FileText className="size-2.5" />
            <span>Unassigned</span>
            <span
              className={`text-[10px] rounded-full px-1 ${
                value === "unassigned" ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {unassignedCount}
            </span>
          </button>

          {/* Projects */}
          {projects.map((proj) => {
            const isSelected = value === proj.id;
            const count = projectCounts[proj.id] || 0;
            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => onChange(isSelected ? "all" : proj.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: getProjectHueColor(proj.hue) }}
                />
                <span className="truncate max-w-[100px]">{proj.name}</span>
                <span
                  className={`text-[10px] rounded-full px-1 ${
                    isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3.5 text-primary" />
            <span>Filter by Project</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground/70">
            · Shared workspace projects
          </span>
        </div>

        {value !== "all" && (
          <button
            type="button"
            onClick={() => onChange("all")}
            className="text-xs text-primary hover:underline transition-colors cursor-pointer font-medium"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {/* All Notes Pill */}
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer ${
            value === "all"
              ? "bg-primary text-primary-foreground font-medium shadow-xs"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          <span>All Notes</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
              value === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Unassigned Pill */}
        <button
          type="button"
          onClick={() => onChange("unassigned")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer ${
            value === "unassigned"
              ? "bg-primary text-primary-foreground font-medium shadow-xs"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Unassigned</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
              value === "unassigned"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {unassignedCount}
          </span>
        </button>

        {/* Project Pills */}
        {projects.map((proj) => {
          const isSelected = value === proj.id;
          const count = projectCounts[proj.id] || 0;
          return (
            <button
              key={proj.id}
              type="button"
              onClick={() => onChange(isSelected ? "all" : proj.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground font-medium shadow-xs"
                  : "border border-border/70 bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: getProjectHueColor(proj.hue) }}
              />
              <span className="truncate max-w-[140px] font-medium">{proj.name}</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {projects.length === 0 && (
          <span className="text-xs text-muted-foreground/60 italic py-1">
            (No projects created yet in MindDesk)
          </span>
        )}
      </div>
    </div>
  );
}
