import { createFileRoute } from "@tanstack/react-router";
import { MindDeskAccountPage } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Create account — Mind Desk" }] }),
  component: () => <MindDeskAccountPage mode="sign-up" />,
});