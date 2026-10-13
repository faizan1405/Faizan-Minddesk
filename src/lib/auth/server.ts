import { cookies, headers } from "next/headers";
import { auth, type SessionData } from "@/lib/auth/auth";
import {
  getAdminCredentials,
  isAuthConfigured,
  isDatabaseConfigured,
} from "@/lib/auth/env";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/auth/admin";
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
  const admin = getAdminCredentials();
  if (admin) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
      const verified = verifyAdminSessionToken(token);

      if (verified && verified.email.toLowerCase() === admin.email) {
        if (isDatabaseConfigured()) {
          try {
            let user = await prisma.user.findUnique({
              where: { email: admin.email },
              select: { id: true, name: true, image: true },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: admin.email,
                  name: "Faizan",
                  emailVerified: true,
                },
                select: { id: true, name: true, image: true },
              });
            }

            const provisioned = await ensureUserWorkspaceProvisioned(
              {
                id: user.id,
                email: admin.email,
                name: user.name || "Faizan",
                image: user.image ?? null,
              },
              prisma
            );

            return {
              id: user.id,
              email: admin.email,
              fullName: provisioned.fullName || user.name || "Faizan",
              avatarUrl: provisioned.avatarUrl,
              defaultWorkspaceId: provisioned.defaultWorkspaceId,
            };
          } catch (dbErr) {
            console.error("[AUTH] Error resolving admin workspace from MySQL:", dbErr);
          }
        }

        return {
          id: verified.userId,
          email: admin.email,
          fullName: "Faizan",
          avatarUrl: null,
          defaultWorkspaceId: null,
        };
      }
    } catch {
      // Continue to Better Auth check
    }
  }

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

    let validWorkspaceId = profile?.defaultWorkspaceId;
    if (validWorkspaceId) {
      const ws = await prisma.workspace.findUnique({
        where: { id: validWorkspaceId },
        select: { id: true },
      });
      if (!ws) {
        validWorkspaceId = null;
      }
    }

    if (!profile || !validWorkspaceId) {
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
      defaultWorkspaceId: validWorkspaceId,
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
