import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/server";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import {
  executeLocalDataImport,
  previewLocalDataImport,
} from "@/lib/sync/sync-repository";
import { AuthorizationError } from "@/lib/security/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required to import data." },
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
    if (!body?.localData || typeof body.localData !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid localData payload." },
        { status: 400 }
      );
    }

    const actor = { id: user.id, email: user.email };

    if (body.dryRun === true) {
      const preview = await previewLocalDataImport(
        prisma,
        actor,
        workspaceId,
        body.localData
      );
      return NextResponse.json({
        success: true,
        dryRun: true,
        preview: preview.counts,
        needsImport: preview.needsImport,
      });
    }

    const importResult = await executeLocalDataImport(
      prisma,
      actor,
      workspaceId,
      body.localData
    );

    return NextResponse.json({
      success: true,
      dryRun: false,
      importedCounts: importResult.importedCounts,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
