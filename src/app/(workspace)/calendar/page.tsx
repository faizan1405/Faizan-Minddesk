import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { CalendarWorkspace } from "@/features/calendar/components/calendar-workspace";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Personal productivity calendar with Google Calendar-inspired scheduling, recurrence, and time blocking.",
};

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading calendar…</div>}>
        <div className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 space-y-4">
          <CalendarWorkspace />
        </div>
      </Suspense>
    </CalendarProvider>
  );
}
