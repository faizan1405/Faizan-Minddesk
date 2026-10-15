"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, VolumeX, Bell, BellOff, PlayCircle } from "lucide-react";
import { usePomodoro } from "../engine/use-pomodoro";
import { soundService } from "../services/sound-service";
import { notificationService } from "../services/notification-service";

export function PomodoroSettingsDialog() {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings } = usePomodoro();

  const [focusMins, setFocusMins] = useState(settings.focusDurationMinutes);
  const [shortBreakMins, setShortBreakMins] = useState(settings.shortBreakDurationMinutes);
  const [longBreakMins, setLongBreakMins] = useState(settings.longBreakDurationMinutes);
  const [longBreakInterval, setLongBreakInterval] = useState(settings.longBreakInterval);
  const [autoStartBreaks, setAutoStartBreaks] = useState(settings.autoStartBreaks);
  const [autoStartFocus, setAutoStartFocus] = useState(settings.autoStartFocus);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [soundVolume, setSoundVolume] = useState(settings.soundVolume);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);

  // Sync state when dialog opens
  React.useEffect(() => {
    if (isSettingsOpen) {
      setFocusMins(settings.focusDurationMinutes);
      setShortBreakMins(settings.shortBreakDurationMinutes);
      setLongBreakMins(settings.longBreakDurationMinutes);
      setLongBreakInterval(settings.longBreakInterval);
      setAutoStartBreaks(settings.autoStartBreaks);
      setAutoStartFocus(settings.autoStartFocus);
      setSoundEnabled(settings.soundEnabled);
      setSoundVolume(settings.soundVolume);
      setNotificationsEnabled(settings.notificationsEnabled);
    }
  }, [isSettingsOpen, settings]);

  const handleTestSound = () => {
    soundService.playCompletionChime(soundVolume);
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
      } else {
        alert("Notification permission was denied. Please allow notifications in browser settings.");
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSave = () => {
    updateSettings({
      focusDurationMinutes: Math.max(1, Math.min(180, Number(focusMins) || 25)),
      shortBreakDurationMinutes: Math.max(1, Math.min(60, Number(shortBreakMins) || 5)),
      longBreakDurationMinutes: Math.max(1, Math.min(60, Number(longBreakMins) || 15)),
      longBreakInterval: Math.max(1, Math.min(12, Number(longBreakInterval) || 4)),
      autoStartBreaks,
      autoStartFocus,
      soundEnabled,
      soundVolume,
      notificationsEnabled,
    });
    setSettingsOpen(false);
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Pomodoro Settings</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Customize intervals, auto-start rules, sound chime, and notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Duration Intervals */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Durations (Minutes)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Focus</span>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={focusMins}
                  onChange={(e) => setFocusMins(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Short Break</span>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={shortBreakMins}
                  onChange={(e) => setShortBreakMins(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Long Break</span>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakMins}
                  onChange={(e) => setLongBreakMins(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Long Break Interval */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div>
              <p className="text-xs font-medium">Long Break Interval</p>
              <p className="text-[11px] text-muted-foreground">Number of focus sessions before a long break</p>
            </div>
            <Input
              type="number"
              min={1}
              max={12}
              value={longBreakInterval}
              onChange={(e) => setLongBreakInterval(Number(e.target.value))}
              className="w-16 h-8 text-sm text-center"
            />
          </div>

          {/* Auto-start switches */}
          <div className="space-y-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Auto-start Breaks</p>
                <p className="text-[11px] text-muted-foreground">Start break countdown automatically when focus ends</p>
              </div>
              <input
                type="checkbox"
                checked={autoStartBreaks}
                onChange={(e) => setAutoStartBreaks(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Auto-start Focus</p>
                <p className="text-[11px] text-muted-foreground">Start next focus session automatically when break ends</p>
              </div>
              <input
                type="checkbox"
                checked={autoStartFocus}
                onChange={(e) => setAutoStartFocus(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Sound & Notifications */}
          <div className="space-y-2.5 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} className="text-muted-foreground" />}
                <div>
                  <p className="text-xs font-medium">Completion Sound</p>
                  <p className="text-[11px] text-muted-foreground">Meditation chime via Web Audio</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {soundEnabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleTestSound}
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    title="Play test chime"
                  >
                    <PlayCircle size={13} />
                    Test
                  </Button>
                )}
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
              </div>
            </div>

            {soundEnabled && (
              <div className="flex items-center gap-3 pl-6">
                <span className="text-[11px] text-muted-foreground">Volume</span>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground w-8 text-right font-mono">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted-foreground" />}
                <div>
                  <p className="text-xs font-medium">Desktop Notifications</p>
                  <p className="text-[11px] text-muted-foreground">Native browser alert on session end</p>
                </div>
              </div>
              <Button
                type="button"
                variant={notificationsEnabled ? "outline" : "secondary"}
                size="sm"
                onClick={handleToggleNotifications}
                className="h-7 text-xs px-2.5"
              >
                {notificationsEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
