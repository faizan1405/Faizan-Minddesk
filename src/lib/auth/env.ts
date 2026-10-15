export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

const PLACEHOLDER_PATTERNS = [
  "your-mysql-user",
  "your-mysql-password",
  "your-database-name",
  "replace-with-",
  "change-me-in-production",
];

function hasPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Checks whether a valid MySQL `DATABASE_URL` is configured on the server.
 */
export function isDatabaseConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return false;
  }

  if (
    hasPlaceholder(dbUrl) ||
    (!dbUrl.startsWith("mysql://") && !dbUrl.startsWith("mysqls://"))
  ) {
    return false;
  }

  return true;
}

/**
 * Checks whether both `DATABASE_URL` and `BETTER_AUTH_SECRET` are configured
 * for live server-side authentication.
 */
export function isAuthConfigured(): boolean {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!isDatabaseConfigured() || !secret || secret.length < 16) {
    return false;
  }

  if (hasPlaceholder(secret)) {
    return false;
  }

  return true;
}

/**
 * Checks whether SMTP environment credentials are configured for transactional
 * email delivery (verification & password recovery).
 */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !port || !user || !pass) {
    return false;
  }

  if (hasPlaceholder(host) || hasPlaceholder(user) || hasPlaceholder(pass)) {
    return false;
  }

  return true;
}

export function getSmtpConfig(): SmtpConfig | null {
  if (!isSmtpConfigured()) {
    return null;
  }

  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "587", 10);
  const secureEnv = process.env.SMTP_SECURE?.trim()?.toLowerCase();
  const secure =
    secureEnv === "true" || secureEnv === "1" || (!secureEnv && port === 465);

  return {
    host: process.env.SMTP_HOST!.trim(),
    port: Number.isNaN(port) ? 587 : port,
    secure,
    user: process.env.SMTP_USER!.trim(),
    pass: process.env.SMTP_PASS!.trim(),
    from:
      process.env.SMTP_FROM?.trim() ||
      `MindDesk <${process.env.SMTP_USER!.trim()}>`,
  };
}

export function getAppBaseUrl(): string {
  const candidate =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";

  return candidate.replace(/\/$/, "");
}

export function getBetterAuthSecret(): string {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();
  if (configured && configured.length >= 16 && !hasPlaceholder(configured)) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    // Allow Next.js build static analysis to complete while warning if secret is absent
    return "minddesk-build-time-placeholder-secret-do-not-use-in-runtime";
  }

  return "minddesk-local-dev-fallback-secret-minimum-32-chars";
}

/**
 * Sanitizes a post-login return path to prevent open-redirect vulnerabilities.
 * Only allows internal relative paths starting with a single '/'.
 */
export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
  fallback = "/tasks"
): string {
  if (!rawPath || typeof rawPath !== "string") {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // Must start with '/' and must not start with '//' or '/\' or contain protocol schemes
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }

  // Avoid redirecting back into guest-only auth pages
  if (
    trimmed.startsWith("/login") ||
    trimmed.startsWith("/signup") ||
    trimmed.startsWith("/forgot-password")
  ) {
    return fallback;
  }

  // Redirect legacy /dashboard paths to /tasks
  if (trimmed === "/dashboard" || trimmed.startsWith("/dashboard/")) {
    return "/tasks";
  }

  return trimmed;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Checks whether static single-owner admin credentials are configured in
 * environment variables (e.g. ADMIN_EMAIL and ADMIN_PASSWORD).
 * When configured, this bypasses the need for SMTP or open public registrations.
 */
export function getAdminCredentials(): AdminCredentials | null {
  const email = (process.env.ADMIN_EMAIL || process.env.AUTH_EMAIL)?.trim();
  const password = (process.env.ADMIN_PASSWORD || process.env.AUTH_PASSWORD)?.trim();

  if (!email || !password) {
    return null;
  }

  return {
    email: email.toLowerCase(),
    password,
  };
}

export function isAdminAuthConfigured(): boolean {
  return getAdminCredentials() !== null;
}
