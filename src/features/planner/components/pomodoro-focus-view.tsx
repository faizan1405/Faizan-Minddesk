"use client";

import React from "react";
import { MiniTimer, FocusModeView } from "@/features/pomodoro";

/**
 * Unified Focus View component.
 * Integrates Agent 3's authoritative MiniTimer and distraction-free FocusModeView.
 */
export function PomodoroFocusView() {
  return (
    <>
      <MiniTimer />
      <FocusModeView />
    </>
  );
}
