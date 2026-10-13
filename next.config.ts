import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
};

export default nextConfig;
