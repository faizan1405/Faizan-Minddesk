import crypto from "node:crypto";
import { getBetterAuthSecret } from "@/lib/auth/env";

export const ADMIN_SESSION_COOKIE = "minddesk_admin_session";

interface AdminTokenPayload {
  userId: string;
  email: string;
  createdAt: number;
}

export function createAdminSessionToken(userId: string, email: string): string {
  const secret = getBetterAuthSecret();
  const payload: AdminTokenPayload = {
    userId,
    email: email.toLowerCase(),
    createdAt: Date.now(),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("hex");

  return `${payloadBase64}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminTokenPayload | null {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadBase64, providedSig] = token.split(".");
  if (!payloadBase64 || !providedSig) {
    return null;
  }

  try {
    const secret = getBetterAuthSecret();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(providedSig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return null;
    }

    const json = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as AdminTokenPayload;

    // Reject tokens older than 60 days
    if (Date.now() - payload.createdAt > 60 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
