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
      return {
        profileId: existingProfile.id,
        defaultWorkspaceId: existingProfile.defaultWorkspaceId,
        fullName: existingProfile.fullName || fallbackName,
        avatarUrl: existingProfile.avatarUrl ?? user.image ?? null,
      };
    }

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

    const workspace = await tx.workspace.create({
      data: {
        name: "Personal Workspace",
        ownerId: user.id,
        isPersonal: true,
      },
    });

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

    await tx.taskList.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        name: "My Tasks",
        isDefault: true,
        position: 1000.0,
      },
    });

    return {
      profileId: updatedProfile.id,
      defaultWorkspaceId: workspace.id,
      fullName: updatedProfile.fullName || fallbackName,
      avatarUrl: updatedProfile.avatarUrl ?? null,
    };
  });
}
