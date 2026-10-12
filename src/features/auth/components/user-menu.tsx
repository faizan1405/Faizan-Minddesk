"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, LogOut, MoreHorizontal, Settings, UserPlus } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import type { AuthUserSummary } from "@/types/domain";

interface UserMenuProps {
  user?: AuthUserSummary | null;
  onNavigate?: () => void;
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim() || "F";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 1).toUpperCase();
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

  const displayName = user?.fullName || "Faizan";
  const displaySubtitle = user?.email || "Personal workspace";
  const initials = getInitials(displayName, user?.email || "");

  return (
    <div ref={menuRef} className="relative" data-testid="sidebar-user-menu">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open user profile menu"
        data-testid="user-menu-trigger"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className="block truncate text-xs font-medium"
            data-testid="user-menu-name"
          >
            {displayName}
          </span>
          <span
            className="block truncate text-[10px] text-muted-foreground"
            data-testid="user-menu-email"
          >
            {displaySubtitle}
          </span>
        </div>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User account actions"
          data-testid="user-menu-dropdown"
          className="absolute right-0 bottom-full left-0 z-50 mb-1.5 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {displaySubtitle}
            </p>
          </div>

          <div className="mt-1 space-y-0.5">
            {!user && (
              <>
                <Link
                  href="/login"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <LogIn className="size-3.5 text-muted-foreground" />
                  <span>Sign in</span>
                </Link>
                <Link
                  href="/signup"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <UserPlus className="size-3.5 text-muted-foreground" />
                  <span>Create account</span>
                </Link>
              </>
            )}

            <Link
              href="/settings"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
            >
              <Settings className="size-3.5 text-muted-foreground" />
              <span>Workspace Settings</span>
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                data-testid="logout-button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
