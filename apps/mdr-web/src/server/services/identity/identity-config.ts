import "server-only"
import { assertAuthModeAllowed, type AuthMode } from "@dtg/identity-domain"
import { env } from "@/lib/config/env"

export function getIdentityConfig() {
  const localAcceptance =
    process.env.LOCAL_ACCEPTANCE_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  const authMode = assertAuthModeAllowed(
    env.AUTH_MODE as AuthMode,
    process.env.NODE_ENV
  )
  if (localAcceptance !== (authMode === "LOCAL_ACCEPTANCE_IDENTITY")) {
    throw new Error(
      "LOCAL_ACCEPTANCE_MODE and AUTH_MODE must select the same identity boundary."
    )
  }
  const googleEnabled = authMode === "GOOGLE_WORKSPACE"

  if (googleEnabled) {
    if (
      !env.GOOGLE_CLIENT_ID ||
      !env.GOOGLE_CLIENT_SECRET ||
      !env.GOOGLE_REDIRECT_URI
    ) {
      throw new Error(
        "Google Workspace authentication requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
      )
    }
    if (env.GOOGLE_WORKSPACE_ALLOWED_DOMAINS.length === 0) {
      throw new Error(
        "Google Workspace authentication requires at least one allowed Workspace domain."
      )
    }
  }

  return {
    authMode,
    authCookieDomain: env.AUTH_COOKIE_DOMAIN,
    googleEnabled,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    allowedDomains: env.GOOGLE_WORKSPACE_ALLOWED_DOMAINS,
    internalSessionTtlMinutes: env.INTERNAL_SESSION_TTL_MINUTES,
    externalSessionTtlMinutes: env.EXTERNAL_SESSION_TTL_MINUTES,
    oidcTransactionTtlMinutes: env.OIDC_TRANSACTION_TTL_MINUTES,
    recentAuthWindowMinutes: env.RECENT_AUTH_WINDOW_MINUTES,
    magicLinkTtlMinutes: env.MAGIC_LINK_TTL_MINUTES,
    magicLinkSecret: env.MAGIC_LINK_SECRET ?? env.APP_ENCRYPTION_KEY,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    directorySyncEnabled: env.GOOGLE_DIRECTORY_SYNC_ENABLED,
  }
}
