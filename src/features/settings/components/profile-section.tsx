"use client";

import * as React from "react";
import { Check, Copy, KeyRound, Mail, ShieldCheck, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { UserProfileData } from "@/features/settings/types";

interface ProfileSectionProps {
  user: UserProfileData;
  onSave: (data: { fullName?: string; avatarUrl?: string | null }) => Promise<boolean>;
  isSaving: boolean;
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim() || "MD";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileSection({ user, onSave, isSaving }: ProfileSectionProps) {
  const [fullName, setFullName] = React.useState(user.fullName || "");
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl || "");
  const [copiedId, setCopiedId] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Sync state if user prop changes
  React.useEffect(() => {
    setFullName(user.fullName || "");
    setAvatarUrl(user.avatarUrl || "");
  }, [user.fullName, user.avatarUrl]);

  const hasChanges =
    fullName.trim() !== (user.fullName || "").trim() ||
    (avatarUrl.trim() || null) !== (user.avatarUrl || null);

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setValidationError("Full name cannot be blank.");
      return;
    }

    if (avatarUrl.trim()) {
      try {
        new URL(avatarUrl.trim());
      } catch {
        setValidationError("Please enter a valid avatar image URL or leave it empty.");
        return;
      }
    }

    await onSave({
      fullName: trimmedName,
      avatarUrl: avatarUrl.trim() || null,
    });
  };

  const initials = getInitials(fullName, user.email);

  const formattedCreatedDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.createdAt));
    } catch {
      return "Active";
    }
  }, [user.createdAt]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Personal Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal workspace identity, display name, and avatar.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Avatar & Identity Header Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName || user.email}
                className="size-16 sm:size-20 rounded-2xl object-cover border border-border shadow-xs"
                onError={() => {
                  // Fallback to initials if URL fails to load
                }}
              />
            ) : (
              <div className="grid size-16 sm:size-20 place-items-center rounded-2xl bg-brand-soft text-xl font-bold text-brand-ink shadow-xs">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] shadow-sm">
              <User className="size-3" />
            </div>
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">
                {fullName || "MindDesk User"}
              </h3>
              {user.emailVerified ? (
                <Badge variant="default" className="gap-1 text-[11px] py-0.5">
                  <ShieldCheck className="size-3 text-emerald-500" /> Verified Account
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-[11px] py-0.5 text-amber-600 dark:text-amber-400">
                  <Mail className="size-3" /> Unverified Email
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Mail className="size-3.5 shrink-0" /> {user.email}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3 shrink-0 text-primary" /> Workspace:{" "}
              <span className="font-medium text-foreground">{user.workspaceName}</span>
            </p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="space-y-2">
            <label htmlFor="settings-full-name" className="text-xs font-semibold text-foreground block">
              Display Name
            </label>
            <Input
              id="settings-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              disabled={isSaving}
              maxLength={80}
              className="bg-background text-sm"
              autoComplete="name"
            />
            <p className="text-[11px] text-muted-foreground">
              This name is shown across your notes, tasks, and workspace header.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-avatar-url" className="text-xs font-semibold text-foreground block">
              Avatar Image URL
            </label>
            <Input
              id="settings-avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              disabled={isSaving}
              className="bg-background text-sm font-mono text-xs"
              autoComplete="photo"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Paste an image URL, or leave blank to use your name initials.
              </p>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-2"
                >
                  Clear avatar
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 pt-2">
            <div className="space-y-2">
              <label htmlFor="settings-email" className="text-xs font-semibold text-foreground block">
                Primary Account Email
              </label>
              <Input
                id="settings-email"
                type="email"
                value={user.email}
                readOnly
                disabled
                className="bg-muted/50 text-muted-foreground text-sm cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">
                Email address is verified via Better Auth and cannot be edited directly. To change email, request re-verification from security settings.
              </p>
            </div>
          </div>
        </div>

        {validationError && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {validationError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={!hasChanges || isSaving}
            size="sm"
            className="rounded-xl px-5 gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving changes...
              </>
            ) : (
              <>
                <Check className="size-3.5" /> Save Profile
              </>
            )}
          </Button>
        </div>

        {/* Account Metadata Card */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account Specifications
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground block text-[11px]">User Identifier</span>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[11px] text-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]">
                  {user.id}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy User ID"
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title="Copy User ID"
                >
                  {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground block text-[11px]">Account Created</span>
              <span className="text-foreground font-medium">{formattedCreatedDate}</span>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground block text-[11px]">Authentication Method</span>
              <span className="inline-flex items-center gap-1 text-foreground font-medium capitalize">
                <KeyRound className="size-3 text-muted-foreground" /> {user.provider}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
