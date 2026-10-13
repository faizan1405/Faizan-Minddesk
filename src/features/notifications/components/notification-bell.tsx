"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Flame,
  CalendarDays,
  ListTodo,
  Activity,
  SlidersHorizontal,
} from "lucide-react";
import { useNotifications } from "../context/notification-context";
import { NotificationPreferencesDialog } from "./notification-preferences-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { NotificationCategory, NotificationRecord } from "../types";

export function NotificationBell() {
  const {
    activeNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    snoozeNotification,
  } = useNotifications();

  const router = useRouter();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "tasks":
        return <ListTodo size={14} className="text-blue-500" />;
      case "calendar":
        return <CalendarDays size={14} className="text-purple-500" />;
      case "time_blocks":
        return <Clock size={14} className="text-amber-500" />;
      case "habits":
        return <Flame size={14} className="text-orange-500" />;
      case "routines":
        return <Activity size={14} className="text-indigo-500" />;
      default:
        return <Bell size={14} className="text-primary" />;
    }
  };

  const handleOpenItem = (item: NotificationRecord) => {
    markAsRead(item.id);
    setMenuOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const recentNotifications = activeNotifications.slice(0, 6);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notification Center"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground animate-scale-in">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl border border-border bg-card overflow-hidden text-xs"
        >
          {/* Dropdown Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} /> Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setPreferencesOpen(true);
                }}
                className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer"
                title="Notification Preferences"
              >
                <SlidersHorizontal size={13} />
              </button>
            </div>
          </div>

          {/* List of Recent Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40 minddesk-scrollbar">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative flex items-start gap-3 p-3.5 transition-colors ${
                    !notif.read ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  {/* Category icon */}
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Text content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4
                        className={`text-xs truncate ${
                          !notif.read ? "font-bold text-foreground" : "font-medium text-foreground"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Quick action buttons on hover / mobile */}
                    <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                      {notif.actionUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenItem(notif)}
                          className="font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          Open <ExternalLink size={10} />
                        </button>
                      )}

                      <span className="text-muted-foreground">•</span>

                      <button
                        type="button"
                        onClick={() => snoozeNotification(notif.id, 10)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Snooze 10m
                      </button>

                      <span className="text-muted-foreground">•</span>

                      <button
                        type="button"
                        onClick={() => dismissNotification(notif.id)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground space-y-1.5">
                <Bell size={24} className="mx-auto opacity-30" />
                <p className="font-semibold text-xs text-foreground">All caught up</p>
                <p className="text-[11px]">No active smart reminders right now.</p>
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="border-t border-border p-2 bg-muted/20 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              View Full Notification Center
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationPreferencesDialog
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  );
}
