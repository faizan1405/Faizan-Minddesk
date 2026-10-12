import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Mind Desk" }] }),
  component: () => <MindDeskWorkspace initialView="projects" />,
});