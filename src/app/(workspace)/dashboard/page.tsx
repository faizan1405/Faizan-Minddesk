import type { Metadata } from "next";
import { DashboardView } from "@/features/minddesk/workspace";

export const metadata: Metadata = {
  title: "Your desk",
  description: "Mind Desk — a calm space for your thoughts.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
