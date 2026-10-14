"use client";

import type { AuthUserSummary } from "@/types/domain";

export interface SyncMigrationBannerProps {
  user?: AuthUserSummary | null;
}

/**
 * @deprecated Permanently decommissioned in MindDesk Notes Rebuild.
 * Legacy prototype data migration prompt is disabled.
 */
export function SyncMigrationBanner() {
  return null;
}
