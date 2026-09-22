import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Docker 构建跳过 lint，类型检查仍由 `next build` 完成；lint 留给 CI/本地
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
