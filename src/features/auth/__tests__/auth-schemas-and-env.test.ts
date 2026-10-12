import { describe, expect, it } from "vitest";
import {
  evaluatePasswordStrength,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas";
import { sanitizeRedirectPath } from "@/lib/supabase/env";

describe("T2.1 — Auth Zod Schemas, Password Strength & Redirect Sanitizer", () => {
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
