import type { Metadata } from "next";
import { NotesView } from "@/features/minddesk/library-views";

export const metadata: Metadata = {
  title: "Notes",
  description: "Notes — Mind Desk",
};

export default function NotesPage() {
  return <NotesView />;
}
