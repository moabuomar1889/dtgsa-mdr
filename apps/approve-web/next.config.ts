import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@dtg/configuration",
    "@dtg/contracts",
    "@dtg/identity-domain",
    "@dtg/review-domain",
    "@dtg/ui",
  ],
}

export default nextConfig
