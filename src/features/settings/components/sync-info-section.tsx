"use client";

import * as React from "react";
import {
  CheckCircle2,
  Database,
  History,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeskData } from "@/features/minddesk/store";
import type { SyncOverviewInfo } from "@/features/settings/types";

interface SyncInfoSectionProps {
  syncInfo: SyncOverviewInfo;
}

export function SyncInfoSection({ syncInfo }: SyncInfoSectionProps) {
  let syncStatus: "synced" | "saving" | "loading" = "synced";
  let forceSync: (() => Promise<void>) | null = null;

  try {
    const store = useDeskData();
    syncStatus = store.isLoading ? "loading" : "synced";
    forceSync = store.persistImmediately || null;
  } catch {
    // Graceful fallback outside store
  }

  const [isManualSyncing, setIsManualSyncing] = React.useState(false);

  const handleManualSync = async () => {
    if (!forceSync) return;
    setIsManualSyncing(true);
    try {
      await forceSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formattedLastSync = React.useMemo(() => {
    if (!syncInfo.lastSyncedAt) return "Recently synchronized";
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(syncInfo.lastSyncedAt));
    } catch {
      return "Up to date";
    }
  }, [syncInfo.lastSyncedAt]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Cloud Synchronization & Data Governance
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time MySQL synchronization status, data partitioning, and backup policies.
        </p>
      </div>

      {/* Sync Status Banner Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Database className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Hostinger MySQL Cloud Sync
                </span>
                <Badge variant="default" className="text-[10px] py-0 gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Cloud Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every edit in tasks, rich notes, mind maps, and calendar events is saved directly to your private database schema.
              </p>
            </div>
          </div>

          {forceSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus === "loading"}
              className="rounded-xl text-xs gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`size-3.5 ${isManualSyncing || syncStatus === "loading" ? "animate-spin" : ""}`}
              />
              {isManualSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-border">
          <div className="p-3 rounded-xl bg-background/50 border border-border">
            <span className="text-muted-foreground text-[11px] block">Sync State</span>
            <span className="text-foreground font-semibold capitalize flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {isManualSyncing ? "Saving changes..." : syncStatus === "loading" ? "Loading..." : "Synchronized"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-background/50 border border-border">
            <span className="text-muted-foreground text-[11px] block">Last Saved</span>
            <span className="text-foreground font-semibold font-mono text-xs mt-0.5 block">
              {formattedLastSync}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-background/50 border border-border">
            <span className="text-muted-foreground text-[11px] block">Offline Resilience</span>
            <span className="text-foreground font-semibold text-xs mt-0.5 block">
              IndexedDB & Local Cache
            </span>
          </div>
        </div>
      </div>

      {/* Data Ownership & Row-Level Isolation */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <ShieldCheck className="size-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-foreground">Strict Data Ownership</h3>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            MindDesk operates under a zero-leakage, multi-tenant data architecture. All domain records—including
            tasks, subtasks, notes, mind maps, connections, calendar events, habits, and daily plans—are strictly
            partitioned by both your unique <code className="font-mono text-foreground font-semibold">User ID</code> and{" "}
            <code className="font-mono text-foreground font-semibold">Workspace ID</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Lock className="size-3.5 text-primary" /> Row-Level Isolation
              </div>
              <p className="text-[11px]">
                Queries and transactions enforce explicit ownership checks at the API and database levels.
                No other authenticated account can read or alter your workspace records.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <History className="size-3.5 text-indigo-400" /> Note Revision Snapshots
              </div>
              <p className="text-[11px]">
                Rich note edits generate historical recovery snapshots in MySQL, allowing document restoration
                in case of accidental content loss.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery & Data Management Limitations */}
      <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data Recovery & Governance Limitations
        </h4>
        <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4 leading-relaxed">
          <li>
            <strong className="text-foreground">Permanent Deletion:</strong> Items deleted from the trash or explicitly
            purged cannot be recovered.
          </li>
          <li>
            <strong className="text-foreground">Hostinger Cloud Backups:</strong> Database instances are routinely snapshotted
            by the cloud provider for disaster recovery. Individual note rollbacks should be done via note version history.
          </li>
          <li>
            <strong className="text-foreground">Cross-Device Consistency:</strong> When switching devices or tabs, MindDesk
            refetches the latest state from MySQL upon window focus to prevent stale data conflicts.
          </li>
        </ul>
      </div>
    </div>
  );
}
