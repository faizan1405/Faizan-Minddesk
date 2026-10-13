import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db/prisma";

export interface ProvisionUserInput {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface ProvisionedWorkspaceContext {
  profileId: string;
  defaultWorkspaceId: string;
  fullName: string;
  avatarUrl: string | null;
}

/**
 * Ensures a newly registered or authenticated user has a complete domain
 * profile, a personal workspace, an `owner` membership, and a default
 * "My Tasks" list inside a single atomic transaction.
 *
 * Replaces the former PostgreSQL `on_auth_user_created` trigger safely for MySQL.
 */
export async function ensureUserWorkspaceProvisioned(
  user: ProvisionUserInput,
  db: PrismaClient = defaultPrisma
): Promise<ProvisionedWorkspaceContext> {
  const fallbackName =
    user.name?.trim() || user.email?.split("@")[0] || "MindDesk User";

  return db.$transaction(async (tx) => {
    // 1. Ensure User row exists in users table first (satisfies Profile.id FK constraint)
    if (tx.user?.findUnique) {
      let dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, image: true },
      });

      if (!dbUser && user.email) {
        const userByEmail = await tx.user.findUnique({
          where: { email: user.email },
          select: { id: true, name: true, image: true },
        });
        if (userByEmail) {
          user.id = userByEmail.id;
          dbUser = userByEmail;
        }
      }

      if (!dbUser && tx.user?.create) {
        dbUser = await tx.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: fallbackName,
            emailVerified: true,
            image: user.image ?? null,
          },
          select: { id: true, name: true, image: true },
        });
        user.id = dbUser.id;
      }
    }

    // 2. Check existing profile
    const existingProfile = await tx.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        defaultWorkspaceId: true,
      },
    });

    if (existingProfile?.defaultWorkspaceId) {
      const ws = await tx.workspace.findUnique({
        where: { id: existingProfile.defaultWorkspaceId },
        select: { id: true },
      });
      if (ws) {
        return {
          profileId: existingProfile.id,
          defaultWorkspaceId: existingProfile.defaultWorkspaceId,
          fullName: existingProfile.fullName || fallbackName,
          avatarUrl: existingProfile.avatarUrl ?? user.image ?? null,
        };
      }
    }

    // 3. Ensure profile row exists
    if (!existingProfile) {
      await tx.profile.create({
        data: {
          id: user.id,
          email: user.email,
          fullName: fallbackName,
          avatarUrl: user.image ?? null,
          preferences: {},
        },
      });
    }

    // 4. Find or create personal workspace
    let workspace = await tx.workspace.findFirst({
      where: { ownerId: user.id, isPersonal: true },
      select: { id: true },
    });

    if (!workspace) {
      workspace = await tx.workspace.create({
        data: {
          name: "Personal Workspace",
          ownerId: user.id,
          isPersonal: true,
        },
        select: { id: true },
      });
    }

    // 5. Ensure workspace membership
    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {
        role: "owner",
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      },
    });

    // 6. Update profile's default workspace
    const updatedProfile = await tx.profile.update({
      where: { id: user.id },
      data: {
        defaultWorkspaceId: workspace.id,
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        defaultWorkspaceId: true,
      },
    });

    // 7. Ensure default "My Tasks" list exists
    const existingList = await tx.taskList.findFirst({
      where: { workspaceId: workspace.id, userId: user.id },
      select: { id: true },
    });

    if (!existingList) {
      await tx.taskList.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          name: "My Tasks",
          isDefault: true,
          position: 1000.0,
        },
      });
    }

    return {
      profileId: updatedProfile.id,
      defaultWorkspaceId: workspace.id,
      fullName: updatedProfile.fullName || fallbackName,
      avatarUrl: updatedProfile.avatarUrl ?? null,
    };
  });
}
