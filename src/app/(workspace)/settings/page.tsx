import type { Metadata } from "next";
import { SettingsView } from "@/features/minddesk/workspace";

export const metadata: Metadata = {
  title: "Settings",
  description: "Settings — Mind Desk",
};

export default function SettingsPage() {
  return <SettingsView />;
}
