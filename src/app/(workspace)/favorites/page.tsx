import type { Metadata } from "next";
import { FavoritesView } from "@/features/minddesk/workspace";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Favorites — Mind Desk",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
