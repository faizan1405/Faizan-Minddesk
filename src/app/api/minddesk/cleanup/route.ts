import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/server";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import {
  previewUserProductivityCleanup,
} from "@/lib/sync/cleanup-repository";
import { AuthorizationError } from "@/lib/security/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required to run cleanup." },
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

    const body = await req.json().catch(() => ({}));
    if (body?.dryRun === false) {
      return NextResponse.json(
        {
          error:
            "Destructive cleanup execution via API is disabled. Inspect the dry-run preview first and run the maintenance script with confirmation.",
        },
        { status: 403 }
      );
    }

    const actor = { id: user.id, email: user.email };

    const preview = await previewUserProductivityCleanup(
      prisma,
      actor,
      workspaceId
    );
    return NextResponse.json({
      success: true,
      dryRun: true,
      preview,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
