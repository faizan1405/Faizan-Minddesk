import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/tasks",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
