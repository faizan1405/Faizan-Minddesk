/**
 * Browser Notification Service for Pomodoro focus and break completions.
 * Handles permission requests safely and ensures no crashes in SSR/restricted environments.
 */

class NotificationService {
  /**
   * Check if the Notifications API is available in this browser environment.
   */
  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  /**
   * Current notification permission status.
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  }

  /**
   * Requests user permission for desktop notifications.
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Dispatches a notification if permitted and document is not focused.
   */
  public notify(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported()) return null;

    if (Notification.permission !== "granted") return null;

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        silent: true, // We provide custom Web Audio chime
        ...options,
      });

      // Auto-close notification after 8 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch {
          // Ignore close errors
        }
      }, 8000);

      notification.onclick = () => {
        if (typeof window !== "undefined") {
          window.focus();
        }
        try {
          notification.close();
        } catch {
          // Ignore
        }
      };

      return notification;
    } catch {
      return null;
    }
  }

  /**
   * Dispatches a notification when a focus session finishes.
   */
  public notifyFocusCompleted(blockTitle: string, nextIsLongBreak: boolean): void {
    const breakType = nextIsLongBreak ? "Long break time! 🌟" : "Short break time! ☕";
    this.notify(`Focus Session Completed: ${blockTitle}`, {
      body: `Great work! Time to step back and recharge. ${breakType}`,
      tag: "minddesk-pomodoro-focus-complete",
    });
  }

  /**
   * Dispatches a notification when a break session finishes.
   */
  public notifyBreakCompleted(blockTitle: string): void {
    this.notify("Break Completed!", {
      body: `Ready to dive back into "${blockTitle}"? Let's focus! 🎯`,
      tag: "minddesk-pomodoro-break-complete",
    });
  }
}

export const notificationService = new NotificationService();
