import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_ORIGIN || "https://gossipuerj-api.onrender.com"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
