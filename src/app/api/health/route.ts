import { NextResponse } from "next/server";
import {
  isAuthConfigured,
  isDatabaseConfigured,
  isSmtpConfigured,
} from "@/lib/auth/env";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "unconfigured";
  let dbErrorCode: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      dbStatus = "connected";
    } catch (err: unknown) {
      dbStatus = "error";
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        dbErrorCode = err.code;
      } else if (err instanceof Prisma.PrismaClientInitializationError) {
        dbErrorCode = err.errorCode || "P1000";
      } else {
        dbErrorCode = "UNKNOWN_ERROR";
      }
    }
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    app: "MindDesk",
    phase: 2,
    architecture: {
      hosting: "Hostinger Node.js",
      database: "MySQL (Prisma ORM)",
      auth: "Better Auth",
      databaseConfigured: isDatabaseConfigured(),
      databaseConnected: dbStatus === "connected",
      databaseStatus: dbStatus,
      databaseErrorCode: dbErrorCode,
      authConfigured: isAuthConfigured(),
      smtpConfigured: isSmtpConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
}
