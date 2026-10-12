import { createFileRoute } from "@tanstack/react-router";
import { MindDeskAccountPage } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Mind Desk" }] }),
  component: () => <MindDeskAccountPage mode="forgot" />,
});