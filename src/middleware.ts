import type { NextRequest } from "next/server";
import { updateSessionAndGuardRoutes } from "@/lib/auth/middleware";

export async function middleware(request: NextRequest) {
  return await updateSessionAndGuardRoutes(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
