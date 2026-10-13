"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Flame,
  CalendarDays,
  ListTodo,
  Activity,
  SlidersHorizontal,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useNotifications } from "../context/notification-context";
import { NotificationPreferencesDialog } from "./notification-preferences-dialog";
import type { NotificationCategory, NotificationRecord } from "../types";
import { Button } from "@/components/ui/button";

export function NotificationCenterWorkspace() {
  const {
    activeNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    snoozeNotification,
  } = useNotifications();

  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [preferencesOpen, setPreferencesOpen] = useState<boolean>(false);

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "tasks":
        return <ListTodo size={16} className="text-blue-500" />;
      case "calendar":
        return <CalendarDays size={16} className="text-purple-500" />;
      case "time_blocks":
        return <Clock size={16} className="text-amber-500" />;
      case "habits":
        return <Flame size={16} className="text-orange-500" />;
      case "routines":
        return <Activity size={16} className="text-indigo-500" />;
      default:
        return <Bell size={16} className="text-primary" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    return activeNotifications.filter((n) => {
      const matchesCategory = categoryFilter === "all" || n.category === categoryFilter;
      const matchesUnread = !unreadOnly || !n.read;
      return matchesCategory && matchesUnread;
    });
  }, [activeNotifications, categoryFilter, unreadOnly]);

  const handleOpenItem = (item: NotificationRecord) => {
    markAsRead(item.id);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              <Sparkles size={12} /> Smart Reminders Center
            </span>
            {unreadCount > 0 && (
              <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Notifications & Smart Reminders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Deduplicated alerts for tasks, calendar events, focus sessions, habits, and routines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              <CheckCheck size={14} className="mr-1.5" /> Mark All Read
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setPreferencesOpen(true)}
            className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            <SlidersHorizontal size={14} className="mr-1.5" /> Preferences
          </Button>
        </div>
      </header>

      {/* Filter Chips Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 minddesk-scrollbar text-xs">
          {[
            { id: "all", label: "All Alerts" },
            { id: "tasks", label: "Tasks" },
            { id: "calendar", label: "Calendar" },
            { id: "time_blocks", label: "Time Blocks" },
            { id: "habits", label: "Habits" },
            { id: "routines", label: "Routines" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Unread Only Toggle */}
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded border-input text-primary"
          />
          <span>Unread only</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 transition-all ${
                !notif.read
                  ? "border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-xs"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {/* Main Info */}
              <div className="flex items-start gap-3.5 min-w-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary shadow-2xs mt-0.5">
                  {getCategoryIcon(notif.category)}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm ${
                        !notif.read ? "font-bold text-foreground" : "font-medium text-foreground"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {notif.category.replace("_", " ")}
                    </span>
                    {!notif.read && (
                      <span className="size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end text-xs">
                {/* Snooze presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => snoozeNotification(notif.id, 10)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                    title="Snooze for 10 minutes"
                  >
                    10m
                  </button>
                  <button
                    type="button"
                    onClick={() => snoozeNotification(notif.id, 30)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                    title="Snooze for 30 minutes"
                  >
                    30m
                  </button>
                </div>

                {!notif.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(notif.id)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> Read
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => dismissNotification(notif.id)}
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer"
                  title="Dismiss alert"
                >
                  <Trash2 size={13} />
                </button>

                {notif.actionUrl && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenItem(notif)}
                    className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-3 cursor-pointer"
                  >
                    <span>Open</span>
                    <ExternalLink size={11} className="ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-2">
            <Bell size={28} className="mx-auto text-muted-foreground/40" />
            <h3 className="text-sm font-bold text-foreground">No notifications found</h3>
            <p className="text-xs text-muted-foreground">
              You are all caught up. Reminders will appear as your scheduled tasks and habits arrive.
            </p>
          </div>
        )}
      </div>

      <NotificationPreferencesDialog
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </div>
  );
}
