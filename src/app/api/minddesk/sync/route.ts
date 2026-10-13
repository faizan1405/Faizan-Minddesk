import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/server";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import {
  getWorkspaceDeskData,
  saveWorkspaceDeskData,
} from "@/lib/sync/sync-repository";
import { AuthorizationError } from "@/lib/security/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

function handleSyncError(err: unknown, operation: "sync" | "save") {
  if (err instanceof AuthorizationError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.statusCode }
    );
  }

  const diagnosticId = `err_${crypto.randomBytes(6).toString("hex")}`;
  let code = "INTERNAL_SERVER_ERROR";
  let message =
    operation === "sync"
      ? "Unable to synchronize workspace data from server."
      : "Unable to save workspace data to server.";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    code = err.code;
    if (err.code === "P2021") {
      message = "Database workspace tables are not fully provisioned.";
    } else if (err.code === "P2022") {
      message = "Database schema column is missing.";
    } else if (err.code === "P2003") {
      message = "Workspace identity relationship constraint failed.";
    } else if (err.code === "P1001" || err.code === "P1000") {
      message = "Database server is unreachable or access was denied.";
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    code = "P1000";
    message = "Database initialization error.";
  }

  // Detailed server-side diagnostic log for operator inspection
  console.error(`[MINDDESK_${operation.toUpperCase()}_FAIL] [${diagnosticId}]`, {
    code,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return NextResponse.json(
    {
      error: message,
      code,
      diagnosticId,
    },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const user = await getVerifiedUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required to sync data." },
        { status: 401 }
      );
    }

    let workspaceId = user.defaultWorkspaceId;
    if (!workspaceId) {
      const provisioned = await ensureUserWorkspaceProvisioned(
        {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl,
        },
        prisma
      );
      workspaceId = provisioned.defaultWorkspaceId;
    }

    const actor = { id: user.id, email: user.email };
    const deskData = await getWorkspaceDeskData(prisma, actor, workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: deskData,
        workspaceId,
        userId: user.id,
        serverTimestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    return handleSyncError(err, "sync");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required to save data." },
        { status: 401 }
      );
    }

    let workspaceId = user.defaultWorkspaceId;
    if (!workspaceId) {
      const provisioned = await ensureUserWorkspaceProvisioned(
        {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl,
        },
        prisma
      );
      workspaceId = provisioned.defaultWorkspaceId;
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid payload body." },
        { status: 400 }
      );
    }

    const actor = { id: user.id, email: user.email };
    const result = await saveWorkspaceDeskData(
      prisma,
      actor,
      workspaceId,
      body.data || {},
      {
        deletedTaskIds: body.deletedTaskIds,
        deletedNoteIds: body.deletedNoteIds,
        deletedMapIds: body.deletedMapIds,
      }
    );

    return NextResponse.json({
      success: true,
      updatedAt: result.updatedAt,
      serverTimestamp: Date.now(),
    });
  } catch (err: unknown) {
    return handleSyncError(err, "save");
  }
}
