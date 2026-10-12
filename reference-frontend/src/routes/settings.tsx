import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="settings" />,
});