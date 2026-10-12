import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="tasks" />,
});