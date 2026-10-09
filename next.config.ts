import type { NextConfig } from "next";

// Live telemetry + server API proxies: every route is dynamic by design (see the
// `force-dynamic` exports in app/api/*). Cache Components is intentionally not used.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Arena's browser preview uses a separate *.e2b.app hostname for dev assets/HMR.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
