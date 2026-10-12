import type { Metadata } from "next";
import { MapsView } from "@/features/minddesk/library-views";

export const metadata: Metadata = {
  title: "Mind maps",
  description: "Mind maps — Mind Desk",
};

export default function MapsAliasPage() {
  return <MapsView />;
}
