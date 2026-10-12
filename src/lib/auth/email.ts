import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/auth/env";

export interface TransactionalEmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends a transactional email (verification or password recovery) via SMTP
 * when credentials are configured in `.env` / Hostinger environment variables.
 * In local development without SMTP configured, logs the link securely to server stdout.
 */
export async function sendTransactionalEmail(
  payload: TransactionalEmailPayload
): Promise<{ delivered: boolean; mode: "smtp" | "dev-log" }> {
  const smtp = getSmtpConfig();

  if (!smtp) {
    if (process.env.NODE_ENV !== "test") {
      console.info(
        `[MindDesk Email][dev-log] To: ${payload.to} | Subject: ${payload.subject}\n${payload.text}`
      );
    }
    return { delivered: false, mode: "dev-log" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { delivered: true, mode: "smtp" };
}

export async function sendVerificationEmailMessage(params: {
  email: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const greeting = params.name?.trim() ? `Hi ${params.name.trim()},` : "Hi,";

  return sendTransactionalEmail({
    to: params.email,
    subject: "Verify your MindDesk email address",
    text: `${greeting}\n\nWelcome to MindDesk! Please verify your email address by opening the link below:\n\n${params.verificationUrl}\n\nIf you did not create a MindDesk account, you can safely ignore this email.`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">Verify your MindDesk email</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">${greeting}</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Welcome to MindDesk! Confirm your email address to activate your personal workspace:
        </p>
        <p style="margin: 20px 0;">
          <a href="${params.verificationUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Verify Email Address
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmailMessage(params: {
  email: string;
  name?: string | null;
  resetUrl: string;
}) {
  const greeting = params.name?.trim() ? `Hi ${params.name.trim()},` : "Hi,";

  return sendTransactionalEmail({
    to: params.email,
    subject: "Reset your MindDesk password",
    text: `${greeting}\n\nWe received a request to reset your MindDesk password. Open the secure link below to choose a new password:\n\n${params.resetUrl}\n\nIf you did not request a password reset, you can safely ignore this message.`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">Reset your MindDesk password</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">${greeting}</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Click the button below to set a new password for your MindDesk account:
        </p>
        <p style="margin: 20px 0;">
          <a href="${params.resetUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Set New Password
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">
          If you did not request a password reset, no changes have been made to your account.
        </p>
      </div>
    `,
  });
}
