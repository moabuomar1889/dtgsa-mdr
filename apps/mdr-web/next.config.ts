import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const remotePatterns = []

if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl)
    remotePatterns.push({
      protocol: parsedUrl.protocol.replace(":", "") as "http" | "https",
      hostname: parsedUrl.hostname,
    })
  } catch {
    // Ignore invalid URLs here; env validation handles this elsewhere.
  }
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@dtg/authorization",
    "@dtg/database",
    "@dtg/document-control-domain",
    "@dtg/pdf-engine",
  ],
  images: {
    remotePatterns,
  },
}

export default nextConfig
