"use client"

import { createBrowserClient } from "@supabase/ssr"
import { clientEnv } from "@/lib/config/env-client"

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
