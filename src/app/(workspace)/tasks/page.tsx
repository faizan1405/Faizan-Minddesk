import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksView } from "@/features/minddesk/tasks-view";

export const metadata: Metadata = {
  title: "Tasks",
  description: "My tasks — Mind Desk",
};

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading tasks…</div>}>
      <TasksView filter="All" />
    </Suspense>
  );
}
