import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone é ideal para Docker/Cloud Run, mas no Vercel conflita com o tracing nativo
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
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
