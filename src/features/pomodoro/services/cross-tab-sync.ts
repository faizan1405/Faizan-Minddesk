/**
 * MINDDESK — POMODORO & FOCUS SUBSYSTEM
 * Cross-Tab Synchronization Bus
 *
 * Employs BroadcastChannel with window 'storage' fallback
 * to maintain consistent timer state and prevent duplicate sessions across multiple tabs.
 */

import { CrossTabSyncMessage, CrossTabSyncBroadcast } from "../types";

const CHANNEL_NAME = "minddesk_pomodoro_sync_channel";

export class CrossTabSyncBus {
  private channel: BroadcastChannel | null = null;
  public readonly tabId: string;
  private listeners: Set<(message: CrossTabSyncMessage) => void> = new Set();

  constructor() {
    this.tabId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tab-${Math.random().toString(36).substring(2, 9)}`;

    if (typeof window !== "undefined") {
      if ("BroadcastChannel" in window) {
        try {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event: MessageEvent<CrossTabSyncMessage>) => {
            if (event.data && event.data.senderId !== this.tabId) {
              this.notifyListeners(event.data);
            }
          };
        } catch {
          // Fallback to storage events
        }
      }

      window.addEventListener("storage", this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === "minddesk:pomodoro-broadcast" && event.newValue) {
      try {
        const data = JSON.parse(event.newValue) as CrossTabSyncMessage;
        if (data && data.senderId !== this.tabId) {
          this.notifyListeners(data);
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  private notifyListeners(message: CrossTabSyncMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error("[CrossTabSyncBus] Error in listener:", err);
      }
    });
  }

  public subscribe(listener: (message: CrossTabSyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(message: CrossTabSyncBroadcast): void {
    if (typeof window === "undefined") return;

    const fullMessage: CrossTabSyncMessage = { ...message, senderId: this.tabId };

    if (this.channel) {
      try {
        this.channel.postMessage(fullMessage);
      } catch {
        // Fallback to localStorage
      }
    }

    try {
      window.localStorage.setItem("minddesk:pomodoro-broadcast", JSON.stringify(fullMessage));
    } catch {
      // Ignore
    }
  }

  public destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageEvent);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const crossTabSyncBus = new CrossTabSyncBus();
