import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/paths";
import { embedHeaders, pageHeaders } from "./lib/securityHeaders";

const isDev = process.env.NODE_ENV === "development";

const config: NextConfig = {
  basePath: BASE_PATH,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async redirects() {
    return [{ source: "/", destination: "/map", permanent: false }];
  },
  async headers() {
    return [
      { source: "/((?!embed).*)", headers: pageHeaders(isDev) },
      { source: "/embed", headers: embedHeaders(isDev) },
    ];
  },
};

export default config;
