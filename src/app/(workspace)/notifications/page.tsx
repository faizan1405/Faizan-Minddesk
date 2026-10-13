import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationCenterWorkspace } from "@/features/notifications/components/notification-center-workspace";

export const metadata: Metadata = {
  title: "Notifications & Reminders",
  description:
    "Central notification center for MindDesk tasks, calendar events, focus sessions, habits, and routines.",
};

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          Loading notifications…
        </div>
      }
    >
      <div className="p-4 sm:p-6">
        <NotificationCenterWorkspace />
      </div>
    </Suspense>
  );
}
