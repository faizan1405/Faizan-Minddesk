import { z } from "zod";

export const emailFieldSchema = z
  .string()
  .trim()
  .min(1, "Email address is required.")
  .email("Enter a valid email address.");

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must be 128 characters or fewer.")
  .refine((val) => /\p{L}/u.test(val), {
    message: "Password must include at least one letter.",
  })
  .refine((val) => /[\p{N}\p{P}\p{S}]/u.test(val), {
    message: "Password must include at least one number or symbol.",
  });

export const loginSchema = z.object({
  email: emailFieldSchema,
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters long."),
  next: z.string().optional(),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailFieldSchema,
  password: strongPasswordSchema,
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailFieldSchema,
});

export const updatePasswordSchema = z.object({
  password: strongPasswordSchema,
});

export interface PasswordStrengthResult {
  minLength: boolean;
  hasLetter: boolean;
  hasNumberOrSymbol: boolean;
  score: 0 | 1 | 2 | 3;
}

export function evaluatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const minLength = password.length >= 8;
  const hasLetter = /\p{L}/u.test(password);
  const hasNumberOrSymbol = /[\p{N}\p{P}\p{S}]/u.test(password);
  const score = [minLength, hasLetter, hasNumberOrSymbol].filter(Boolean)
    .length as 0 | 1 | 2 | 3;

  return {
    minLength,
    hasLetter,
    hasNumberOrSymbol,
    score,
  };
}
