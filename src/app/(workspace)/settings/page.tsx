"use client";

import * as React from "react";
import { Download, Keyboard, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

const SHORTCUTS_LIST = [
  { label: "Open Global Command & Search Palette", keys: ["Ctrl", "K"] },
  { label: "Toggle Left Workspace Sidebar", keys: ["Ctrl", "\\"] },
  { label: "Open Quick Capture Modal", keys: ["Alt", "C"] },
  { label: "Dismiss Active Modal or Overlay", keys: ["Esc"] },
  { label: "Mind Map: Add Connected Child Node", keys: ["Tab"] },
  { label: "Mind Map: Add Connected Sibling Node", keys: ["Enter"] },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme : "system";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Appearance Section */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          <p className="text-xs text-foreground-muted">
            Choose between Light, Dark, or System color themes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeTheme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </Button>
          <Button
            type="button"
            variant={activeTheme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </Button>
          <Button
            type="button"
            variant={activeTheme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-3.5 w-3.5" />
            System
          </Button>
        </div>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-foreground-muted" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Keyboard Shortcuts
            </h2>
            <p className="text-xs text-foreground-muted">
              Navigate and capture ideas without leaving the keyboard.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {SHORTCUTS_LIST.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2.5 text-xs"
            >
              <span className="text-foreground">{item.label}</span>
              <Kbd keys={item.keys} />
            </div>
          ))}
        </div>
      </section>

      {/* Data Ownership & Export */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Workspace Data Export
            </h2>
            <p className="text-xs text-foreground-muted">
              Full JSON and Markdown archive export will be enabled in Phase 8.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-3.5 w-3.5" />
            Export Workspace (Phase 8)
          </Button>
        </div>
      </section>
    </div>
  );
}
