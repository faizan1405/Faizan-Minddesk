"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  progressPercent: number; // 0 to 100
  size?: number; // diameter in px (default: 260)
  strokeWidth?: number; // stroke width in px (default: 8)
  isBreak?: boolean;
  blockColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  progressPercent,
  size = 260,
  strokeWidth = 8,
  isBreak = false,
  blockColor,
  className,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const gradientId = `pomodoro-progress-${isBreak ? "break" : "focus"}`;

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {isBreak ? (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor={blockColor || "#6366f1"} />
                <stop offset="100%" stopColor={blockColor ? "#8b5cf6" : "#4f46e5"} />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />

        {/* Animated active progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300 ease-out"
          style={{
            filter: "drop-shadow(0 2px 8px rgba(99, 102, 241, 0.15))",
          }}
        />
      </svg>

      {/* Centered children (Countdown digits, badges, labels) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        {children}
      </div>
    </div>
  );
}
