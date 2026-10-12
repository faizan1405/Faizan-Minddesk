import type { Metadata } from "next";
import { RecentView } from "@/features/minddesk/workspace";

export const metadata: Metadata = {
  title: "Recent",
  description: "Recent — Mind Desk",
};

export default function RecentPage() {
  return <RecentView />;
}
