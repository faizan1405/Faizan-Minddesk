import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import {
  sendPasswordResetEmailMessage,
  sendVerificationEmailMessage,
} from "@/lib/auth/email";
import {
  getAppBaseUrl,
  getBetterAuthSecret,
  isSmtpConfigured,
} from "@/lib/auth/env";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";

export const auth = betterAuth({
  appName: "MindDesk",
  baseURL: getAppBaseUrl(),
  secret: getBetterAuthSecret(),
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: isSmtpConfigured(),
    async sendResetPassword({ user, url, token }) {
      const baseUrl = getAppBaseUrl();
      const callbackUrl = `${baseUrl}/auth/callback?type=recovery&token=${encodeURIComponent(
        token
      )}&next=/update-password`;

      await sendPasswordResetEmailMessage({
        email: user.email,
        name: user.name,
        resetUrl: url || callbackUrl,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url, token }) {
      const baseUrl = getAppBaseUrl();
      const callbackUrl = `${baseUrl}/auth/callback?type=verify&token=${encodeURIComponent(
        token
      )}&next=/tasks`;

      await sendVerificationEmailMessage({
        email: user.email,
        name: user.name,
        verificationUrl: url || callbackUrl,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureUserWorkspaceProvisioned(
            {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            },
            prisma
          );
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type SessionData = typeof auth.$Infer.Session;
