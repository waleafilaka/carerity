import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.2.22",
    "localhost",
  ],
};

export default nextConfig;
