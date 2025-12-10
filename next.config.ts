import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  env: {
    VEXA_API_URL: process.env.VEXA_API_URL || "http://localhost:18056",
    VEXA_API_KEY: process.env.VEXA_API_KEY || "",
    NEXT_PUBLIC_VEXA_WS_URL: process.env.NEXT_PUBLIC_VEXA_WS_URL || "ws://localhost:18056/ws",
  },
};

export default nextConfig;
