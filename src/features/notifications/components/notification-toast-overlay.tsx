"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Clock,
  X,
  ExternalLink,
  Flame,
  CalendarDays,
  ListTodo,
  Activity,
} from "lucide-react";
import { useNotifications } from "../context/notification-context";
import type { NotificationCategory } from "../types";

export function NotificationToastOverlay() {
  const { activeToast, clearActiveToast, markAsRead, snoozeNotification } =
    useNotifications();
  const router = useRouter();

  // Auto-hide toast banner after 8 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        clearActiveToast();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeToast, clearActiveToast]);

  if (!activeToast) return null;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "tasks":
        return <ListTodo size={15} className="text-blue-500" />;
      case "calendar":
        return <CalendarDays size={15} className="text-purple-500" />;
      case "time_blocks":
        return <Clock size={15} className="text-amber-500" />;
      case "habits":
        return <Flame size={15} className="text-orange-500" />;
      case "routines":
        return <Activity size={15} className="text-indigo-500" />;
      default:
        return <Bell size={15} className="text-primary" />;
    }
  };

  const handleOpen = () => {
    markAsRead(activeToast.id);
    clearActiveToast();
    if (activeToast.actionUrl) {
      router.push(activeToast.actionUrl);
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 w-full max-w-sm sm:max-w-md animate-fade-in-up"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary mt-0.5">
              {getCategoryIcon(activeToast.category)}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-foreground text-xs truncate">
                {activeToast.title}
              </h4>
              <p className="mt-0.5 text-muted-foreground text-[11px] line-clamp-2">
                {activeToast.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearActiveToast}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X size={14} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => snoozeNotification(activeToast.id, 10)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Snooze 10m
            </button>
            <button
              type="button"
              onClick={() => snoozeNotification(activeToast.id, 30)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
            >
              30m
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => markAsRead(activeToast.id)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
            >
              <Check size={12} /> Read
            </button>
            {activeToast.actionUrl && (
              <button
                type="button"
                onClick={handleOpen}
                className="rounded-lg bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Open</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
