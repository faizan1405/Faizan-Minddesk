"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CloudOff,
  Loader2,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  idle: {
    label: "Ready",
    icon: CircleDot,
    className: "text-foreground-muted border-border bg-surface-muted/40",
    iconClassName: "text-foreground-muted",
  },
  saved: {
    label: "Saved",
    icon: CheckCircle2,
    className: "text-foreground-muted border-border bg-surface-muted/60",
    iconClassName: "text-domain-note",
  },
  saving: {
    label: "Saving...",
    icon: Loader2,
    className: "text-foreground border-primary/30 bg-primary/5",
    iconClassName: "text-primary animate-spin",
  },
  offline: {
    label: "Offline — buffered locally",
    icon: CloudOff,
    className:
      "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    iconClassName: "text-amber-500",
  },
  conflict: {
    label: "Conflict detected",
    icon: AlertTriangle,
    className: "text-danger border-danger/30 bg-danger/10",
    iconClassName: "text-danger",
  },
} as const;

export function SaveStatusBadge() {
  const saveStatus = useUIStore((state) => state.saveStatus);
  const config = STATUS_CONFIG[saveStatus];
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="save-status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        config.className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconClassName)} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
