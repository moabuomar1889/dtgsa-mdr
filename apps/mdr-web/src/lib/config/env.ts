import "server-only"
import { z } from "zod"
import { assertLocalProviderConfiguration } from "@dtg/local-acceptance"

if (process.env.LOCAL_ACCEPTANCE_MODE === "true") {
  assertLocalProviderConfiguration(process.env)
}

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().optional()
)
const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().email().optional()
)
const optionalPositiveInt = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value)

  if (typeof normalized === "undefined") {
    return undefined
  }

  if (typeof normalized === "number") {
    return normalized
  }

  return Number(normalized)
}, z.number().int().positive().optional())

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(32),
  CRON_SECRET: z.string().min(16),
  DEFAULT_TIMEZONE: z.string().min(1).default("Asia/Riyadh"),
  FILE_UPLOAD_MAX_MB: z.coerce.number().int().positive().default(25),
  TRANSMITTAL_MAX_TOTAL_MB: z.coerce.number().int().positive().default(25),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET_SOURCE: z.string().min(1).default("source-files"),
  SUPABASE_STORAGE_BUCKET_GENERATED: z
    .string()
    .min(1)
    .default("generated-files"),
  SUPABASE_STORAGE_BUCKET_SIGNATURES: z
    .string()
    .min(1)
    .default("signature-files"),
  SUPABASE_STORAGE_BUCKET_TEMP: z.string().min(1).default("temp-files"),
  GOOGLE_DRIVE_PROJECT_ID: optionalString,
  GOOGLE_DRIVE_CLIENT_EMAIL: optionalEmail,
  GOOGLE_DRIVE_PRIVATE_KEY: optionalString,
  GOOGLE_DRIVE_SHARED_DRIVE_ID: optionalString,
  GOOGLE_DRIVE_IMPERSONATE_USER: optionalEmail,
  GOOGLE_DRIVE_ROOT_FOLDER_ID: optionalString,
  GOOGLE_DRIVE_PROJECTS_FOLDER_ID: optionalString,
  GOOGLE_DRIVE_FOLDER_SCAN_PREFIX: z
    .preprocess(emptyStringToUndefined, z.string().optional())
    .default("PRJ-"),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: optionalString,
  AUTH_MODE: z
    .enum(["LEGACY_SUPABASE", "DUAL_TRANSITION", "GOOGLE_WORKSPACE"])
    .default("LEGACY_SUPABASE"),
  AUTH_COOKIE_DOMAIN: optionalString,
  GOOGLE_WORKSPACE_ALLOWED_DOMAINS: optionalString,
  INTERNAL_SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(480),
  EXTERNAL_SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  OIDC_TRANSACTION_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  RECENT_AUTH_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  MAGIC_LINK_SECRET: optionalString,
  GOOGLE_DIRECTORY_SYNC_ENABLED: z.enum(["true", "false"]).default("false"),
  GOOGLE_ADMIN_EMAIL: optionalEmail,
  TOKEN_ENCRYPTION_KEY: optionalString,
  EMAIL_PROVIDER: z.preprocess(
    emptyStringToUndefined,
    z.enum(["resend", "smtp", "local"]).optional()
  ),
  RESEND_API_KEY: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPositiveInt,
  SMTP_SECURE: z.preprocess(
    emptyStringToUndefined,
    z.enum(["true", "false"]).optional()
  ),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_REPLY_TO: optionalString,
  LIBREOFFICE_PATH: optionalString,
})

const parsedServerEnv = serverEnvSchema.parse(process.env)

const supabasePublishableKey =
  parsedServerEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  parsedServerEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  parsedServerEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabasePublishableKey) {
  throw new Error(
    "A Supabase publishable key is required. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

export const env = {
  ...parsedServerEnv,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    parsedServerEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? supabasePublishableKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  SMTP_SECURE:
    typeof parsedServerEnv.SMTP_SECURE === "undefined"
      ? undefined
      : parsedServerEnv.SMTP_SECURE === "true",
  GOOGLE_WORKSPACE_ALLOWED_DOMAINS:
    parsedServerEnv.GOOGLE_WORKSPACE_ALLOWED_DOMAINS?.split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean) ?? [],
  GOOGLE_DIRECTORY_SYNC_ENABLED:
    parsedServerEnv.GOOGLE_DIRECTORY_SYNC_ENABLED === "true",
}

export const hasSupabaseServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
export const hasGoogleDriveServiceAccount = Boolean(
  env.GOOGLE_DRIVE_CLIENT_EMAIL && env.GOOGLE_DRIVE_PRIVATE_KEY
)

export type ServerEnv = typeof env
