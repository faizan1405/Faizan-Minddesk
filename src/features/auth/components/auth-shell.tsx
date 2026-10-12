import * as React from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CheckSquare,
  FileText,
  Network,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-background text-foreground selection:bg-primary/20">
      {/* Subtle ambient radial gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl dark:bg-primary/12" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">MindDesk</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            <ShieldCheck className="h-3 w-3 text-domain-note" />
            End-to-End RLS Protected
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* Centered Auth Card (kept near top on mobile so virtual keyboards never obstruct submit buttons) */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-start px-4 pt-2 pb-8 sm:justify-center sm:pt-0">
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-xs leading-relaxed text-foreground-muted">
              {subtitle}
            </p>
          </div>

          {children}

          {footer && (
            <div className="mt-6 border-t border-border pt-5 text-center text-xs text-foreground-muted">
              {footer}
            </div>
          )}
        </div>

        {/* Workspace Domain Pillars Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-foreground-muted">
          <span className="inline-flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-domain-task" />
            Tasks
          </span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-domain-note" />
            Rich Notes
          </span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5 text-domain-map" />
            Mind Maps
          </span>
        </div>
      </main>
    </div>
  );
}
