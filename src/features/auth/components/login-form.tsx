"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import {
  INITIAL_AUTH_STATE,
  loginAction,
  type AuthActionState,
} from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
  supabaseConfigured?: boolean;
  actionOverride?: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "The authentication link is invalid or has expired. Please sign in or request a new link.",
  supabase_not_configured:
    "Supabase environment variables are not configured in .env.local.",
};

export function LoginForm({
  nextPath = "/dashboard",
  initialError,
  supabaseConfigured = true,
  actionOverride,
}: LoginFormProps) {
  const [state, formAction, isPending] = React.useActionState(
    actionOverride ?? loginAction,
    INITIAL_AUTH_STATE
  );

  const emailErrors = state.fieldErrors?.email;
  const passwordErrors = state.fieldErrors?.password;
  const bannerError =
    state.status === "error"
      ? state.message
      : initialError
        ? ERROR_MESSAGES[initialError] || initialError
        : undefined;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />

      {!supabaseConfigured && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
        >
          <strong>Local Setup Required:</strong> Configure{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to connect live
          authentication.
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
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          enterKeyHint="next"
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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="current-password"
            className="block text-xs font-medium text-foreground"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
          >
            Forgot password?
          </Link>
        </div>

        <PasswordInput
          id="current-password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="done"
          required
          placeholder="Enter your password"
          hasError={Boolean(passwordErrors?.length)}
          aria-invalid={Boolean(passwordErrors?.length)}
          aria-describedby={
            passwordErrors?.length ? "password-error" : undefined
          }
        />
        {passwordErrors?.[0] && (
          <p id="password-error" className="text-xs text-danger">
            {passwordErrors[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={isPending}
        data-testid="login-submit-button"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <span>Sign in</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
