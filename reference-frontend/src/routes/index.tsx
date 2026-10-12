import { createFileRoute } from "@tanstack/react-router";
import { MindDeskWorkspace } from "@/features/minddesk/workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mind Desk" },
      { name: "description", content: "Mind Desk — a calm space for your thoughts." },
      { property: "og:title", content: "Mind Desk" },
      { property: "og:description", content: "Mind Desk — a calm space for your thoughts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MindDeskWorkspace,
});
