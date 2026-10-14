"use client";

import * as React from "react";
import Link from "next/link";
import {
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionInfo, UserProfileData } from "@/features/settings/types";

interface SecuritySectionProps {
  user: UserProfileData;
  sessions: SessionInfo[];
}

function parseDevice(userAgent: string | null): { name: string; isMobile: boolean } {
  if (!userAgent) return { name: "Web Browser", isMobile: false };
  const ua = userAgent.toLowerCase();
  const isMobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone");

  let os = "Desktop";
  if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";

  return { name: `${browser} on ${os}`, isMobile };
}

function formatSessionDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function SecuritySection({ user, sessions }: SecuritySectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Security & Authentication
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review active sessions, authentication status, and account security controls.
        </p>
      </div>

      {/* Account Security Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <Shield className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Account Protection</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Email Verification</span>
              {user.emailVerified ? (
                <Badge variant="default" className="text-[10px] py-0">
                  <ShieldCheck className="size-2.5 text-emerald-500 mr-1" /> Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 text-amber-600 dark:text-amber-400">
                  Unverified
                </Badge>
              )}
            </div>
            <p className="text-foreground font-semibold text-xs">{user.email}</p>
            <p className="text-[11px] text-muted-foreground">
              {user.emailVerified
                ? "Your primary email is verified for recovery and workspace notices."
                : "Email verification is pending. Verify to ensure seamless account recovery."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Password Security</span>
              <Badge variant="outline" className="text-[10px] py-0">
                Argon2 / Better Auth
              </Badge>
            </div>
            <p className="text-foreground font-semibold text-xs">Encrypted Password</p>
            <p className="text-[11px] text-muted-foreground">
              Authentication credentials are encrypted using industry-standard hashing with salted keys.
            </p>
          </div>
        </div>

        {/* Password Reset Flow Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" /> Change Account Password
            </span>
            <p className="text-[11px] text-muted-foreground">
              Password updates require verification through the secure Better Auth recovery pipeline.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 shrink-0">
            <Link href="/update-password">
              <KeyRound className="size-3.5" />
              Reset Password
              <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Email Change Limitation Notice */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Mail className="size-3.5 text-muted-foreground" />
            Email Modification Policy
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            To prevent account hijacking and protect your workspace data, changing your primary email
            requires email re-verification with dual-party approval. Contact your administrator or support
            team to initiate an email migration.
          </p>
        </div>
      </div>

      {/* Active Sessions Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <Laptop className="size-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-foreground">Active Database Sessions</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} tracked
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            No active database sessions found.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session) => {
              const device = parseDevice(session.userAgent);
              return (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-background/50 hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid size-8 place-items-center rounded-lg border border-border bg-muted shrink-0 mt-0.5 sm:mt-0">
                      {device.isMobile ? (
                        <Smartphone className="size-4 text-muted-foreground" />
                      ) : (
                        <Laptop className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{device.name}</span>
                        {session.isCurrent && (
                          <Badge variant="default" className="text-[10px] py-0">
                            Current session
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>Started: {formatSessionDate(session.createdAt)}</span>
                        <span>•</span>
                        <span>Expires: {formatSessionDate(session.expiresAt)}</span>
                      </p>
                    </div>
                  </div>

                  {session.ipAddress && (
                    <div className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                      IP: {session.ipAddress}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign Out Card */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-foreground">Sign out of MindDesk</span>
          <p className="text-xs text-muted-foreground">
            Terminates your active authentication session and clears session cookies on this device.
          </p>
        </div>
        <form action={signOutAction} className="shrink-0">
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            className="rounded-xl gap-2 cursor-pointer font-semibold"
          >
            <LogOut className="size-3.5" /> Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
