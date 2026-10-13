import type { DeskData } from "../types";

export interface BackupPayload {
  app: "MindDesk";
  version: number;
  exportedAt: string;
  data: DeskData;
}

/**
 * Serializes desk data into a timestamped MindDesk backup JSON string.
 */
export function getLocalBackupJson(data: DeskData): string {
  const payload: BackupPayload = {
    app: "MindDesk",
    version: data.version ?? 3,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Triggers a browser file download of the desk data backup.
 */
export function exportLocalBackup(
  data: DeskData,
  filenamePrefix = "minddesk-backup"
): void {
  if (typeof window === "undefined") return;

  const json = getLocalBackupJson(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${filenamePrefix}-${dateStr}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses a backup JSON string.
 */
export function parseLocalBackup(jsonStr: string): DeskData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") return null;

    if ("app" in parsed && parsed.app === "MindDesk" && "data" in parsed) {
      return parsed.data as DeskData;
    }

    // Direct DeskData object
    if ("tasks" in parsed || "notes" in parsed || "maps" in parsed) {
      return parsed as DeskData;
    }

    return null;
  } catch {
    return null;
  }
}
