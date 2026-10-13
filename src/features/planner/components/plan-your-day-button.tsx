"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface PlanYourDayButtonProps {
  className?: string;
  variant?: "primary" | "subtle" | "header";
  size?: "sm" | "md" | "lg";
}

export function PlanYourDayButton({
  className = "",
  variant = "primary",
  size = "md",
}: PlanYourDayButtonProps) {
  const sizeClasses = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-xs sm:text-sm gap-2",
    lg: "h-10 px-5 text-sm gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 hover:brightness-105 border border-white/20 active:scale-[0.98]",
    subtle:
      "bg-card hover:bg-muted text-card-foreground border border-border shadow-xs hover:border-primary/50 hover:text-primary active:scale-[0.98]",
    header:
      "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-xs active:scale-[0.98]",
  }[variant];

  return (
    <Link
      href="/plan-your-day"
      aria-label="Open Plan your day workspace"
      className={`group relative inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 cursor-pointer select-none backdrop-blur-sm ${sizeClasses} ${variantClasses} ${className}`}
    >
      <span className="relative flex items-center justify-center">
        <Sparkles
          size={size === "sm" ? 13 : 15}
          className="shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 text-amber-400 drop-shadow-sm"
          strokeWidth={2.3}
          aria-hidden="true"
        />
      </span>
      <span className="tracking-tight whitespace-nowrap">Plan your day</span>
    </Link>
  );
}
