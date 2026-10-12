import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/recent")({
  head: () => ({ meta: [{ title: "Recent — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="recent" />,
});