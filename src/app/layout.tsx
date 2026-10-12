import type { Metadata } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "MindDesk — Personal Knowledge & Productivity Workspace",
    template: "%s | MindDesk",
  },
  description:
    "Unified personal productivity workspace combining Google Tasks-inspired task lists, Notion-style rich notes, and interactive React Flow mind maps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
