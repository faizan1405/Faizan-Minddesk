import * as React from "react";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft font-semibold text-brand-ink">
            M
          </span>
          <span className="text-sm font-semibold">Mind Desk</span>
        </Link>

        <div className="minddesk-panel p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{subtitle}</p>

          {children}

          {footer && (
            <div className="mt-6 text-center text-xs text-muted-foreground">
              {footer}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Create account
          </Link>
          <Link href="/forgot-password" className="hover:text-foreground">
            Forgot password
          </Link>
        </div>
      </section>
    </main>
  );
}
