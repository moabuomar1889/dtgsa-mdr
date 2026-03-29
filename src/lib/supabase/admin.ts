import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env, hasSupabaseServiceRole } from "@/lib/config/env"

export function createSupabaseAdminClient() {
  if (!hasSupabaseServiceRole || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required before creating the admin Supabase client.",
    )
  }

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
