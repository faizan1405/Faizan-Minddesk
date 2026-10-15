/**
 * Sound effects utility delegated to authoritative Pomodoro sound service.
 */
import { soundService } from "@/features/pomodoro";

export function playChimeSound(): void {
  soundService.playCompletionChime();
}

export function playTickSound(): void {
  soundService.playStartCue();
}
