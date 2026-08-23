import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image de production minimale pour Docker (voir Dockerfile).
  output: "standalone",
};

export default nextConfig;
