"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas";
import { auth } from "@/lib/auth/auth";
import {
  getAdminCredentials,
  isAdminAuthConfigured,
  isAuthConfigured,
  isDatabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/auth/env";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from "@/lib/auth/admin";
import { RECOVERY_TOKEN_COOKIE } from "@/lib/auth/middleware";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { getVerifiedSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import type { AuthActionState } from "@/features/auth/types";

const NOT_CONFIGURED_MESSAGE =
  "Database and authentication are not configured yet. Add DATABASE_URL and BETTER_AUTH_SECRET to .env.local or your Hostinger environment variables.";

async function resolveAppOrigin(): Promise<string> {
  const configured =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
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

function extractAuthErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    if ("body" in err && err.body && typeof err.body === "object") {
      const bodyObj = err.body as { message?: string };
      if (typeof bodyObj.message === "string" && bodyObj.message.trim()) {
        return bodyObj.message;
      }
    }
    if ("message" in err && typeof (err as { message?: unknown }).message === "string") {
      const msg = (err as { message: string }).message.trim();
      if (msg) {
        return msg;
      }
    }
  }
  return fallback;
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

  // 1. Single-owner Admin Mode (configured via environment variables)
  const admin = getAdminCredentials();
  if (admin) {
    if (
      parsed.data.email.toLowerCase() !== admin.email ||
      parsed.data.password !== admin.password
    ) {
      return {
        status: "error",
        message: "Invalid email or password.",
      };
    }

    if (!isDatabaseConfigured() || !isAuthConfigured()) {
      return {
        status: "error",
        message: "Sign-in is temporarily unavailable. Please verify database connectivity.",
      };
    }

    let userId: string;
    try {
      const user = await prisma.user.upsert({
        where: { email: admin.email },
        update: { name: "Faizan" },
        create: {
          email: admin.email,
          name: "Faizan",
          emailVerified: true,
        },
      });
      userId = user.id;

      await ensureUserWorkspaceProvisioned(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null,
        },
        prisma
      );
    } catch (dbErr) {
      console.error("[AUTH_LOGIN_PROVISIONING_FAILED]", dbErr);
      return {
        status: "error",
        message: "Unable to prepare your workspace database connection. Please try again.",
      };
    }

    const cookieStore = await cookies();
    const token = createAdminSessionToken(userId, admin.email);
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    const target = sanitizeRedirectPath(parsed.data.next, "/dashboard");
    redirect(target);
  }

  // 2. Standard Database Authentication
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  try {
    const reqHeaders = await headers();
    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: reqHeaders,
    });

    if (!result?.user) {
      return {
        status: "error",
        message: "Invalid email or password.",
      };
    }

    await ensureUserWorkspaceProvisioned(
      {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        image: result.user.image,
      },
      prisma
    );
  } catch (err) {
    return {
      status: "error",
      message: extractAuthErrorMessage(err, "Invalid email or password."),
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
    password: String(
      formData.get("new-password") ?? formData.get("password") ?? ""
    ),
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

  if (isAdminAuthConfigured()) {
    return {
      status: "error",
      message:
        "Public registrations are disabled. Please sign in with your configured admin credentials.",
    };
  }

  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  const origin = await resolveAppOrigin();
  const safeNext = sanitizeRedirectPath(parsed.data.next, "/dashboard");

  let signedInImmediately = false;

  try {
    const reqHeaders = await headers();
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: `${origin}/auth/callback?type=verify&next=${encodeURIComponent(
          safeNext
        )}`,
      },
      headers: reqHeaders,
    });

    if (result?.user) {
      await ensureUserWorkspaceProvisioned(
        {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
        },
        prisma
      );
    }

    if (result?.token) {
      signedInImmediately = true;
    }
  } catch (err) {
    return {
      status: "error",
      message: extractAuthErrorMessage(err, "Unable to create your account."),
    };
  }

  if (signedInImmediately) {
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

  if (isAdminAuthConfigured()) {
    return {
      status: "error",
      message:
        "Password recovery is disabled for the static administrator account. Please update ADMIN_PASSWORD in your environment variables.",
    };
  }

  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  const origin = await resolveAppOrigin();

  try {
    const reqHeaders = await headers();
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: `${origin}/auth/callback?type=recovery&next=/update-password`,
      },
      headers: reqHeaders,
    });
  } catch (err) {
    return {
      status: "error",
      message: extractAuthErrorMessage(
        err,
        "Unable to send password reset instructions."
      ),
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
    password: String(
      formData.get("new-password") ?? formData.get("password") ?? ""
    ),
  };

  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please choose a stronger password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  const cookieStore = await cookies();
  const formToken = String(formData.get("token") ?? "").trim();
  const cookieToken = cookieStore.get(RECOVERY_TOKEN_COOKIE)?.value?.trim() ?? "";
  const recoveryToken = formToken || cookieToken;

  try {
    if (recoveryToken) {
      const reqHeaders = await headers();
      await auth.api.resetPassword({
        body: {
          newPassword: parsed.data.password,
          token: recoveryToken,
        },
        headers: reqHeaders,
      });

      cookieStore.delete(RECOVERY_TOKEN_COOKIE);
    } else {
      const session = await getVerifiedSession();
      if (!session?.user) {
        return {
          status: "error",
          message:
            "Your recovery session has expired. Please request a new password reset link.",
        };
      }

      const ctx = await auth.$context;
      const hashedPassword = await ctx.password.hash(parsed.data.password);

      await prisma.account.updateMany({
        where: {
          userId: session.user.id,
          providerId: "credential",
        },
        data: {
          password: hashedPassword,
        },
      });
    }
  } catch (err) {
    return {
      status: "error",
      message: extractAuthErrorMessage(
        err,
        "Unable to update your password. Your recovery token may have expired."
      ),
    };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_token");

  if (isAuthConfigured()) {
    try {
      const reqHeaders = await headers();
      await auth.api.signOut({
        headers: reqHeaders,
      });
    } catch {
      // Proceed to login redirect even if session was already expired
    }
  }
  redirect("/login");
}
