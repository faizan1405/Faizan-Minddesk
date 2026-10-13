import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/server";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import {
  getWorkspaceDeskData,
  saveWorkspaceDeskData,
} from "@/lib/sync/sync-repository";
import { AuthorizationError } from "@/lib/security/errors";

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

    return NextResponse.json({
      success: true,
      data: deskData,
      workspaceId,
      userId: user.id,
      serverTimestamp: Date.now(),
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
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
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
