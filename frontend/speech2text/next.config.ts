import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/dispatch",
        //destination: "http://backend:8000/dispatch",
        destination: "http://localhost:8000/dispatch",
      },
    ];
  },
};

export default nextConfig;
