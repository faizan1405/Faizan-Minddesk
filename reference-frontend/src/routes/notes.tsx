import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Notes — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="notes" />,
});