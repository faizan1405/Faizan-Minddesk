"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  MailCheck,
} from "lucide-react";
import {
  INITIAL_AUTH_STATE,
  signupAction,
  type AuthActionState,
} from "@/features/auth/actions";
import { evaluatePasswordStrength } from "@/features/auth/schemas";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  nextPath?: string;
  supabaseConfigured?: boolean;
  actionOverride?: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
}

export function SignupForm({
  nextPath = "/dashboard",
  supabaseConfigured = true,
  actionOverride,
}: SignupFormProps) {
  const [state, formAction, isPending] = React.useActionState(
    actionOverride ?? signupAction,
    INITIAL_AUTH_STATE
  );
  const [passwordValue, setPasswordValue] = React.useState("");
  const strength = evaluatePasswordStrength(passwordValue);

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="signup-success-banner"
        className="space-y-4 rounded-xl border border-domain-note/30 bg-domain-note/10 p-5 text-center"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-domain-note/20 text-domain-note">
          <MailCheck className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Verify your email address
          </h2>
          <p className="text-xs leading-relaxed text-foreground-muted">
            {state.message}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/login">Return to Sign in</Link>
        </Button>
      </div>
    );
  }

  const nameErrors = state.fieldErrors?.fullName;
  const emailErrors = state.fieldErrors?.email;
  const passwordErrors = state.fieldErrors?.password;

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
          <code className="font-mono">.env.local</code> to create accounts.
        </div>
      )}

      {state.status === "error" && state.message && (
        <div
          role="alert"
          data-testid="auth-error-banner"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="full-name"
          className="block text-xs font-medium text-foreground"
        >
          Full name
        </label>
        <input
          id="full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          required
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(nameErrors?.length)}
          aria-describedby={nameErrors?.length ? "name-error" : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-surface-muted/40 px-3 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:bg-surface focus:outline-none focus:ring-2",
            nameErrors?.length
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-primary/30"
          )}
        />
        {nameErrors?.[0] && (
          <p id="name-error" className="text-xs text-danger">
            {nameErrors[0]}
          </p>
        )}
      </div>

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

      <div className="space-y-2">
        <label
          htmlFor="new-password"
          className="block text-xs font-medium text-foreground"
        >
          Password
        </label>
        <PasswordInput
          id="new-password"
          name="new-password"
          autoComplete="new-password"
          enterKeyHint="done"
          required
          value={passwordValue}
          onChange={(e) => setPasswordValue(e.target.value)}
          placeholder="Create a strong password"
          hasError={Boolean(passwordErrors?.length)}
          aria-invalid={Boolean(passwordErrors?.length)}
          aria-describedby="password-requirements"
        />
        {passwordErrors?.[0] && (
          <p className="text-xs text-danger">{passwordErrors[0]}</p>
        )}

        {/* Password Strength Checklist */}
        <ul
          id="password-requirements"
          className="grid grid-cols-1 gap-1 pt-0.5 text-[11px] text-foreground-muted sm:grid-cols-3"
        >
          <li className="inline-flex items-center gap-1">
            {strength.minLength ? (
              <CheckCircle2 className="h-3 w-3 text-domain-note" />
            ) : (
              <Circle className="h-3 w-3 text-foreground-muted/60" />
            )}
            <span>8+ characters</span>
          </li>
          <li className="inline-flex items-center gap-1">
            {strength.hasLetter ? (
              <CheckCircle2 className="h-3 w-3 text-domain-note" />
            ) : (
              <Circle className="h-3 w-3 text-foreground-muted/60" />
            )}
            <span>At least 1 letter</span>
          </li>
          <li className="inline-flex items-center gap-1">
            {strength.hasNumberOrSymbol ? (
              <CheckCircle2 className="h-3 w-3 text-domain-note" />
            ) : (
              <Circle className="h-3 w-3 text-foreground-muted/60" />
            )}
            <span>1 number/symbol</span>
          </li>
        </ul>
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={isPending}
        data-testid="signup-submit-button"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <span>Create account</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
