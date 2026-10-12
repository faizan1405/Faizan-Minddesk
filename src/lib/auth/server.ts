import { headers } from "next/headers";
import { auth, type SessionData } from "@/lib/auth/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import { AuthorizationError } from "@/lib/security/errors";
import type { AuthUserSummary } from "@/types/domain";

/**
 * Verifies the active session on the server against Better Auth and the MySQL
 * `sessions` table. Never trusts unverified client-supplied user IDs.
 */
export async function getVerifiedSession(): Promise<SessionData | null> {
  if (!isAuthConfigured()) {
    return null;
  }

  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });
    return session ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the verified authenticated user and their MindDesk `Profile`
 * (including `defaultWorkspaceId`), auto-provisioning their personal workspace
 * if needed.
 */
export async function getVerifiedUser(): Promise<AuthUserSummary | null> {
  const session = await getVerifiedSession();
  if (!session?.user) {
    return null;
  }

  const { user } = session;

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        fullName: true,
        avatarUrl: true,
        defaultWorkspaceId: true,
      },
    });

    if (!profile || !profile.defaultWorkspaceId) {
      const provisioned = await ensureUserWorkspaceProvisioned(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        prisma
      );

      return {
        id: user.id,
        email: user.email,
        fullName: provisioned.fullName,
        avatarUrl: provisioned.avatarUrl,
        defaultWorkspaceId: provisioned.defaultWorkspaceId,
      };
    }

    const fallbackName =
      user.name?.trim() || user.email?.split("@")[0] || "MindDesk User";

    return {
      id: user.id,
      email: user.email,
      fullName: profile.fullName || fallbackName,
      avatarUrl: profile.avatarUrl ?? user.image ?? null,
      defaultWorkspaceId: profile.defaultWorkspaceId,
    };
  } catch {
    const fallbackName =
      user.name?.trim() || user.email?.split("@")[0] || "MindDesk User";

    return {
      id: user.id,
      email: user.email,
      fullName: fallbackName,
      avatarUrl: user.image ?? null,
      defaultWorkspaceId: null,
    };
  }
}

/**
 * Enforces that a server action or API route has a verified authenticated user.
 * Throws `AuthorizationError(401)` if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<AuthUserSummary> {
  const user = await getVerifiedUser();
  if (!user) {
    throw new AuthorizationError(
      "Authentication required. Please sign in to continue.",
      "UNAUTHENTICATED",
      401
    );
  }
  return user;
}
