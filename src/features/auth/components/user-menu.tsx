"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronUp, LogIn, LogOut, Settings, User } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import type { AuthUserSummary } from "@/types/domain";

interface UserMenuProps {
  user?: AuthUserSummary | null;
  onNavigate?: () => void;
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ user, onNavigate }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  if (!user) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2 text-xs">
        <div className="flex items-center gap-2 text-foreground-muted">
          <User className="h-3.5 w-3.5" />
          <span className="truncate">Not signed in</span>
        </div>
        <Link
          href="/login"
          onClick={onNavigate}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <LogIn className="h-3 w-3" />
          <span>Sign in</span>
        </Link>
      </div>
    );
  }

  const initials = getInitials(user.fullName, user.email);

  return (
    <div ref={menuRef} className="relative" data-testid="sidebar-user-menu">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open user profile menu"
        data-testid="user-menu-trigger"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-foreground-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="truncate text-xs font-semibold text-foreground"
              data-testid="user-menu-name"
            >
              {user.fullName}
            </p>
            <p
              className="truncate text-[11px] text-foreground-muted"
              data-testid="user-menu-email"
            >
              {user.email}
            </p>
          </div>
        </div>
        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User account actions"
          data-testid="user-menu-dropdown"
          className="absolute right-0 bottom-full left-0 z-50 mb-1.5 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-foreground">
              {user.fullName}
            </p>
            <p className="truncate text-[11px] text-foreground-muted">
              {user.email}
            </p>
          </div>

          <div className="mt-1 space-y-0.5">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-muted"
            >
              <Settings className="h-3.5 w-3.5 text-foreground-muted" />
              <span>Workspace Settings</span>
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                data-testid="logout-button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
