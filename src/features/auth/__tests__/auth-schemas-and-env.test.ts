import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  evaluatePasswordStrength,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas";
import {
  isAuthConfigured,
  isDatabaseConfigured,
  isSmtpConfigured,
  sanitizeRedirectPath,
} from "@/lib/auth/env";

describe("T2.1 — Auth Zod Schemas, Password Strength, Env Validators & Redirect Sanitizer", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates loginSchema and rejects invalid email or short password", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "Password123!",
      }).success
    ).toBe(true);

    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "Password123!",
      }).success
    ).toBe(false);

    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "short",
      }).success
    ).toBe(false);
  });

  it("validates signupSchema including international Unicode names and strong passwords", () => {
    const validUnicode = signupSchema.safeParse({
      fullName: "Fáizän Al-Mansoor 李",
      email: "faizan@example.com",
      password: "SecurePassword99!",
    });
    expect(validUnicode.success).toBe(true);

    const weakNoNumber = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "OnlyLettersPassword",
    });
    expect(weakNoNumber.success).toBe(false);
  });

  it("validates forgotPasswordSchema and updatePasswordSchema", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "reset@example.com" }).success
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);

    expect(
      updatePasswordSchema.safeParse({ password: "NewStrongPassword1!" })
        .success
    ).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "12345678" }).success).toBe(
      false
    );
  });

  it("evaluates password strength criteria accurately", () => {
    expect(evaluatePasswordStrength("short")).toEqual({
      minLength: false,
      hasLetter: true,
      hasNumberOrSymbol: false,
      score: 1,
    });

    expect(evaluatePasswordStrength("StrongPass1!")).toEqual({
      minLength: true,
      hasLetter: true,
      hasNumberOrSymbol: true,
      score: 3,
    });
  });

  it("validates MySQL DATABASE_URL, BETTER_AUTH_SECRET, and SMTP configuration", () => {
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    expect(isDatabaseConfigured()).toBe(false);
    expect(isAuthConfigured()).toBe(false);

    // Rejects template placeholders
    process.env.DATABASE_URL =
      "mysql://your-mysql-user:your-mysql-password@localhost:3306/your-database-name";
    process.env.BETTER_AUTH_SECRET = "replace-with-a-32-char-secret";
    expect(isDatabaseConfigured()).toBe(false);
    expect(isAuthConfigured()).toBe(false);

    // Accepts valid MySQL URL and strong secret
    process.env.DATABASE_URL =
      "mysql://u123456_minddesk:StrongPass!@127.0.0.1:3306/u123456_minddesk";
    process.env.BETTER_AUTH_SECRET =
      "a-very-strong-production-secret-at-least-32-characters";
    expect(isDatabaseConfigured()).toBe(true);
    expect(isAuthConfigured()).toBe(true);

    // SMTP configuration check
    expect(isSmtpConfigured()).toBe(false);
    process.env.SMTP_HOST = "smtp.hostinger.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "noreply@minddesk.app";
    process.env.SMTP_PASS = "SmtpSecretPass123!";
    expect(isSmtpConfigured()).toBe(true);
  });

  it("sanitizes post-login redirect paths and blocks open-redirect attacks", () => {
    expect(sanitizeRedirectPath("/tasks")).toBe("/tasks");
    expect(sanitizeRedirectPath("/notes/abc-123?view=links")).toBe(
      "/notes/abc-123?view=links"
    );

    // Block external URLs, protocol-relative URLs, backslash tricks, and auth loops
    expect(sanitizeRedirectPath("https://malicious.example.com")).toBe(
      "/dashboard"
    );
    expect(sanitizeRedirectPath("//malicious.example.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/\\malicious.example.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/login")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/signup")).toBe("/dashboard");
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
  });
});
