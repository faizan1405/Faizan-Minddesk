import type { Metadata } from "next";
import { Suspense } from "react";
import { HabitsWorkspace } from "@/features/habits/components/habits-workspace";

export const metadata: Metadata = {
  title: "Habits & Routines",
  description:
    "Build consistent habits, track streaks, execute daily routines, and block dedicated focus time in MindDesk.",
};

export default function HabitsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          Loading habits and routines…
        </div>
      }
    >
      <div className="p-4 sm:p-6">
        <HabitsWorkspace />
      </div>
    </Suspense>
  );
}
