import "server-only"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"
import { createGoogleDriveClient } from "@/lib/google/drive"

export type GoogleDriveCheckResult = {
  mode: "impersonated" | "direct"
  actorEmail: string | null
  sharedDriveVisible: boolean
  projectFolderVisible: boolean
  sharedDriveError: string | null
  projectFolderError: string | null
}

export type GoogleDriveIntegrationDiagnostic = {
  status: "ready" | "blocked" | "not_configured"
  summary: string
  checks: GoogleDriveCheckResult[]
}

function extractGoogleErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data
  ) {
    const payload = error.response.data as {
      error?:
        | { message?: string; error_description?: string }
        | string
        | undefined
    }

    if (typeof payload.error === "string") {
      return payload.error
    }

    if (payload.error?.message) {
      return payload.error.message
    }

    if (payload.error?.error_description) {
      return payload.error.error_description
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unknown Google Drive error."
}

async function runModeCheck(
  mode: "impersonated" | "direct",
  impersonateUser?: string | null
): Promise<GoogleDriveCheckResult> {
  const drive = createGoogleDriveClient({
    impersonateUser,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  })

  const result: GoogleDriveCheckResult = {
    mode,
    actorEmail: null,
    sharedDriveVisible: false,
    projectFolderVisible: false,
    sharedDriveError: null,
    projectFolderError: null,
  }

  try {
    const about = await drive.about.get({
      fields: "user(emailAddress)",
    })

    result.actorEmail = about.data.user?.emailAddress ?? null
  } catch (error) {
    const message = extractGoogleErrorMessage(error)
    result.sharedDriveError = message
    result.projectFolderError = message
    return result
  }

  try {
    await drive.drives.get({
      driveId: env.GOOGLE_DRIVE_SHARED_DRIVE_ID!,
    })
    result.sharedDriveVisible = true
  } catch (error) {
    result.sharedDriveError = extractGoogleErrorMessage(error)
  }

  try {
    await drive.files.get({
      fileId:
        env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ?? env.GOOGLE_DRIVE_ROOT_FOLDER_ID!,
      supportsAllDrives: true,
      fields: "id,name,driveId",
    })
    result.projectFolderVisible = true
  } catch (error) {
    result.projectFolderError = extractGoogleErrorMessage(error)
  }

  return result
}

export async function getGoogleDriveIntegrationDiagnostic(): Promise<GoogleDriveIntegrationDiagnostic> {
  if (
    !hasGoogleDriveServiceAccount ||
    !env.GOOGLE_DRIVE_SHARED_DRIVE_ID ||
    !(env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ?? env.GOOGLE_DRIVE_ROOT_FOLDER_ID)
  ) {
    return {
      status: "not_configured",
      summary:
        "Google Drive integration still needs the service-account credentials, Shared Drive ID, and Projects folder ID.",
      checks: [],
    }
  }

  const checks: GoogleDriveCheckResult[] = []

  if (env.GOOGLE_DRIVE_IMPERSONATE_USER) {
    checks.push(
      await runModeCheck("impersonated", env.GOOGLE_DRIVE_IMPERSONATE_USER)
    )
  }

  checks.push(await runModeCheck("direct", null))

  const anyReady = checks.some(
    (check) => check.sharedDriveVisible && check.projectFolderVisible
  )

  if (anyReady) {
    return {
      status: "ready",
      summary:
        "Google Drive connectivity is working for at least one configured access mode.",
      checks,
    }
  }

  const impersonated = checks.find((check) => check.mode === "impersonated")
  const direct = checks.find((check) => check.mode === "direct")

  if (
    impersonated &&
    (impersonated.sharedDriveError?.includes("unauthorized_client") ||
      impersonated.projectFolderError?.includes("unauthorized_client"))
  ) {
    return {
      status: "blocked",
      summary:
        "Impersonation is configured, but Google Workspace has not authorized this service account for domain-wide delegation on the requested Drive scope.",
      checks,
    }
  }

  if (
    direct &&
    (direct.sharedDriveError?.includes("not found") ||
      direct.projectFolderError?.includes("not found") ||
      direct.sharedDriveError?.includes("Shared drive not found") ||
      direct.projectFolderError?.includes("File not found"))
  ) {
    return {
      status: "blocked",
      summary:
        "The service account can reach Google Drive, but it cannot see the configured Shared Drive or Projects folder. That usually means the service account is not a member, the folder was not shared with it, or one of the IDs is wrong.",
      checks,
    }
  }

  return {
    status: "blocked",
    summary:
      "Google Drive integration is configured but still failing. Review the per-mode errors for the exact cause.",
    checks,
  }
}
