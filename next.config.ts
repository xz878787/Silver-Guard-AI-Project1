import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出为静态站点，方便部署到任何地方
  output: "export",
  // 禁用图片优化（静态导出需要）
  images: { unoptimized: true },
};

export default nextConfig;
