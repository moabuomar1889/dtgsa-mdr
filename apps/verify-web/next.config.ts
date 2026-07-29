import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@dtg/configuration",
    "@dtg/contracts",
    "@dtg/database",
    "@dtg/ui",
    "@dtg/verification-domain",
  ],
}

export default nextConfig
