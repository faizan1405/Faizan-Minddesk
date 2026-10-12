import type { Metadata } from "next";
import { TasksView } from "@/features/minddesk/tasks-view";

export const metadata: Metadata = {
  title: "Tasks",
  description: "My tasks — Mind Desk",
};

export default function TasksPage() {
  return <TasksView />;
}
