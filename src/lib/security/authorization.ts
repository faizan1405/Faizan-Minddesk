import type {
  EntityRelationshipType,
  LinkableEntityType,
  MindMapEdgeType,
  MindMapNodeType,
  Prisma,
  PrismaClient,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from "@prisma/client";
import { AuthorizationError } from "@/lib/security/errors";

/**
 * Verified server-side actor identity.
 * NEVER construct this from browser-supplied payloads; always resolve via
 * `requireAuthenticatedUser()` on the server.
 */
export interface VerifiedActor {
  id: string;
  email: string;
}

export type DbClient = PrismaClient | Prisma.TransactionClient;

const WRITE_ROLES: WorkspaceRole[] = ["owner", "editor"];

/**
 * Verifies that `actor.id` is the workspace owner or a registered member
 * (`owner`, `editor`, or `viewer`) of `workspaceId`.
 */
export async function assertWorkspaceReadAccess(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<{ workspaceId: string; role: WorkspaceRole }> {
  if (!actor?.id) {
    throw new AuthorizationError(
      "Authentication required.",
      "UNAUTHENTICATED",
      401
    );
  }

  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: actor.id,
      },
    },
    select: {
      role: true,
    },
  });

  if (membership) {
    return { workspaceId, role: membership.role };
  }

  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: actor.id,
    },
    select: {
      id: true,
    },
  });

  if (workspace) {
    return { workspaceId: workspace.id, role: "owner" };
  }

  throw new AuthorizationError(
    "You do not have permission to access this workspace.",
    "FORBIDDEN",
    403
  );
}

/**
 * Verifies that `actor.id` has write permissions (`owner` or `editor`) in `workspaceId`.
 */
export async function assertWorkspaceWriteAccess(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<{ workspaceId: string; role: WorkspaceRole }> {
  const access = await assertWorkspaceReadAccess(db, actor, workspaceId);

  if (!WRITE_ROLES.includes(access.role)) {
    throw new AuthorizationError(
      "You have read-only access to this workspace.",
      "FORBIDDEN",
      403
    );
  }

  return access;
}

/**
 * Verifies that `actor.id` is the `owner` of `workspaceId`.
 */
export async function assertWorkspaceOwnerAccess(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<void> {
  const access = await assertWorkspaceReadAccess(db, actor, workspaceId);
  if (access.role !== "owner") {
    throw new AuthorizationError(
      "Only the workspace owner can perform this operation.",
      "FORBIDDEN",
      403
    );
  }
}

/**
 * Verifies that a target entity (`task`, `note`, `mind_map`, or `mind_map_node`)
 * exists AND is owned by the exact same `(actor.id, workspaceId)`.
 * Replaces PostgreSQL `verify_entity_ownership` trigger function.
 */
export async function verifyEntityOwnership(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  entityType: LinkableEntityType,
  entityId: string
): Promise<boolean> {
  switch (entityType) {
    case "task": {
      const task = await db.task.findFirst({
        where: { id: entityId, userId: actor.id, workspaceId },
        select: { id: true },
      });
      return Boolean(task);
    }
    case "note": {
      const note = await db.note.findFirst({
        where: { id: entityId, userId: actor.id, workspaceId },
        select: { id: true },
      });
      return Boolean(note);
    }
    case "mind_map": {
      const map = await db.mindMap.findFirst({
        where: { id: entityId, userId: actor.id, workspaceId },
        select: { id: true },
      });
      return Boolean(map);
    }
    case "mind_map_node": {
      const node = await db.mindMapNode.findFirst({
        where: { id: entityId, userId: actor.id, workspaceId },
        select: { id: true },
      });
      return Boolean(node);
    }
    default:
      return false;
  }
}

/**
 * Validates optional task references (`projectId`, `taskListId`, `parentTaskId`)
 * to prevent cross-user / cross-workspace IDOR linking and self-parenting.
 * Replaces PostgreSQL `enforce_task_relationships` trigger.
 */
export async function validateTaskRelationships(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  refs: {
    taskId?: string;
    projectId?: string | null;
    taskListId?: string | null;
    parentTaskId?: string | null;
  }
): Promise<void> {
  if (refs.taskId && refs.parentTaskId && refs.taskId === refs.parentTaskId) {
    throw new AuthorizationError(
      "A task cannot be set as its own parent subtask.",
      "SELF_REFERENCE",
      400
    );
  }

  if (refs.projectId) {
    const project = await db.project.findFirst({
      where: {
        id: refs.projectId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!project) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace project_id reference on task.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }

  if (refs.taskListId) {
    const taskList = await db.taskList.findFirst({
      where: {
        id: refs.taskListId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!taskList) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace task_list_id reference on task.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }

  if (refs.parentTaskId) {
    const parentTask = await db.task.findFirst({
      where: {
        id: refs.parentTaskId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!parentTask) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace parent_task_id reference on task.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }
}

/**
 * Validates optional note references (`projectId`, `parentNoteId`)
 * to prevent cross-user / cross-workspace IDOR linking and self-parenting.
 * Replaces PostgreSQL `enforce_note_relationships` trigger.
 */
export async function validateNoteRelationships(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  refs: {
    noteId?: string;
    projectId?: string | null;
    parentNoteId?: string | null;
  }
): Promise<void> {
  if (refs.noteId && refs.parentNoteId && refs.noteId === refs.parentNoteId) {
    throw new AuthorizationError(
      "A note cannot be set as its own parent note.",
      "SELF_REFERENCE",
      400
    );
  }

  if (refs.projectId) {
    const project = await db.project.findFirst({
      where: {
        id: refs.projectId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!project) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace project_id reference on note.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }

  if (refs.parentNoteId) {
    const parentNote = await db.note.findFirst({
      where: {
        id: refs.parentNoteId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!parentNote) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace parent_note_id reference on note.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }
}

/**
 * Validates mind map node references (`mindMapId`, `linkedTaskId`, `linkedNoteId`)
 * to ensure all linked entities belong to the same `(actor.id, workspaceId)`.
 * Replaces PostgreSQL `enforce_node_relationships` trigger.
 */
export async function validateMindMapNodeRelationships(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  refs: {
    mindMapId: string;
    linkedTaskId?: string | null;
    linkedNoteId?: string | null;
  }
): Promise<void> {
  const mindMap = await db.mindMap.findFirst({
    where: {
      id: refs.mindMapId,
      userId: actor.id,
      workspaceId,
    },
    select: { id: true },
  });

  if (!mindMap) {
    throw new AuthorizationError(
      "Target mind map does not exist or belongs to another user.",
      "CROSS_TENANT_REFERENCE",
      403
    );
  }

  if (refs.linkedTaskId) {
    const linkedTask = await db.task.findFirst({
      where: {
        id: refs.linkedTaskId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!linkedTask) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace linked_task_id on mind_map_node.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }

  if (refs.linkedNoteId) {
    const linkedNote = await db.note.findFirst({
      where: {
        id: refs.linkedNoteId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    });
    if (!linkedNote) {
      throw new AuthorizationError(
        "Invalid cross-user or cross-workspace linked_note_id on mind_map_node.",
        "CROSS_TENANT_REFERENCE",
        403
      );
    }
  }
}

/**
 * Validates mind map edge endpoints (`sourceNodeId`, `targetNodeId`) to ensure
 * both nodes exist inside the same mind map and belong to `(actor.id, workspaceId)`.
 */
export async function validateMindMapEdgeRelationships(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  refs: {
    mindMapId: string;
    sourceNodeId: string;
    targetNodeId: string;
  }
): Promise<void> {
  if (refs.sourceNodeId === refs.targetNodeId) {
    throw new AuthorizationError(
      "A mind map edge cannot connect a node to itself.",
      "SELF_REFERENCE",
      400
    );
  }

  const [sourceNode, targetNode] = await Promise.all([
    db.mindMapNode.findFirst({
      where: {
        id: refs.sourceNodeId,
        mindMapId: refs.mindMapId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    }),
    db.mindMapNode.findFirst({
      where: {
        id: refs.targetNodeId,
        mindMapId: refs.mindMapId,
        userId: actor.id,
        workspaceId,
      },
      select: { id: true },
    }),
  ]);

  if (!sourceNode || !targetNode) {
    throw new AuthorizationError(
      "Edge source or target node does not exist in the specified mind map or belongs to another user.",
      "CROSS_TENANT_REFERENCE",
      403
    );
  }
}

/**
 * Validates polymorphic cross-links (`entity_links`) so both `source` and `target`
 * belong to `(actor.id, workspaceId)`.
 * Replaces PostgreSQL `enforce_entity_link_ownership` trigger.
 */
export async function validateEntityLinkOwnership(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  link: {
    sourceType: LinkableEntityType;
    sourceId: string;
    targetType: LinkableEntityType;
    targetId: string;
  }
): Promise<void> {
  if (
    link.sourceType === link.targetType &&
    link.sourceId === link.targetId
  ) {
    throw new AuthorizationError(
      "An entity cannot be cross-linked to itself.",
      "SELF_REFERENCE",
      400
    );
  }

  const [sourceOwned, targetOwned] = await Promise.all([
    verifyEntityOwnership(
      db,
      actor,
      workspaceId,
      link.sourceType,
      link.sourceId
    ),
    verifyEntityOwnership(
      db,
      actor,
      workspaceId,
      link.targetType,
      link.targetId
    ),
  ]);

  if (!sourceOwned) {
    throw new AuthorizationError(
      `Source entity (${link.sourceType}/${link.sourceId}) does not exist or belongs to another user/workspace.`,
      "CROSS_TENANT_REFERENCE",
      403
    );
  }

  if (!targetOwned) {
    throw new AuthorizationError(
      `Target entity (${link.targetType}/${link.targetId}) does not exist or belongs to another user/workspace.`,
      "CROSS_TENANT_REFERENCE",
      403
    );
  }
}

/**
 * Creates a tenant-isolated repository bound to a verified server-side actor.
 *
 * Security guarantees:
 * 1. Never trusts `userId` or `ownerId` from client input — always enforces `actor.id`.
 * 2. Verifies workspace read/write membership on every operation.
 * 3. Scopes every `SELECT`, `UPDATE`, and `DELETE` by `{ id, userId: actor.id, workspaceId }`
 *    to eliminate IDOR (Insecure Direct Object Reference) vulnerabilities.
 * 4. Validates all linked entity IDs (`projectId`, `taskListId`, `parentTaskId`,
 *    `parentNoteId`, `linkedTaskId`, `linkedNoteId`, `entity_links`) against
 *    cross-user data leaks.
 */
export function createScopedRepository(db: DbClient, actor: VerifiedActor) {
  if (!actor?.id) {
    throw new AuthorizationError(
      "Cannot initialize scoped repository without a verified user.",
      "UNAUTHENTICATED",
      401
    );
  }

  return {
    actor,

    // ------------------------------------------------------------------------
    // Profiles
    // ------------------------------------------------------------------------
    profiles: {
      async getOwn() {
        return db.profile.findUnique({
          where: { id: actor.id },
        });
      },

      async updateOwn(input: {
        fullName?: string;
        avatarUrl?: string | null;
        defaultWorkspaceId?: string | null;
        preferences?: Prisma.InputJsonValue;
      }) {
        if (input.defaultWorkspaceId) {
          await assertWorkspaceReadAccess(db, actor, input.defaultWorkspaceId);
        }

        return db.profile.update({
          where: { id: actor.id },
          data: {
            ...(input.fullName !== undefined
              ? { fullName: input.fullName.trim() }
              : {}),
            ...(input.avatarUrl !== undefined
              ? { avatarUrl: input.avatarUrl }
              : {}),
            ...(input.defaultWorkspaceId !== undefined
              ? { defaultWorkspaceId: input.defaultWorkspaceId }
              : {}),
            ...(input.preferences !== undefined
              ? { preferences: input.preferences }
              : {}),
          },
        });
      },
    },

    // ------------------------------------------------------------------------
    // Workspaces
    // ------------------------------------------------------------------------
    workspaces: {
      async listAccessible() {
        return db.workspace.findMany({
          where: {
            OR: [
              { ownerId: actor.id },
              {
                members: {
                  some: { userId: actor.id },
                },
              },
            ],
          },
          orderBy: { createdAt: "asc" },
        });
      },

      async getById(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.workspace.findUnique({
          where: { id: workspaceId },
        });
      },
    },

    // ------------------------------------------------------------------------
    // Projects
    // ------------------------------------------------------------------------
    projects: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.project.findMany({
          where: { workspaceId, userId: actor.id },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
      },

      async getById(workspaceId: string, projectId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.project.findFirst({
          where: { id: projectId, workspaceId, userId: actor.id },
        });
      },

      async create(
        workspaceId: string,
        input: {
          name: string;
          description?: string;
          color?: string;
          icon?: string;
          status?: ProjectStatus;
          position?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const trimmedName = input.name.trim();
        if (!trimmedName) {
          throw new AuthorizationError(
            "Project name cannot be empty.",
            "VALIDATION_ERROR",
            400
          );
        }

        return db.project.create({
          data: {
            workspaceId,
            userId: actor.id,
            name: trimmedName,
            description: input.description ?? "",
            color: input.color ?? "#6366f1",
            icon: input.icon ?? "folder",
            status: input.status ?? "active",
            position: input.position ?? 1000.0,
          },
        });
      },

      async update(
        workspaceId: string,
        projectId: string,
        input: {
          name?: string;
          description?: string;
          color?: string;
          icon?: string;
          status?: ProjectStatus;
          position?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.project.findFirst({
          where: { id: projectId, workspaceId, userId: actor.id },
          select: { id: true },
        });
        if (!existing) {
          throw new AuthorizationError(
            "Project not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        return db.project.update({
          where: { id: existing.id },
          data: {
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
            ...(input.icon !== undefined ? { icon: input.icon } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.position !== undefined
              ? { position: input.position }
              : {}),
          },
        });
      },

      async delete(workspaceId: string, projectId: string) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.project.findFirst({
          where: { id: projectId, workspaceId, userId: actor.id },
          select: { id: true },
        });
        if (!existing) {
          throw new AuthorizationError(
            "Project not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        await db.project.delete({
          where: { id: existing.id },
        });
        return { deleted: true, id: existing.id };
      },
    },

    // ------------------------------------------------------------------------
    // Task Lists & Tasks
    // ------------------------------------------------------------------------
    taskLists: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.taskList.findMany({
          where: { workspaceId, userId: actor.id },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
      },

      async create(
        workspaceId: string,
        input: {
          name: string;
          projectId?: string | null;
          isDefault?: boolean;
          position?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        if (input.projectId) {
          await validateTaskRelationships(db, actor, workspaceId, {
            projectId: input.projectId,
          });
        }

        return db.taskList.create({
          data: {
            workspaceId,
            userId: actor.id,
            projectId: input.projectId ?? null,
            name: input.name.trim(),
            isDefault: input.isDefault ?? false,
            position: input.position ?? 1000.0,
          },
        });
      },
    },

    tasks: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.task.findMany({
          where: { workspaceId, userId: actor.id },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
      },

      async getById(workspaceId: string, taskId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.task.findFirst({
          where: { id: taskId, workspaceId, userId: actor.id },
        });
      },

      async create(
        workspaceId: string,
        input: {
          title: string;
          description?: string;
          taskListId?: string | null;
          projectId?: string | null;
          parentTaskId?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          dueDate?: Date | null;
          recurrenceRule?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
          position?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const trimmedTitle = input.title.trim();
        if (!trimmedTitle) {
          throw new AuthorizationError(
            "Task title cannot be empty.",
            "VALIDATION_ERROR",
            400
          );
        }

        await validateTaskRelationships(db, actor, workspaceId, {
          projectId: input.projectId,
          taskListId: input.taskListId,
          parentTaskId: input.parentTaskId,
        });

        return db.task.create({
          data: {
            workspaceId,
            userId: actor.id,
            title: trimmedTitle,
            description: input.description ?? "",
            taskListId: input.taskListId ?? null,
            projectId: input.projectId ?? null,
            parentTaskId: input.parentTaskId ?? null,
            status: input.status ?? "todo",
            priority: input.priority ?? "none",
            dueDate: input.dueDate ?? null,
            ...(input.recurrenceRule !== undefined
              ? { recurrenceRule: input.recurrenceRule }
              : {}),
            position: input.position ?? 1000.0,
          },
        });
      },

      async update(
        workspaceId: string,
        taskId: string,
        input: {
          title?: string;
          description?: string;
          taskListId?: string | null;
          projectId?: string | null;
          parentTaskId?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          dueDate?: Date | null;
          completedAt?: Date | null;
          position?: number;
          isArchived?: boolean;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.task.findFirst({
          where: { id: taskId, workspaceId, userId: actor.id },
          select: { id: true, version: true },
        });

        if (!existing) {
          throw new AuthorizationError(
            "Task not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        await validateTaskRelationships(db, actor, workspaceId, {
          taskId: existing.id,
          projectId: input.projectId,
          taskListId: input.taskListId,
          parentTaskId: input.parentTaskId,
        });

        return db.task.update({
          where: { id: existing.id },
          data: {
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.taskListId !== undefined
              ? { taskListId: input.taskListId }
              : {}),
            ...(input.projectId !== undefined
              ? { projectId: input.projectId }
              : {}),
            ...(input.parentTaskId !== undefined
              ? { parentTaskId: input.parentTaskId }
              : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.priority !== undefined
              ? { priority: input.priority }
              : {}),
            ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
            ...(input.completedAt !== undefined
              ? { completedAt: input.completedAt }
              : {}),
            ...(input.position !== undefined
              ? { position: input.position }
              : {}),
            ...(input.isArchived !== undefined
              ? { isArchived: input.isArchived }
              : {}),
            version: existing.version + 1,
          },
        });
      },

      async delete(workspaceId: string, taskId: string) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.task.findFirst({
          where: { id: taskId, workspaceId, userId: actor.id },
          select: { id: true },
        });

        if (!existing) {
          throw new AuthorizationError(
            "Task not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        await db.task.delete({
          where: { id: existing.id },
        });
        return { deleted: true, id: existing.id };
      },
    },

    // ------------------------------------------------------------------------
    // Notes & Note Versions
    // ------------------------------------------------------------------------
    notes: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.note.findMany({
          where: { workspaceId, userId: actor.id },
          orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        });
      },

      async getById(workspaceId: string, noteId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.note.findFirst({
          where: { id: noteId, workspaceId, userId: actor.id },
        });
      },

      async create(
        workspaceId: string,
        input: {
          title?: string;
          contentJson?: Prisma.InputJsonValue;
          contentText?: string;
          projectId?: string | null;
          parentNoteId?: string | null;
          isPinned?: boolean;
          position?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        await validateNoteRelationships(db, actor, workspaceId, {
          projectId: input.projectId,
          parentNoteId: input.parentNoteId,
        });

        return db.note.create({
          data: {
            workspaceId,
            userId: actor.id,
            title: input.title?.trim() || "Untitled Note",
            contentJson: input.contentJson ?? {
              type: "doc",
              content: [{ type: "paragraph" }],
            },
            contentText: input.contentText ?? "",
            projectId: input.projectId ?? null,
            parentNoteId: input.parentNoteId ?? null,
            isPinned: input.isPinned ?? false,
            position: input.position ?? 1000.0,
          },
        });
      },

      async update(
        workspaceId: string,
        noteId: string,
        input: {
          title?: string;
          contentJson?: Prisma.InputJsonValue;
          contentText?: string;
          projectId?: string | null;
          parentNoteId?: string | null;
          isPinned?: boolean;
          isArchived?: boolean;
          expectedVersion?: number;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.note.findFirst({
          where: { id: noteId, workspaceId, userId: actor.id },
          select: { id: true, version: true },
        });

        if (!existing) {
          throw new AuthorizationError(
            "Note not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        if (
          input.expectedVersion !== undefined &&
          input.expectedVersion !== existing.version
        ) {
          throw new AuthorizationError(
            "Note was modified in another session. Please resolve the version conflict.",
            "VERSION_CONFLICT",
            409
          );
        }

        await validateNoteRelationships(db, actor, workspaceId, {
          noteId: existing.id,
          projectId: input.projectId,
          parentNoteId: input.parentNoteId,
        });

        return db.note.update({
          where: { id: existing.id },
          data: {
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.contentJson !== undefined
              ? { contentJson: input.contentJson }
              : {}),
            ...(input.contentText !== undefined
              ? { contentText: input.contentText }
              : {}),
            ...(input.projectId !== undefined
              ? { projectId: input.projectId }
              : {}),
            ...(input.parentNoteId !== undefined
              ? { parentNoteId: input.parentNoteId }
              : {}),
            ...(input.isPinned !== undefined
              ? { isPinned: input.isPinned }
              : {}),
            ...(input.isArchived !== undefined
              ? { isArchived: input.isArchived }
              : {}),
            lastSavedAt: new Date(),
            version: existing.version + 1,
          },
        });
      },

      async delete(workspaceId: string, noteId: string) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.note.findFirst({
          where: { id: noteId, workspaceId, userId: actor.id },
          select: { id: true },
        });

        if (!existing) {
          throw new AuthorizationError(
            "Note not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        await db.note.delete({
          where: { id: existing.id },
        });
        return { deleted: true, id: existing.id };
      },
    },

    // ------------------------------------------------------------------------
    // Mind Maps, Nodes & Edges
    // ------------------------------------------------------------------------
    mindMaps: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.mindMap.findMany({
          where: { workspaceId, userId: actor.id },
          orderBy: [{ updatedAt: "desc" }],
        });
      },

      async getById(workspaceId: string, mindMapId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.mindMap.findFirst({
          where: { id: mindMapId, workspaceId, userId: actor.id },
        });
      },

      async create(
        workspaceId: string,
        input: {
          title: string;
          description?: string;
          projectId?: string | null;
          viewport?: Prisma.InputJsonValue;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        if (input.projectId) {
          await validateTaskRelationships(db, actor, workspaceId, {
            projectId: input.projectId,
          });
        }

        return db.mindMap.create({
          data: {
            workspaceId,
            userId: actor.id,
            title: input.title.trim(),
            description: input.description ?? "",
            projectId: input.projectId ?? null,
            viewport: input.viewport ?? { x: 0, y: 0, zoom: 1 },
          },
        });
      },

      async createNode(
        workspaceId: string,
        input: {
          mindMapId: string;
          type?: MindMapNodeType;
          label?: string;
          noteExcerpt?: string;
          positionX?: number;
          positionY?: number;
          linkedTaskId?: string | null;
          linkedNoteId?: string | null;
          style?: Prisma.InputJsonValue;
          data?: Prisma.InputJsonValue;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        await validateMindMapNodeRelationships(db, actor, workspaceId, {
          mindMapId: input.mindMapId,
          linkedTaskId: input.linkedTaskId,
          linkedNoteId: input.linkedNoteId,
        });

        return db.mindMapNode.create({
          data: {
            workspaceId,
            userId: actor.id,
            mindMapId: input.mindMapId,
            type: input.type ?? "idea",
            label: input.label ?? "New Idea",
            noteExcerpt: input.noteExcerpt ?? "",
            positionX: input.positionX ?? 0,
            positionY: input.positionY ?? 0,
            linkedTaskId: input.linkedTaskId ?? null,
            linkedNoteId: input.linkedNoteId ?? null,
            style: input.style ?? {},
            data: input.data ?? {},
          },
        });
      },

      async createEdge(
        workspaceId: string,
        input: {
          mindMapId: string;
          sourceNodeId: string;
          targetNodeId: string;
          sourceHandle?: string | null;
          targetHandle?: string | null;
          label?: string;
          type?: MindMapEdgeType;
          animated?: boolean;
          style?: Prisma.InputJsonValue;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        await validateMindMapEdgeRelationships(db, actor, workspaceId, {
          mindMapId: input.mindMapId,
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
        });

        return db.mindMapEdge.create({
          data: {
            workspaceId,
            userId: actor.id,
            mindMapId: input.mindMapId,
            sourceNodeId: input.sourceNodeId,
            targetNodeId: input.targetNodeId,
            sourceHandle: input.sourceHandle ?? null,
            targetHandle: input.targetHandle ?? null,
            label: input.label ?? "",
            type: input.type ?? "smoothstep",
            animated: input.animated ?? false,
            style: input.style ?? {},
          },
        });
      },
    },

    // ------------------------------------------------------------------------
    // Entity Cross-Links
    // ------------------------------------------------------------------------
    entityLinks: {
      async list(workspaceId: string) {
        await assertWorkspaceReadAccess(db, actor, workspaceId);
        return db.entityLink.findMany({
          where: { workspaceId, userId: actor.id },
        });
      },

      async create(
        workspaceId: string,
        input: {
          sourceType: LinkableEntityType;
          sourceId: string;
          targetType: LinkableEntityType;
          targetId: string;
          relationship?: EntityRelationshipType;
        }
      ) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        await validateEntityLinkOwnership(db, actor, workspaceId, input);

        return db.entityLink.create({
          data: {
            workspaceId,
            userId: actor.id,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            targetType: input.targetType,
            targetId: input.targetId,
            relationship: input.relationship ?? "references",
          },
        });
      },

      async delete(workspaceId: string, linkId: string) {
        await assertWorkspaceWriteAccess(db, actor, workspaceId);
        const existing = await db.entityLink.findFirst({
          where: { id: linkId, workspaceId, userId: actor.id },
          select: { id: true },
        });

        if (!existing) {
          throw new AuthorizationError(
            "Entity link not found or access denied.",
            "NOT_FOUND_OR_FORBIDDEN",
            404
          );
        }

        await db.entityLink.delete({
          where: { id: existing.id },
        });
        return { deleted: true, id: existing.id };
      },
    },
  };
}
