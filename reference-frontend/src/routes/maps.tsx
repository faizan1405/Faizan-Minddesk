import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/maps")({
  head: () => ({ meta: [{ title: "Mind maps — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="maps" />,
});