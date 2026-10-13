"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/features/auth/actions";
import {
  INITIAL_AUTH_STATE,
  type AuthActionState,
} from "@/features/auth/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ForgotPasswordFormProps {
  initialError?: string;
  authConfigured?: boolean;
  actionOverride?: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
}

export function ForgotPasswordForm({
  initialError,
  authConfigured = true,
  actionOverride,
}: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = React.useActionState(
    actionOverride ?? forgotPasswordAction,
    INITIAL_AUTH_STATE
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="forgot-password-success"
        className="space-y-4 rounded-xl border border-domain-note/30 bg-domain-note/10 p-5 text-center"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-domain-note/20 text-domain-note">
          <MailCheck className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Check your email
          </h2>
          <p className="text-xs leading-relaxed text-foreground-muted">
            {state.message}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/login">Back to Sign in</Link>
        </Button>
      </div>
    );
  }

  const emailErrors = state.fieldErrors?.email;
  const bannerError =
    state.status === "error"
      ? state.message
      : initialError === "session_expired"
        ? "Your password recovery session expired. Request a fresh link below."
        : initialError;

  return (
    <form action={formAction} noValidate className="space-y-4">
      {!authConfigured && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
        >
          <strong>Environment Setup Required:</strong> Configure{" "}
          <code className="font-mono">DATABASE_URL</code> and{" "}
          <code className="font-mono">BETTER_AUTH_SECRET</code> in{" "}
          <code className="font-mono">.env.local</code>.
        </div>
      )}

      {bannerError && (
        <div
          role="alert"
          data-testid="auth-error-banner"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-medium text-foreground"
        >
          Account email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          enterKeyHint="done"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(emailErrors?.length)}
          aria-describedby={emailErrors?.length ? "email-error" : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-surface-muted/40 px-3 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:bg-surface focus:outline-none focus:ring-2",
            emailErrors?.length
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-primary/30"
          )}
        />
        {emailErrors?.[0] && (
          <p id="email-error" className="text-xs text-danger">
            {emailErrors[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={isPending}
        data-testid="forgot-password-submit-button"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending reset link...</span>
          </>
        ) : (
          <>
            <span>Send reset link</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
