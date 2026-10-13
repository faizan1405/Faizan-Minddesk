"use client";

import * as React from "react";
import {
  CloudUpload,
  Download,
  CheckCircle2,
  X,
  Loader2,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeskData } from "../store";
import { exportLocalBackup } from "../utils/backup";
import type { AuthUserSummary } from "@/types/domain";

export interface SyncMigrationBannerProps {
  user?: AuthUserSummary | null;
}

export function SyncMigrationBanner({ user }: SyncMigrationBannerProps) {
  const { data, hasUnsyncedLocalData, syncLocalDataToAccount } = useDeskData();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncSuccess, setSyncSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // If dismissed or no user or no unsynced local data, do not render
  if (isDismissed || !user || !hasUnsyncedLocalData) {
    return null;
  }

  const taskCount = data.tasks?.length ?? 0;
  const noteCount = data.notes?.length ?? 0;
  const mapCount = data.maps?.length ?? 0;
  const eventCount = data.events?.length ?? 0;
  const habitCount = data.habits?.length ?? 0;

  const handleDownloadBackup = () => {
    exportLocalBackup(data, `minddesk-${user.email.split("@")[0]}-backup`);
  };

  const handleSyncToAccount = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await syncLocalDataToAccount();
      if (res.success) {
        setSyncSuccess(true);
        setTimeout(() => {
          setIsDismissed(true);
        }, 3500);
      } else {
        setErrorMessage(res.error || "Failed to sync content to database.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Sync connection error."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Local Data Synchronization"
      className="mx-4 mt-3 mb-2 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {syncSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <CloudUpload className="h-5 w-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {syncSuccess
                ? "Desktop content successfully synced to your cloud account!"
                : "Desktop content found on this device"}
            </h4>
            <p className="mt-0.5 text-xs text-foreground-muted">
              {syncSuccess
                ? "All your records are now safely stored in MySQL. You can log in on mobile to access them."
                : "You have desktop-created items stored locally in this browser. Sync them to your account to access them on mobile and across all your devices."}
            </p>

            {!syncSuccess && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-md bg-surface-muted/80 px-2 py-0.5 text-foreground">
                  {taskCount} {taskCount === 1 ? "task" : "tasks"}
                </span>
                <span className="rounded-md bg-surface-muted/80 px-2 py-0.5 text-foreground">
                  {noteCount} {noteCount === 1 ? "note" : "notes"}
                </span>
                {mapCount > 0 && (
                  <span className="rounded-md bg-surface-muted/80 px-2 py-0.5 text-foreground">
                    {mapCount} {mapCount === 1 ? "map" : "maps"}
                  </span>
                )}
                {eventCount > 0 && (
                  <span className="rounded-md bg-surface-muted/80 px-2 py-0.5 text-foreground">
                    {eventCount} events
                  </span>
                )}
                {habitCount > 0 && (
                  <span className="rounded-md bg-surface-muted/80 px-2 py-0.5 text-foreground">
                    {habitCount} habits
                  </span>
                )}
              </div>
            )}

            {errorMessage && (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {!syncSuccess && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadBackup}
                className="gap-1.5 text-xs font-medium"
                title="Download a local JSON copy before syncing"
              >
                <Download className="h-3.5 w-3.5" />
                Backup JSON
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={isSyncing}
                onClick={handleSyncToAccount}
                className="gap-1.5 text-xs font-medium"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5" />
                    Sync to Account
                  </>
                )}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-8 w-8 p-0 text-foreground-muted hover:text-foreground"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
