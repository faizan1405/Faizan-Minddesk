import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="favorites" />,
});