export const OPERATIONAL_STATUS = {
  healthy: "healthy",
  ready: "ready",
  notReady: "not_ready",
} as const

export type ApplicationName =
  | "mdr-web"
  | "approve-web"
  | "verify-web"
  | "platform-api"
  | "worker"

export type BuildMetadata = {
  application: ApplicationName
  version: string
  gitCommitSha: string
  buildTime: string
  environment: string
}

export type HealthResponse = {
  status: typeof OPERATIONAL_STATUS.healthy
  application: ApplicationName
  timestamp: string
}

export type ReadinessResponse = {
  status:
    | typeof OPERATIONAL_STATUS.ready
    | typeof OPERATIONAL_STATUS.notReady
  application: ApplicationName
  checks: Record<string, boolean>
  timestamp: string
}

export function createHealthResponse(
  application: ApplicationName
): HealthResponse {
  return {
    status: OPERATIONAL_STATUS.healthy,
    application,
    timestamp: new Date().toISOString(),
  }
}

export function createReadinessResponse(
  application: ApplicationName,
  checks: Record<string, boolean> = { configuration: true }
): ReadinessResponse {
  return {
    status: Object.values(checks).every(Boolean)
      ? OPERATIONAL_STATUS.ready
      : OPERATIONAL_STATUS.notReady,
    application,
    checks,
    timestamp: new Date().toISOString(),
  }
}
