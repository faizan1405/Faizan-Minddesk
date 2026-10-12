import type { Metadata } from "next";
import { ProjectsView } from "@/features/minddesk/library-views";

export const metadata: Metadata = {
  title: "Projects",
  description: "Projects — Mind Desk",
};

export default function ProjectsPage() {
  return <ProjectsView />;
}
