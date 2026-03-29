import { z } from "zod"

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().optional(),
})

const parsedClientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
})

const supabasePublishableKey =
  parsedClientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  parsedClientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  parsedClientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabasePublishableKey) {
  throw new Error(
    "A Supabase publishable key is required on the client environment.",
  )
}

export const clientEnv = {
  ...parsedClientEnv,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    parsedClientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? supabasePublishableKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
}
