/**
 * Web Audio API-based chime generator for Pomodoro session completion.
 * Does not depend on external audio assets, works completely offline,
 * and handles browser autoplay policies safely.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioCtx = new AudioCtx();
        } catch {
          // AudioContext not permitted or unsupported
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Plays a warm, harmonic three-tone chime (528Hz, 660Hz, 792Hz)
   * with smooth ADSR envelope for focus/break completion.
   */
  public playCompletionChime(volume: number = 0.7): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      const clampedVolume = Math.max(0, Math.min(1, volume));
      gainNode.gain.setValueAtTime(clampedVolume * 0.3, now);
      gainNode.connect(ctx.destination);

      // Chime chord notes (Root, Major Third, Fifth)
      const frequencies = [528, 660, 792];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        // Bell envelope: instant soft attack, gentle exponential decay
        const startTime = now + idx * 0.08;
        const duration = 1.4;

        oscGain.gain.setValueAtTime(0.001, startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(oscGain);
        oscGain.connect(gainNode);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {
      // Audio playback suppressed safely
    }
  }

  /**
   * Plays a subtle, brief cue for timer start or resume.
   */
  public playStartCue(volume: number = 0.5): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      const clampedVolume = Math.max(0, Math.min(1, volume));
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(clampedVolume * 0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio playback suppressed safely
    }
  }
}

export const soundService = new SoundService();
