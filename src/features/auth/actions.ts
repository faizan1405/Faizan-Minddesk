"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas";
import {
  isSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};

async function resolveAppOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && configured.startsWith("http")) {
    return configured.replace(/\/$/, "");
  }
  try {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") || "http";
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback to localhost
  }
  return "http://localhost:3000";
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: formData.get("next") ? String(formData.get("next")) : undefined,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Invalid email or password.",
    };
  }

  const target = sanitizeRedirectPath(parsed.data.next, "/dashboard");
  redirect(target);
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("new-password") ?? formData.get("password") ?? ""),
    next: formData.get("next") ? String(formData.get("next")) : undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const origin = await resolveAppOrigin();
  const safeNext = sanitizeRedirectPath(parsed.data.next, "/dashboard");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        safeNext
      )}`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to create your account.",
    };
  }

  // If email confirmation is disabled in Supabase, session is returned immediately
  if (data.session) {
    redirect(safeNext);
  }

  return {
    status: "success",
    message:
      "Check your inbox! We sent a confirmation link to verify your email address.",
  };
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
  };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const origin = await resolveAppOrigin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    }
  );

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to send password reset instructions.",
    };
  }

  return {
    status: "success",
    message:
      "If an account exists for that email, a password recovery link has been sent.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    password: String(formData.get("new-password") ?? formData.get("password") ?? ""),
  };

  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please choose a stronger password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Your recovery session has expired. Please request a new password reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to update your password.",
    };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
