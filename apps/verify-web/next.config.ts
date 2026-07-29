import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@dtg/configuration", "@dtg/contracts", "@dtg/ui"],
}

export default nextConfig
