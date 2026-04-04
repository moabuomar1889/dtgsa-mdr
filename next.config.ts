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
  images: {
    remotePatterns,
  },
}

export default nextConfig
