import "server-only"
import { google } from "googleapis"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n")
}

export function createGoogleDriveClient() {
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
    scopes: ["https://www.googleapis.com/auth/drive"],
    subject: env.GOOGLE_DRIVE_IMPERSONATE_USER,
  })

  return google.drive({
    version: "v3",
    auth,
  })
}
