import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  keys?: string[];
}

export function Kbd({ className, keys, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 font-mono text-[11px] font-medium text-foreground-muted",
        className
      )}
      {...props}
    >
      {keys ? keys.join(" ") : children}
    </kbd>
  );
}
