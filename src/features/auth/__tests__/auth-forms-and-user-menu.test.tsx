import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/components/login-form";
import { SignupForm } from "@/features/auth/components/signup-form";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("T2.3 — Auth Forms, Accessibility Attributes & Sidebar UserMenu", () => {
  it("renders LoginForm with mandatory autocomplete attributes and Show/Hide password toggle", () => {
    render(<LoginForm nextPath="/tasks" authConfigured={true} />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "username");
    expect(emailInput).toBeRequired();

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("id", "current-password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    expect(passwordInput).toHaveAttribute("type", "password");

    // Toggle password visibility
    const showBtn = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(showBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    const hideBtn = screen.getByRole("button", { name: /hide password/i });
    fireEvent.click(hideBtn);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders SignupForm with new-password autocomplete and live password strength meter", () => {
    render(<SignupForm authConfigured={true} />);

    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toHaveAttribute("autocomplete", "name");

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("id", "new-password");
    expect(passwordInput).toHaveAttribute("autocomplete", "new-password");

    fireEvent.change(passwordInput, { target: { value: "StrongPass1!" } });
    expect(screen.getByText("8+ characters")).toBeInTheDocument();
    expect(screen.getByText("At least 1 letter")).toBeInTheDocument();
    expect(screen.getByText("1 number/symbol")).toBeInTheDocument();
  });

  it("renders ForgotPasswordForm and UpdatePasswordForm with accessible controls", () => {
    const { unmount } = render(<ForgotPasswordForm authConfigured={true} />);
    expect(
      screen.getByRole("button", { name: /send reset link/i })
    ).toBeInTheDocument();
    unmount();

    render(<UpdatePasswordForm recoveryToken="reset-token-123" />);
    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  it("displays signed-in user details and profile/logout dropdown in AppShell sidebar", () => {
    render(
      <AppShell
        user={{
          id: "u-1",
          email: "faizan@minddesk.app",
          fullName: "Faizan Architect",
        }}
      >
        <div>Tasks View</div>
      </AppShell>
    );

    expect(screen.getByTestId("user-menu-name")).toHaveTextContent(
      "Faizan Architect"
    );
    expect(screen.getByTestId("user-menu-email")).toHaveTextContent(
      "faizan@minddesk.app"
    );

    const trigger = screen.getByTestId("user-menu-trigger");
    fireEvent.click(trigger);

    expect(screen.getByTestId("user-menu-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("logout-button")).toHaveTextContent("Sign out");
  });
});
