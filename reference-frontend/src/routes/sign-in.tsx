import { createFileRoute } from "@tanstack/react-router";
import { MindDeskAccountPage } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — Mind Desk" }] }),
  component: () => <MindDeskAccountPage mode="sign-in" />,
});