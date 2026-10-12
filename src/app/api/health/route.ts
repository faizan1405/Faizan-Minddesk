import { NextResponse } from "next/server";
import {
  isAuthConfigured,
  isDatabaseConfigured,
  isSmtpConfigured,
} from "@/lib/auth/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "MindDesk",
    phase: 2,
    architecture: {
      hosting: "Hostinger Node.js",
      database: "MySQL (Prisma ORM)",
      auth: "Better Auth",
      databaseConfigured: isDatabaseConfigured(),
      authConfigured: isAuthConfigured(),
      smtpConfigured: isSmtpConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
}
