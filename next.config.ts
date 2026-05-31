import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.13:3000', '192.168.1.13', 'localhost:3000']
};

export default nextConfig;
