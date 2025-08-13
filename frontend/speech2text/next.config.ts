import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/transcribe",
        //destination: "http://backend:8000/transcribe",
        destination: "http://localhost:8000/transcribe",
      },
    ];
  },
};

export default nextConfig;
