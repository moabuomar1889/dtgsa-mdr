import "server-only"
import { google } from "googleapis"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"

type CreateGoogleDriveClientOptions = {
  impersonateUser?: string | null
  scopes?: string[]
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n")
}

export function createGoogleDriveClient(
  options: CreateGoogleDriveClientOptions = {}
) {
  if (
    !hasGoogleDriveServiceAccount ||
    !env.GOOGLE_DRIVE_CLIENT_EMAIL ||
    !env.GOOGLE_DRIVE_PRIVATE_KEY
  ) {
    throw new Error(
      "Google Drive service-account credentials are required before creating the Drive client.",
    )
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_DRIVE_CLIENT_EMAIL,
    key: normalizePrivateKey(env.GOOGLE_DRIVE_PRIVATE_KEY),
    scopes: options.scopes ?? ["https://www.googleapis.com/auth/drive"],
    subject:
      typeof options.impersonateUser === "undefined"
        ? env.GOOGLE_DRIVE_IMPERSONATE_USER
        : options.impersonateUser || undefined,
  })

  return google.drive({
    version: "v3",
    auth,
  })
}
