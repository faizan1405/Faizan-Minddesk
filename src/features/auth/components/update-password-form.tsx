"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import {
  INITIAL_AUTH_STATE,
  updatePasswordAction,
  type AuthActionState,
} from "@/features/auth/actions";
import { evaluatePasswordStrength } from "@/features/auth/schemas";
import { PasswordInput } from "@/features/auth/components/password-input";
import { Button } from "@/components/ui/button";

interface UpdatePasswordFormProps {
  actionOverride?: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
}

export function UpdatePasswordForm({
  actionOverride,
}: UpdatePasswordFormProps) {
  const [state, formAction, isPending] = React.useActionState(
    actionOverride ?? updatePasswordAction,
    INITIAL_AUTH_STATE
  );
  const [passwordValue, setPasswordValue] = React.useState("");
  const strength = evaluatePasswordStrength(passwordValue);
  const passwordErrors = state.fieldErrors?.password;

  return (
    <form action={formAction} noValidate className="space-y-4">
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

      <div className="space-y-2">
        <label
          htmlFor="new-password"
          className="block text-xs font-medium text-foreground"
        >
          New password
        </label>
        <PasswordInput
          id="new-password"
          name="new-password"
          autoComplete="new-password"
          enterKeyHint="done"
          required
          value={passwordValue}
          onChange={(e) => setPasswordValue(e.target.value)}
          placeholder="Enter a strong new password"
          hasError={Boolean(passwordErrors?.length)}
          aria-invalid={Boolean(passwordErrors?.length)}
          aria-describedby="update-password-requirements"
        />
        {passwordErrors?.[0] && (
          <p className="text-xs text-danger">{passwordErrors[0]}</p>
        )}

        <ul
          id="update-password-requirements"
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
        data-testid="update-password-submit-button"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating password...</span>
          </>
        ) : (
          <>
            <span>Update password</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
