import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";

export const metadata: Metadata = {
  title: "Plan Your Day",
  description: "Plan your day with priorities, time blocking, task synchronization, and daily progress tracking.",
};

export default function PlanYourDayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading daily planner…</div>}>
      <div className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 space-y-4">
        <DailyPlannerWorkspace />
      </div>
    </Suspense>
  );
}
